# Architecture Overview

Simple Budget v3 is built with modern web technologies focusing on type safety, performance, and developer experience.

## Tech Stack

### Frontend
- **Svelte 5**: Reactive UI framework with runes
- **SvelteKit**: Full-stack framework for Svelte
- **TypeScript**: Static type checking
- **Tailwind CSS**: Utility-first CSS framework
- **Bits UI**: Accessible component primitives
- **Lucide Icons**: Icon library

### Backend
- **SvelteKit Server**: API routes and server-side rendering
- **SQLite**: Local database with better-sqlite3
- **Drizzle ORM**: Type-safe database operations
- **Lucia Auth**: Session-based authentication
- **Valibot**: Schema validation

### Development Tools
- **Vite**: Build tool and dev server
- **Vitest**: Unit testing
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Paraglide**: Internationalization

## Application Structure

```
src/
├── app.css                 # Global styles
├── app.d.ts               # TypeScript declarations
├── app.html               # HTML template
├── hooks.server.ts        # Server hooks (auth, i18n)
├── hooks.ts               # Client hooks
├── lib/
│   ├── components/        # UI components
│   │   ├── ui/           # ShadCN-style components
│   │   └── client/       # Client-side components
│   ├── hooks/            # Custom hooks
│   ├── i18n.ts           # Internationalization setup
│   ├── paraglide/        # Generated i18n files
│   ├── remotes/          # Server actions/forms
│   ├── server/           # Server utilities
│   │   ├── auth.ts       # Authentication logic
│   │   └── db/           # Database setup
│   └── utils.ts          # Utility functions
├── routes/                # SvelteKit routes
│   ├── +layout.svelte    # Root layout
│   ├── +page.svelte      # Home page
│   ├── login/            # Authentication
│   └── demo/             # Demo pages
└── static/               # Static assets
```

## Database Schema

The application uses a multi-tenant architecture with workspace-scoped data:

### Core Tables
- `user`: User accounts
- `session`: Authentication sessions
- `workspace`: Multi-tenant workspaces
- `workspace_member`: Workspace membership

### Finance Tables
- `category`: Transaction categories
- `tag`: Transaction tags
- `transaction`: Financial transactions
- `transaction_category`: Many-to-many transaction-category relations
- `transaction_tag`: Many-to-many transaction-tag relations

### Bank Integration Tables
- `bank_account`: Connected bank accounts
- `sync_log`: Bank sync operation logs

## Authentication Flow

1. **Registration/Login**: User submits credentials via form
2. **Validation**: Server validates input using Valibot schemas
3. **Password Hashing**: Argon2 for secure password storage
4. **Session Creation**: Generate session token and store in database
5. **Cookie Setting**: Set httpOnly cookie with session token
6. **Middleware**: Server hooks validate session on each request

## Data Flow

### Server Actions (Remote Functions)
- Form submissions handled by server actions
- Validation using Valibot schemas
- Database operations with Drizzle ORM
- Automatic query invalidation for reactive updates

### Queries
- Server-side data fetching for initial loads
- Client-side cache management
- Optimistic updates for better UX

## Internationalization

- **Paraglide**: Compile-time i18n solution
- **Language Detection**: URL-based language switching
- **Message Files**: JSON files for translations (en.json, uk.json)
- **Type Safety**: Generated types for translation keys

## Development Workflow

### Database
- **Migrations**: Drizzle handles schema changes
- **Seeding**: Development data setup
- **Studio**: Visual database browser

### Testing
- **Unit Tests**: Vitest for component and utility testing
- **Integration Tests**: Playwright for E2E testing
- **Type Checking**: Svelte compiler for type validation

### Deployment
- **Adapter**: SvelteKit adapter for target platform
- **Build**: Optimized production build with Vite
- **Static Assets**: Served from CDN or static hosting

## Security Considerations

- **CSRF Protection**: SvelteKit's built-in CSRF protection
- **XSS Prevention**: Svelte's automatic escaping
- **Session Security**: HttpOnly cookies, secure session tokens
- **Input Validation**: Server-side validation with Valibot
- **SQL Injection**: Prevented by Drizzle's parameterized queries

## Performance Optimizations

- **Server-Side Rendering**: Initial page loads
- **Code Splitting**: Route-based chunking
- **Image Optimization**: Vite's asset handling
- **Database Indexing**: Optimized queries with indexes
- **Caching**: Query result caching where appropriate</content>
<parameter name="filePath">/Users/softermii-user/Desktop/repoes/simple-budget-v3/docs/architecture.md