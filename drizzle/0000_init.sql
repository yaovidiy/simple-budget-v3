CREATE TABLE `bank_account` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`bank_source` text NOT NULL,
	`bank_account_id` text NOT NULL,
	`account_mask` text,
	`account_type` text,
	`currency` text DEFAULT 'UAH' NOT NULL,
	`connected_at` integer NOT NULL,
	`last_sync_at` integer,
	`is_active` integer DEFAULT true NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `category` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`name` text NOT NULL,
	`color` text,
	`icon` text,
	`created_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sync_log` (
	`id` text PRIMARY KEY NOT NULL,
	`bank_account_id` text NOT NULL,
	`sync_started_at` integer NOT NULL,
	`sync_completed_at` integer,
	`transactions_synced` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`error_message` text,
	`next_sync_after` integer,
	FOREIGN KEY (`bank_account_id`) REFERENCES `bank_account`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `tag` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `transaction` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`description` text NOT NULL,
	`amount` integer NOT NULL,
	`currency_code` integer DEFAULT 980 NOT NULL,
	`transaction_date` integer NOT NULL,
	`bank_account_id` text,
	`bank_transaction_id` text,
	`bank_source` text,
	`sync_timestamp` integer,
	`mcc` integer,
	`original_mcc` integer,
	`hold` integer DEFAULT false,
	`commission_rate` real,
	`cashback_amount` integer,
	`balance` integer,
	`operation_amount` integer,
	`receipt_id` text,
	`invoice_id` text,
	`counter_edrpou` text,
	`counter_iban` text,
	`counter_name` text,
	`comment` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`bank_account_id`) REFERENCES `bank_account`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `transaction_category` (
	`transaction_id` text PRIMARY KEY NOT NULL,
	`category_id` text NOT NULL,
	`assigned_at` integer NOT NULL,
	FOREIGN KEY (`transaction_id`) REFERENCES `transaction`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `transaction_tag` (
	`transaction_id` text NOT NULL,
	`tag_id` text NOT NULL,
	`assigned_at` integer NOT NULL,
	PRIMARY KEY(`tag_id`, `transaction_id`),
	FOREIGN KEY (`transaction_id`) REFERENCES `transaction`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tag_id`) REFERENCES `tag`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`age` integer,
	`username` text NOT NULL,
	`password_hash` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `workspace` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`owner_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `workspace_member` (
	`workspace_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`joined_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `workspace_id`),
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `bank_account_workspace_id_bank_source_idx` ON `bank_account` (`workspace_id`,`bank_source`);--> statement-breakpoint
CREATE INDEX `bank_account_bank_account_id_idx` ON `bank_account` (`bank_account_id`);--> statement-breakpoint
CREATE INDEX `bank_account_last_sync_at_idx` ON `bank_account` (`bank_account_id`,`last_sync_at`);--> statement-breakpoint
CREATE INDEX `category_workspace_id_deleted_at_idx` ON `category` (`workspace_id`,`deleted_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `category_unique_workspace_name` ON `category` (`workspace_id`,`name`);--> statement-breakpoint
CREATE INDEX `sync_log_bank_account_id_idx` ON `sync_log` (`bank_account_id`);--> statement-breakpoint
CREATE INDEX `sync_log_sync_started_at_idx` ON `sync_log` (`sync_started_at`);--> statement-breakpoint
CREATE INDEX `tag_workspace_id_deleted_at_idx` ON `tag` (`workspace_id`,`deleted_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `tag_unique_workspace_name` ON `tag` (`workspace_id`,`name`);--> statement-breakpoint
CREATE INDEX `transaction_workspace_id_deleted_at_transaction_date_idx` ON `transaction` (`workspace_id`,`deleted_at`,`transaction_date`);--> statement-breakpoint
CREATE INDEX `transaction_bank_transaction_id_idx` ON `transaction` (`bank_transaction_id`);--> statement-breakpoint
CREATE INDEX `transaction_bank_account_id_idx` ON `transaction` (`bank_account_id`);--> statement-breakpoint
CREATE INDEX `transaction_user_id_idx` ON `transaction` (`user_id`);--> statement-breakpoint
CREATE INDEX `transaction_original_mcc_idx` ON `transaction` (`original_mcc`);--> statement-breakpoint
CREATE INDEX `transaction_category_category_id_idx` ON `transaction_category` (`category_id`);--> statement-breakpoint
CREATE INDEX `transaction_tag_tag_id_idx` ON `transaction_tag` (`tag_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_username_unique` ON `user` (`username`);--> statement-breakpoint
CREATE INDEX `workspace_owner_user_id_idx` ON `workspace` (`owner_user_id`);--> statement-breakpoint
CREATE INDEX `workspace_member_workspace_id_idx` ON `workspace_member` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `workspace_member_user_id_idx` ON `workspace_member` (`user_id`);