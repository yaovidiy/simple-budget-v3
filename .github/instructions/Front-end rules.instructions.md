---
name: Frontend Rules
description: Coding standards for Svelte 5 Components
applyTo: '**/*.svelte'
---

## Svelte

You **MUST** use the Svelte 5 API unless explicitly tasked to write Svelte 4 syntax. If you don't know about the API yet, below is the most important information about it. Other syntax not explicitly listed like `{#if ...}` blocks stay the same, so you can reuse your Svelte 4 knowledge for these.

- to mark something a state you use the `$state` rune, e.g. instead of `let count = 0` you do `let count = $state(0)`
- to mark something as a derivation you use the `$derived` rune, e.g. instead of `$: double = count * 2` you do `const double = $derived(count * 2)`
- to create a side effect you use the `$effect` rune, e.g. instead of `$: console.log(double)`you do`$effect(() => console.log(double))`
- to create component props you use the `$props` rune, e.g. instead of `export let foo = true; export let bar;` you do `let { foo = true, bar } = $props();`
- when listening to dom events do not use colons as part of the event name anymore, e.g. instead of `<button on:click={...} />` you do `<button onclick={...} />`

### What are runes?

- Runes are built-in Svelte keywords (prefixed with `$`) that control the compiler. For example, you write `let message = $state('hello');` in a `.svelte` file.
- Do **NOT** treat runes like regular functions or import them; instead, use them as language keywords.  
  _In Svelte 4, this syntax did not exist—you relied on reactive declarations and stores; now runes are an integral part of the language._

### $state

- `$state` creates reactive variables that update the UI automatically. For example:
  ```svelte
  <script>
  	let count = $state(0);
  </script>

  <button onclick={() => count++}>Clicked: {count}</button>
  ```
- Do **NOT** complicate state management by wrapping it in custom objects; instead, update reactive variables directly.  
  _In Svelte 4, you created state with let, e.g. `let count = 0;`, now use the $state rune, e.g. `let count = $state(0);`._
- Arrays and objects become deeply reactive proxies. For example:
  ```js
  let todos = $state([{ done: false, text: 'add more todos' }]);
  todos[0].done = !todos[0].done;
  ```
- Do **NOT** destructure reactive proxies (e.g., `let { done } = todos[0];`), as this breaks reactivity; instead, access properties directly.
- Use `$state` in class fields for reactive properties. For example:
  ```js
  class Todo {
  	done = $state(false);
  	text = $state('');
  	reset = () => {
  		this.text = '';
  		this.done = false;
  	};
  }
  ```

### $state.raw

- `$state.raw` creates shallow state where mutations are not tracked. For example:

```js
let person = $state.raw({ name: 'Heraclitus', age: 49 });
// Instead of mutating:
// person.age += 1;  // NO effect
person = { name: 'Heraclitus', age: 50 }; // Correct way to update
```

- Do **NOT** attempt to mutate properties on raw state; instead, reassign the entire object to trigger updates.

<SYSTEM>This is the abridged developer documentation for Svelte and SvelteKit (condensed).</SYSTEM>

# Svelte — key rules (Svelte 5)

You **MUST** use the Svelte 5 API unless explicitly instructed otherwise. This file highlights essential runes and patterns; keep exact identifiers and examples unchanged where marked `MUST` or `Do NOT`.

- Event attributes: use DOM names (e.g. `onclick`) — do **NOT** use `on:click`.

## Runes (concise)

- `$state`: reactive values. Example:

```svelte
<script>
	let count = $state(0);
</script>
<button onclick={() => count++}>Clicked: {count}</button>
```

Do NOT destructure reactive proxies; update them directly. Use `$state.raw` for shallow state and reassign whole objects when needed. Use `$state.snapshot(x)` only when a plain object is required externally.

- `$derived`: pure computed values. Single-line: `let doubled = $derived(count * 2);`. For complex logic use `$derived.by(() => { ... })` and keep derived expressions free of side effects.

- `$effect`: for side effects and cleanup. `$effect.pre` runs before DOM updates; `$effect.root` creates isolated scopes. `$effect.tracking()` is for debugging only.

- `$props`: component inputs: `let { foo = 'x' } = $props();`. Do NOT mutate props; use callbacks or bindable props. Use `$props.id()` for stable instance IDs.

- `$bindable`: opt-in two-way props; prefer one-way flow unless bi-directional binding is required.

- `$host`: use only within custom elements to access the host.

Keep examples minimal and exact where used in code.

## Snippets & render

- `{#snippet name(params)}` defines inline reusable markup; invoke with `{@render name(args)}`. Snippets are lexical and can be passed to components like slots. Use `Snippet` types for typing.

Compact example:

```svelte
{#snippet row(d)}<td>{d.name}</td><td>{d.qty}</td>{/snippet}
{@render row(item)}
```

## `<svelte:boundary>` (async & errors)

- Use `<svelte:boundary>` to contain async work and errors. Provide `pending` and `failed` snippets for loading and fallback UI. Errors bubble to the nearest boundary.

## Using `await`

- Allowed in top-level scripts, inside `$derived`, and markup. Requires `experimental.async: true` in `svelte.config.js` and usage inside a `<svelte:boundary>` with a `pending` snippet. The flag is experimental — follow project policy.

# SvelteKit — essentials

## Setup (minimal)

Scaffold with `npx sv create`. Keep dev dependencies only in `devDependencies`. Minimal `package.json` dev deps shown here:

```json
{
	"devDependencies": {
		"@sveltejs/adapter-auto": "^6.0.0",
		"@sveltejs/kit": "^2.0.0",
		"@sveltejs/vite-plugin-svelte": "^5.0.0",
		"svelte": "^5.0.0",
		"vite": "^6.0.0"
	}
}
```

Minimal `vite.config.js` / `svelte.config.js`:

```js
import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
export default defineConfig({ plugins: [sveltekit()] });

import adapter from '@sveltejs/adapter-auto';
export default { kit: { adapter: adapter() } };
```

Do NOT put these devDeps into `dependencies`.

## Routing (filesystem)

- `src/routes/.../+page.svelte` defines pages; dynamic segments use `[param]`. Do NOT use legacy non-`+` conventions.
- Use `+layout.svelte` for shared UI and `{@render children()}`.

## Data loading

- Use `+page.js` / `+layout.js` (universal) or `+page.server.js` / `+layout.server.js` (server-only) to export `load`. Server loads may access secrets, cookies, DB and must return serializable data.

Example (universal):

```js
export async function load({ fetch }) {
	const result = await fetch('/api/data').then(r => r.json());
	return { result };
}
```

Access in `+page.svelte`:

```svelte
<script>
	let { data } = $props();
</script>
{data.result}
```

## Fetch, headers, cookies

- Use the provided `fetch` in `load`. Use `setHeaders` to set response headers and `cookies.get()` / `cookies.set()` in server loads. Do NOT set `Set-Cookie` via `setHeaders`.

## Endpoints

- In `+server.js` export request handlers (`GET`, `POST`, etc.) returning `Response` or using Kit helpers.

```js
export const GET = () => new Response('ok');
```

## Types

- Use generated `./$types` types for `PageProps`, `LayoutLoad`, `RequestHandler`, etc.

# Best practices (condensed)

- Prefer one-way data flow; use `$bindable` sparingly.
- Do NOT import server-only modules into client code.
- Do NOT commit `.svelte-kit/`.
- Use layouts to avoid UI duplication.

---
Notes: this is a moderate condensation preserving required directives, identifiers, and representative examples. I removed duplicated explanations and long repeated samples to improve token efficiency. To continue, I will (1) finish applying this change (done), (2) estimate the new token count, and (3) present the savings and a further-aggressive draft if you want.

# UI rules

You **MUST** follow the UI design system and use SHADCN UI components where applicable. Do **NOT** create custom UI components that replicate existing SHADCN UI functionality; instead, extend or compose with SHADCN components as needed.

Use ShadCN.intructions.md for specific guidelines on how to implement and customize SHADCN UI components in your Svelte projects.
