# Development Setup

This guide will help you set up the development environment for Simple Budget v3.

## Prerequisites

- **Bun**: JavaScript runtime and package manager
- **Git**: Version control

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd simple-budget-v3
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Set up the database**
   ```bash
   bun run db:push
   ```

4. **Start the development server**
   ```bash
   bun --bun run dev
   ```

The application will be available at `http://localhost:5173`.

## Available Scripts

| Script | Description |
|--------|-------------|
| `bun --bun run dev` | Start development server |
| `bun --bun run build` | Build for production |
| `bun --bun run preview` | Preview production build |
| `bun --bun run check` | Type checking and linting |
| `bun --bun run test` | Run unit tests |
| `bun --bun run db:push` | Push database schema changes |
| `bun --bun run db:migrate` | Run database migrations |
| `bun --bun run db:studio` | Open Drizzle Studio |

## Environment Variables

The application uses SQLite for local development, so no additional environment variables are required for basic functionality.

For production deployment, you may need to configure:
- Database connection string
- Session secrets
- Bank API credentials (for sync features)

## Development Workflow

### Code Style
- **TypeScript**: Strict type checking enabled
- **ESLint**: Code linting with Svelte-specific rules
- **Prettier**: Automatic code formatting

### Testing
- **Vitest**: Unit testing framework
- **Playwright**: End-to-end testing (planned)

Run tests:
```bash
bun --bun run test
```

### Database Changes
When modifying the database schema in `src/lib/server/db/schema.ts`:

1. Update the schema file
2. Generate and apply migrations:
   ```bash
   bun --bun run db:push
   ```

### Internationalization
Translation files are located in `messages/`:
- `en.json`: English translations
- `uk.json`: Ukrainian translations

After updating translation files, the Paraglide compiler will automatically regenerate types.

## Project Structure

See the [Architecture Overview](architecture.md) for detailed information about the codebase structure.

## Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Run tests and linting: `bun --bun run check`
4. Submit a pull request

## Troubleshooting

### Common Issues

**Database connection errors**
- Ensure SQLite is properly installed
- Check file permissions for the database file

**Build errors**
- Clear node_modules and reinstall: `rm -rf node_modules && bun install`
- Check TypeScript errors: `bun --bun run check`

**Development server not starting**
- Check if port 5173 is available
- Try a different port: `bun --bun run dev -- --port 3000`

### Getting Help

- Check existing issues on GitHub
- Review the documentation in `docs/`
- Ask questions in the project discussions</content>
<parameter name="filePath">/Users/softermii-user/Desktop/repoes/simple-budget-v3/docs/setup.md