import { sqliteTable, text, integer, real, primaryKey, unique, index } from 'drizzle-orm/sqlite-core';

// ============================================================================
// AUTH TABLES
// ============================================================================

export const user = sqliteTable('user', {
    id: text('id').primaryKey(),
    age: integer('age'),
    username: text('username').notNull().unique(),
    passwordHash: text('password_hash').notNull()
});

export const session = sqliteTable("session", {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => user.id),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull()
});

// ============================================================================
// WORKSPACE & MULTI-TENANCY TABLES
// ============================================================================

export const workspace = sqliteTable('workspace', {
    id: text('id').primaryKey(),
    ownerUserId: text('owner_user_id').notNull().references(() => user.id),
    name: text('name').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
}, (table) => ({
    ownerUserIdIdx: index('workspace_owner_user_id_idx').on(table.ownerUserId)
}));

export const workspaceMember = sqliteTable('workspace_member', {
    workspaceId: text('workspace_id').notNull().references(() => workspace.id),
    userId: text('user_id').notNull().references(() => user.id),
    role: text('role', { enum: ['owner', 'member'] }).notNull().default('member'),
    joinedAt: integer('joined_at', { mode: 'timestamp' }).notNull()
}, (table) => ({
    pk: primaryKey({ columns: [table.workspaceId, table.userId] }),
    workspaceIdIdx: index('workspace_member_workspace_id_idx').on(table.workspaceId),
    userIdIdx: index('workspace_member_user_id_idx').on(table.userId)
}));

// ============================================================================
// CATEGORY & TAG TABLES
// ============================================================================

export const category = sqliteTable('category', {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id').notNull().references(() => workspace.id),
    name: text('name').notNull(),
    color: text('color'),
    icon: text('icon'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    deletedAt: integer('deleted_at', { mode: 'timestamp' })
}, (table) => ({
    workspaceIdDeletedAtIdx: index('category_workspace_id_deleted_at_idx').on(table.workspaceId, table.deletedAt),
    uniqueWorkspaceName: unique('category_unique_workspace_name').on(table.workspaceId, table.name)
}));

export const tag = sqliteTable('tag', {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id').notNull().references(() => workspace.id),
    name: text('name').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    deletedAt: integer('deleted_at', { mode: 'timestamp' })
}, (table) => ({
    workspaceIdDeletedAtIdx: index('tag_workspace_id_deleted_at_idx').on(table.workspaceId, table.deletedAt),
    uniqueWorkspaceName: unique('tag_unique_workspace_name').on(table.workspaceId, table.name)
}));

// ============================================================================
// BANK ACCOUNT & SYNC TABLES
// ============================================================================

export const bankAccount = sqliteTable('bank_account', {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id').notNull().references(() => workspace.id),
    bankSource: text('bank_source', { enum: ['mono', 'privat'] }).notNull(),
    bankAccountId: text('bank_account_id').notNull(),
    accountMask: text('account_mask'),
    accountType: text('account_type'),
    currency: text('currency').notNull().default('UAH'),
    connectedAt: integer('connected_at', { mode: 'timestamp' }).notNull(),
    lastSyncAt: integer('last_sync_at', { mode: 'timestamp' }),
    isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
    deletedAt: integer('deleted_at', { mode: 'timestamp' })
}, (table) => ({
    workspaceIdBankSourceIdx: index('bank_account_workspace_id_bank_source_idx').on(table.workspaceId, table.bankSource),
    bankAccountIdIdx: index('bank_account_bank_account_id_idx').on(table.bankAccountId),
    lastSyncAtIdx: index('bank_account_last_sync_at_idx').on(table.bankAccountId, table.lastSyncAt)
}));

export const syncLog = sqliteTable('sync_log', {
    id: text('id').primaryKey(),
    bankAccountId: text('bank_account_id').notNull().references(() => bankAccount.id),
    syncStartedAt: integer('sync_started_at', { mode: 'timestamp' }).notNull(),
    syncCompletedAt: integer('sync_completed_at', { mode: 'timestamp' }),
    transactionsSynced: integer('transactions_synced').default(0).notNull(),
    status: text('status', { enum: ['pending', 'success', 'failed'] }).notNull().default('pending'),
    errorMessage: text('error_message'),
    nextSyncAfter: integer('next_sync_after', { mode: 'timestamp' })
}, (table) => ({
    bankAccountIdIdx: index('sync_log_bank_account_id_idx').on(table.bankAccountId),
    syncStartedAtIdx: index('sync_log_sync_started_at_idx').on(table.syncStartedAt)
}));

// ============================================================================
// TRANSACTION TABLES
// ============================================================================

export const transaction = sqliteTable('transaction', {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id').notNull().references(() => workspace.id),
    userId: text('user_id').notNull().references(() => user.id),
    type: text('type', { enum: ['manual', 'mono', 'privat'] }).notNull(),
    
    // Transaction core fields
    description: text('description').notNull(),
    amount: integer('amount').notNull(), // in cents
    currencyCode: integer('currency_code').default(980).notNull(), // 980 = UAH (ISO 4217)
    transactionDate: integer('transaction_date', { mode: 'timestamp' }).notNull(),
    
    // Bank sync fields
    bankAccountId: text('bank_account_id').references(() => bankAccount.id),
    bankTransactionId: text('bank_transaction_id'), // external transaction ID for deduplication
    bankSource: text('bank_source', { enum: ['mono', 'privat'] }),
    syncTimestamp: integer('sync_timestamp', { mode: 'timestamp' }),
    
    // Bank-specific fields from Mono/Privat API
    mcc: integer('mcc'), // Merchant Category Code (current)
    originalMcc: integer('original_mcc'), // Original MCC from payment network
    hold: integer('hold', { mode: 'boolean' }).default(false),
    commissionRate: real('commission_rate'),
    cashbackAmount: integer('cashback_amount'),
    balance: integer('balance'),
    operationAmount: integer('operation_amount'),
    
    // Optional fields
    receiptId: text('receipt_id'),
    invoiceId: text('invoice_id'),
    counterEdrpou: text('counter_edrpou'),
    counterIban: text('counter_iban'),
    counterName: text('counter_name'),
    comment: text('comment'),
    
    // Audit fields
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
    deletedAt: integer('deleted_at', { mode: 'timestamp' })
}, (table) => ({
    workspaceIdDeletedAtTransactionDateIdx: index('transaction_workspace_id_deleted_at_transaction_date_idx').on(table.workspaceId, table.deletedAt, table.transactionDate),
    bankTransactionIdIdx: index('transaction_bank_transaction_id_idx').on(table.bankTransactionId),
    bankAccountIdIdx: index('transaction_bank_account_id_idx').on(table.bankAccountId),
    userIdIdx: index('transaction_user_id_idx').on(table.userId),
    originalMccIdx: index('transaction_original_mcc_idx').on(table.originalMcc)
}));

// ============================================================================
// TRANSACTION RELATION TABLES (MANY-TO-MANY)
// ============================================================================

export const transactionCategory = sqliteTable('transaction_category', {
    transactionId: text('transaction_id').notNull().references(() => transaction.id),
    categoryId: text('category_id').notNull().references(() => category.id),
    assignedAt: integer('assigned_at', { mode: 'timestamp' }).notNull()
}, (table) => ({
    pk: primaryKey({ columns: [table.transactionId] }),
    categoryIdIdx: index('transaction_category_category_id_idx').on(table.categoryId)
}));

export const transactionTag = sqliteTable('transaction_tag', {
    transactionId: text('transaction_id').notNull().references(() => transaction.id),
    tagId: text('tag_id').notNull().references(() => tag.id),
    assignedAt: integer('assigned_at', { mode: 'timestamp' }).notNull()
}, (table) => ({
    pk: primaryKey({ columns: [table.transactionId, table.tagId] }),
    tagIdIdx: index('transaction_tag_tag_id_idx').on(table.tagId)
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type User = typeof user.$inferSelect;
export type Session = typeof session.$inferSelect;

export type Workspace = typeof workspace.$inferSelect;
export type WorkspaceMember = typeof workspaceMember.$inferSelect;

export type Category = typeof category.$inferSelect;
export type Tag = typeof tag.$inferSelect;

export type BankAccount = typeof bankAccount.$inferSelect;
export type SyncLog = typeof syncLog.$inferSelect;

export type Transaction = typeof transaction.$inferSelect;
export type TransactionCategory = typeof transactionCategory.$inferSelect;
export type TransactionTag = typeof transactionTag.$inferSelect;
