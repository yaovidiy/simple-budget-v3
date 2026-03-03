# Categories Feature

## Overview

The Categories feature allows users to create, update, delete, and assign categories to transactions within a workspace. Categories help organize and classify transactions for better budget management. Each workspace maintains its own set of categories, and each transaction can be linked to one category.

## Core Concepts

- **Category CRUD**: Create, read, update, and soft-delete categories scoped to a workspace.
- **Transaction Association**: Assign or remove a category for a transaction (one category per transaction).
- **Soft-Delete**: Categories are never permanently deleted; instead, a `deletedAt` timestamp is set and filtered out from all queries.
- **Unique Constraint**: Category names must be unique within a workspace.

## API & Remote Functions

### Queries
- `listCategories(workspaceId)`: List all active categories in a workspace.
- `getCategoryCount(workspaceId)`: Get the count of active categories in a workspace.
- `getCategory(categoryId)`: Get details for a single category.
- `getCategoryForTransaction(transactionId)`: Get the category assigned to a transaction.

### Mutations
- `createCategory({ workspaceId, name, color?, icon? })`: Create a new category.
- `updateCategory({ categoryId, name?, color?, icon? })`: Update category fields.
- `deleteCategory(categoryId)`: Soft-delete a category and remove all transaction links.
- `assignCategoryToTransaction({ transactionId, categoryId })`: Assign a category to a transaction.
- `removeCategoryFromTransaction(transactionId)`: Remove category assignment from a transaction.

## Frontend Integration

- The `[workspaceId]` page displays the number of active categories and provides a dialog to add new categories.
- The `CreateCategoryDialog` component uses ShadCN UI and remote form logic for validation and submission.
- All category operations are reflected in real-time using SvelteKit's async boundaries and remote function refreshes.

## Testing

Unit tests for the CategoryService cover:
- Category creation, update, read, and soft-delete logic
- Unique constraint error handling
- Transaction-category assignment and removal
- Workspace-scoped listing and counting
- Edge cases (nulls, soft-deleted, empty results)

See [tests/services/category.service.test.ts](../tests/services/category.service.test.ts) for full coverage details.

## Example Usage

```ts
// Create a category
await createCategory({ workspaceId, name: 'Groceries', color: '#FF5733', icon: 'shopping-cart' });

// Assign category to transaction
await assignCategoryToTransaction({ transactionId, categoryId });

// List categories
const categories = await listCategories(workspaceId);

// Get category count
const { count } = await getCategoryCount(workspaceId);
```

## Schema Reference

- `category`: id, workspaceId, name, color, icon, createdAt, deletedAt
- `transactionCategory`: transactionId, categoryId, assignedAt

## Error Handling

- Duplicate category names return a 409 error.
- All operations require workspace membership.
- Soft-deleted categories are excluded from all queries.
