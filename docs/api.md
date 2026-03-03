# API Reference

This document describes the remote functions and server actions available in
Simple Budget v3.

## Authentication

### `register`

Register a new user account.

**Parameters:**

- `username` (string): Username (3-20 characters)
- `password` (string): Password (minimum 8 characters)
- `repeatPassword` (string): Password confirmation

**Returns:** Redirects to home page on success

**Throws:**

- Username already taken
- Password validation errors

### `login`

Authenticate an existing user.

**Parameters:**
- `username` (string): Username
- `password` (string): Password

**Returns:** Redirects to home page on success

**Throws:**
- Invalid username or password

## Workspaces

### `createWorkspace`

Create a new workspace.

**Parameters:**
- `name` (string): Workspace name

**Returns:**

```typescript
{
  success: true,
  workspaceId: string
}
```

**Throws:**
- 401: Not authenticated (redirects to login)

### `updateWorkspace`

Update an existing workspace name.

**Parameters:**
- `workspaceId` (string): Workspace ID
- `name` (string): New workspace name

**Returns:**

```typescript
{
  success: true
}
```

**Throws:**
- 401: Not authenticated
- 404: Workspace not found
- 403: Not the workspace owner

### `deleteWorkspace`

Delete a workspace (soft delete).

**Parameters:**
- `workspaceId` (string): Workspace ID

**Returns:**

```typescript
{
  success: true
}
```

**Throws:**
- 401: Not authenticated
- 404: Workspace not found
- 403: Not the workspace owner

### `listWorkspaces`

Query to list user's workspaces.

**Returns:** Array of workspace objects

```typescript
[{
  id: string,
  name: string,
  createdAt: Date,
  updatedAt: Date,
  ownerUserId: string
}]
```

## Categories

### `createCategory`

Create a new category in a workspace.

**Parameters:**
- `workspaceId` (string): Workspace ID
- `name` (string): Category name
- `color` (string, optional): Hex color code
- `icon` (string, optional): Icon identifier

### `updateCategory`

Update an existing category.

**Parameters:**
- `categoryId` (string): Category ID
- `name` (string, optional): New name
- `color` (string, optional): New color
- `icon` (string, optional): New icon

### `deleteCategory`

Soft delete a category.

**Parameters:**
- `categoryId` (string): Category ID

### `listCategories`

Query to list categories in a workspace.

**Parameters:**
- `workspaceId` (string): Workspace ID

**Returns:** Array of category objects

## Tags

### `createTag`

Create a new tag in a workspace.

**Parameters:**
- `workspaceId` (string): Workspace ID
- `name` (string): Tag name

### `updateTag`

Update an existing tag.

**Parameters:**
- `tagId` (string): Tag ID
- `name` (string): New name

### `deleteTag`

Soft delete a tag.

**Parameters:**
- `tagId` (string): Tag ID

### `listTags`

Query to list tags in a workspace.

**Parameters:**
- `workspaceId` (string): Workspace ID

## Transactions

### `createTransaction`

Create a new manual transaction.

**Parameters:**
- `workspaceId` (string): Workspace ID
- `description` (string): Transaction description
- `amount` (number): Amount in cents
- `currencyCode` (number, optional): ISO 4217 currency code
  (default: 980 for UAH)
- `transactionDate` (Date): Transaction date
- `categoryIds` (string[], optional): Array of category IDs
- `tagIds` (string[], optional): Array of tag IDs
- `comment` (string, optional): Additional comment

### `updateTransaction`

Update an existing transaction.

**Parameters:**
- `transactionId` (string): Transaction ID
- `description` (string, optional): New description
- `amount` (number, optional): New amount
- `transactionDate` (Date, optional): New date
- `categoryIds` (string[], optional): New category IDs
- `tagIds` (string[], optional): New tag IDs
- `comment` (string, optional): New comment

### `deleteTransaction`

Soft delete a transaction.

**Parameters:**
- `transactionId` (string): Transaction ID

### `listTransactions`

Query to list transactions in a workspace.

**Parameters:**
- `workspaceId` (string): Workspace ID
- `limit` (number, optional): Maximum number of results
- `offset` (number, optional): Pagination offset
- `startDate` (Date, optional): Filter from date
- `endDate` (Date, optional): Filter to date
- `categoryIds` (string[], optional): Filter by categories
- `tagIds` (string[], optional): Filter by tags

## Bank Accounts

### `connectBankAccount`

Connect a bank account for syncing.

**Parameters:**
- `workspaceId` (string): Workspace ID
- `bankSource` ('mono' | 'privat'): Bank provider
- `bankAccountId` (string): External bank account ID
- `accountMask` (string, optional): Masked account number
- `accountType` (string, optional): Account type
- `currency` (string, optional): Currency code (default: 'UAH')

### `syncBankAccount`

Trigger manual sync for a bank account.

**Parameters:**
- `bankAccountId` (string): Bank account ID

### `listBankAccounts`

Query to list bank accounts in a workspace.

**Parameters:**
- `workspaceId` (string): Workspace ID

### `listSyncLogs`

Query to list sync logs for a bank account.

**Parameters:**
- `bankAccountId` (string): Bank account ID</content>
<parameter name="filePath">/Users/softermii-user/Desktop/repoes/simple-budget-v3/docs/api.md