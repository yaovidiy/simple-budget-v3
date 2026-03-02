---
name: Remote functions Rules
description: This file describes the use of remote functions in SvelteKit.
applyTo: **/*.remote.js, **/*.remote.ts
---


## Remote functions (experimental)

- **What they are**: Type-safe server-only functions you call from the client. They always execute on the server, so they can access server-only modules (env, DB).
- If you choose to use them you can replace load functions and form actions with them.
- Works best in combination with asynchronous Svelte, i.e. using `await` expressions in `$derived` and template
- **Opt-in**: Enable in `svelte.config.js`:

```js
export default {
	kit: {
		experimental: {
			remoteFunctions: true
		}
	}
};
```

- **Where and how**:
  - Place `.remote.js`/`.remote.ts` files in `src/lib` or `src/routes`.
  - Export functions using one of: `query`, `form`, `command`, `prerender` from `$app/server`.
  - Client imports become fetch-wrappers to generated HTTP endpoints.
  - Arguments/returns are serialized with devalue (supports Date, Map, custom transport).

### query: read dynamic data

Define:

```js
// src/routes/blog/data.remote.js
import { query } from '$app/server';
import * as db from '$lib/server/database';

export const getPosts = query(async () => {
	return db.posts();
});
```

Use in component (recommended with await):

```svelte
<script>
	import { getPosts } from './data.remote';
</script>

<ul>
	{#each await getPosts() as { title, slug }}
		<li><a href="/blog/{slug}">{title}</a></li>
	{/each}
</ul>
```

- **Args + validation**: Pass a Standard Schema (e.g. Valibot/Zod) as first param.

```js
import * as v from 'valibot';
export const getPost = query(v.string(), async (slug) => {
	/* ... */
});
```

- **Refresh/caching**: Calls are cached on page (`getPosts() === getPosts()`). Refresh via:

```svelte
<button onclick={() => getPosts().refresh()}>Check for new posts</button>
```

- Alternative props exist (`loading`, `error`, `current`) if you don’t use `await`.

### form: mutation via forms

Define:

```js
import { form } from '$app/server';
import * as db from '$lib/server/database';
import * as auth from '$lib/server/auth';
import { error, redirect } from '@sveltejs/kit';

export const createPost = form(async (data) => {
	const user = await auth.getUser();
	if (!user) error(401, 'Unauthorized');

	const title = data.get('title');
	const content = data.get('content');
	db.insertPost(title, content);

	redirect(303, `/blog/${title}`);
});
```

Use:

```svelte
<script>
	import { createPost } from '../data.remote';
</script>

<form {...createPost}>
	<input name="title" />
	<textarea name="content" />
	<button>Publish</button>
</form>
```

- **Progressive enhancement**: Works without JS via `method`/`action`; with JS it submits without full reload.
- **Single-flight mutations**:
  - Server-driven: call refresh inside the handler:

  ```js
  await getPosts().refresh();
  ```

  - Client-driven: customize with `enhance` and `submit().updates(...)`:

  ```svelte
  <form {...createPost.enhance(async ({ submit }) => {
  	await submit().updates(getPosts());
  })}>
  ```

  - Optimistic UI: use `withOverride`:

  ```js
  await submit().updates(getPosts().withOverride((posts) => [newPost, ...posts]));
  ```

- **Returns**: Instead of redirect, return data; read at `createPost.result`.
- **buttonProps**: For per-button `formaction`:

```svelte
<button>login</button>
<button {...register.buttonProps}>register</button>
```

### command: programmatic writes

Define:

```js
import { command, query } from '$app/server';
import * as v from 'valibot';
import * as db from '$lib/server/database';

export const getLikes = query(v.string(), async (id) => {
	return db.likes.get(id);
});

export const addLike = command(v.string(), async (id) => {
	await db.likes.add(id);
});
```

Use:

```svelte
<script>
	import { getLikes, addLike } from './likes.remote';
	let { item } = $props();
</script>

<button onclick={() => addLike(item.id)}>add like</button>
<p>likes: {await getLikes(item.id)}</p>
```

- **Update queries**:
  - In the command: `getLikes(id).refresh()`
  - From client: `await addLike(item.id).updates(getLikes(item.id))`
  - Optimistic: `updates(getLikes(item.id).withOverride((n) => n + 1))`
- **Note**: Cannot be called during render.

### prerender: build-time reads for static-ish data

Define:

```js
import { prerender } from '$app/server';
import * as db from '$lib/server/database';

export const getPosts = prerender(async () => {
	return db.sql`SELECT title, slug FROM post ORDER BY published_at DESC`;
});
```

- **Use anywhere** (including dynamic pages) to partially prerender data.
- **Args + validation**: Same schema approach as `query`.
- **Seed inputs**: Enumerate values for crawling during prerender:

```js
export const getPost = prerender(
	v.string(),
	async (slug) => {
		/* ... */
	},
	{
		inputs: () => ['first-post', 'second-post']
	}
);
```

- **Dynamic**: By default excluded from server bundle; set `{ dynamic: true }` if you must call with non-prerendered args.
- **Note**: If a page has `export const prerender = true` page option, you cannot use dynamic `query`s.

### Validation and security

- Use Standard Schema for `query`, `command`, `prerender` args to protect endpoints.
- Failures return 400; customize with `handleValidationError`:

```ts
// src/hooks.server.ts
export function handleValidationError() {
	return { message: 'Nice try, hacker!' };
}
```

- `form` doesn’t take a schema (you validate `FormData` yourself).

### getRequestEvent inside remote functions

- Access the current `RequestEvent`:

```ts
import { getRequestEvent, query } from '$app/server';

export const getProfile = query(async () => {
	const { cookies, locals } = getRequestEvent();
	// read cookies, reuse per-request work via locals, etc.
});
```

- Differences: no `params`/`route.id`, cannot set headers (except cookies, only in `form`/`command`), `url.pathname` is `/`.

### Redirects

- Allowed in `query`, `form`, `prerender` via `redirect(...)`.
- Not allowed in `command` (return `{ redirect }` and handle on client if absolutely necessary).

## Page options

#### prerender

- Set `export const prerender = true|false|'auto'` in page or layout modules; `true` generates static HTML, `false` skips, `'auto'` includes in SSR manifest.
- Applies to pages **and** `+server.js` routes (inherit parent flags); dynamic routes need `entries()` or `config.kit.prerender.entries` to tell the crawler which parameter values to use.
- Do NOT prerender pages that use form actions or rely on `url.searchParams` server‑side.

#### entries

- In a dynamic route’s `+page(.server).js` or `+server.js`, export `export function entries(): Array<Record<string,string>>` (can be async) to list parameter sets for prerendering.
- Overrides default crawling to ensure dynamic pages (e.g. `/blog/[slug]`) are generated.
- Do NOT forget to pair `entries()` with `export const prerender = true`.

### ssr

- `export const ssr = false` disables server-side rendering, sending only an HTML shell and turning the page into a client-only SPA.
- Use sparingly (e.g. when using browser‑only globals); do NOT set both `ssr` and `csr` to `false` or nothing will render.

#### csr

- `export const csr = false` prevents hydration, omits JS bundle, disables `<script>`s, form enhancements, client routing, and HMR.
- Ideal for purely static pages (e.g. marketing or blog posts); do NOT disable CSR on pages requiring interactivity.

## State management

- Avoid shared server variables—servers are stateless and shared across users. Authenticate via cookies and persist to a database instead of writing to in‑memory globals.
- Keep `load` functions pure: no side‑effects or global store writes. Return data from `load` and pass it via `data` or `page.data`.
- For shared client‑only state across components, use Svelte’s context API (`setContext`/`getContext`) or URL parameters for persistent filters; snapshots for ephemeral UI state tied to navigation history.

## Building your app

- Build runs in two phases: Vite compiles and prerenders (if enabled), then an adapter tailors output for your deployment target.
- Guard any code that should not execute at build time with `import { building } from '$app/environment'; if (!building) { … }`.
- Preview your production build locally with `npm run preview` (Node‑only, no adapter hooks).

## Adapters

- Adapters transform the built app into deployable assets for various platforms (Cloudflare, Netlify, Node, static, Vercel, plus community adapters).
- Configure in `svelte.config.js` under `kit.adapter = adapter(opts)`, importing the adapter module and passing its options.
- Some adapters expose a `platform` object (e.g. Cloudflare’s `env`); access it via `event.platform` in hooks and server routes.

## Single‑page apps

- Turn your app into a fully CSR SPA by setting `export const ssr = false;` in the root `+layout.js`.
- For static hosting, use `@sveltejs/adapter-static` with a `fallback` HTML (e.g. `200.html`) so client routing can handle unknown paths.
- You can still prerender select pages by enabling `prerender = true` and `ssr = true` in their individual `+page.js` or `+layout.js` modules.

## Advanced routing

- Rest parameters (`[...file]`) capture an unknown number of segments (e.g. `src/routes/hello/[...path]` catches all routes under `/hello`) and expose them as a single string; use a catch‑all route `+error.svelte` to render nested custom 404 pages.
- Optional parameters (`[[lang]]`) make a segment optional, e.g. for `[[lang]]/home` both `/home` and `/en/home` map to the same route; cannot follow a rest parameter.
- Matchers in `src/params/type.js` let you constrain `[param=type]` (e.g. only “apple” or “orange”), falling back to other routes or a 404 if the test fails.

### Advanced layouts

- Group directories `(app)` or `(marketing)` apply a shared layout without affecting URLs.
- Break out of the inherited layout chain per page with `+page@segment.svelte` (e.g. `+page@(app).svelte`) or per layout with `+layout@.svelte`.
- Use grouping judiciously: overuse can complicate nesting; sometimes simple composition or wrapper components suffice.