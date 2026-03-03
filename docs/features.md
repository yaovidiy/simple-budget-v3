# Features Overview

This document outlines the key features implemented in Simple Budget v3, a personal finance management application built with SvelteKit.

## Core Features

### 1. User Authentication
- **Login and Registration**: Users can create accounts and log in using username/password authentication.
- **Session Management**: Secure session-based authentication using Lucia Auth.
- **Protected Routes**: Server-side authentication checks ensure only authenticated users can access protected features.

### 2. Multi-Tenant Workspaces
- **Workspace Creation**: Users can create multiple isolated workspaces (e.g., "Personal Budget", "Business Expenses").
- **Workspace Ownership**: Each workspace is owned by a user and can have multiple members.
- **Workspace Members**: Support for adding team members to workspaces with role-based access (owner/member).

### 2a. Workspace Routing & Creation (Home Page)
- **Automatic Workspace Routing**: When a user visits the home page (`/`), the app checks for connected workspaces:
  - If the user has workspaces, they are redirected to the first workspace (`/[workspaceId]`).
  - If no workspaces exist, the user is prompted to create one using a dialog.
- **Create Workspace Dialog**: Uses ShadCN UI and remote functions for form submission. On success, user is redirected to the new workspace. On failure, a toast notification appears.
- **Toast Notifications**: Uses Sonner for error feedback (e.g., workspace creation failure).

### 3. Transaction Management
- **Manual Transactions**: Users can manually add income and expense transactions.
- **Transaction Details**: Comprehensive transaction data including:
  - Description, amount, currency (default UAH)
  - Transaction date
  - Optional comments and metadata
- **Transaction Categories**: Organize transactions with custom categories per workspace.
- **Transaction Tags**: Flexible tagging system for additional organization.

### 4. Bank Account Integration
- **Supported Banks**: Integration with Ukrainian banks:
  - Monobank (mono)
  - PrivatBank (privat)
- **Automatic Sync**: Sync transactions from connected bank accounts.
- **Sync Logs**: Track sync status, success/failure, and transaction counts.
- **Deduplication**: Prevents duplicate transactions using bank transaction IDs.

### 5. Data Organization
- **Categories**: Workspace-specific categories with optional color and icon.
- **Tags**: Workspace-specific tags for flexible transaction grouping.
- **Soft Deletes**: Categories, tags, and transactions support soft deletion.

### 6. Internationalization (i18n)
- **Multi-language Support**: English and Ukrainian translations.
- **Paraglide Integration**: Modern i18n solution for SvelteKit.

### 7. UI Components
- **ShadCN-style Components**: Consistent, accessible UI built with:
  - Tailwind CSS for styling
  - Bits UI for component primitives
  - Lucide icons
- **Responsive Design**: Mobile-friendly interface.

## Technical Architecture

### Database Schema
- **SQLite Database**: Local database using better-sqlite3.
- **Drizzle ORM**: Type-safe database operations.
- **Multi-tenant Design**: Workspace-scoped data isolation.

### Server-Side Features
- **Remote Functions**: Server actions for form handling and data mutations.
- **Validation**: Valibot schemas for input validation.
- **Error Handling**: Proper error responses and user feedback.

### Development Tools
- **TypeScript**: Full type safety throughout the application.
- **Vite**: Fast development server and build tool.
- **ESLint & Prettier**: Code quality and formatting.
- **Vitest**: Unit testing framework.

## Demo Features
- **Lucia Auth Demo**: Showcase authentication flows.
- **Paraglide i18n Demo**: Demonstrate internationalization features.

## Future Enhancements
While not yet implemented, the schema supports:
- Advanced reporting and analytics
- Budget planning and goals
- Receipt scanning and OCR
- Multi-currency support
- Export functionality