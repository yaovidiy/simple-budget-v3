import { db } from '$lib/server/db';
import { category, transactionCategory } from '$lib/server/db/schema';
import { eq, and, isNull, count } from 'drizzle-orm';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface CreateCategoryInput {
	workspaceId: string;
	name: string;
	color?: string | null;
	icon?: string | null;
}

export interface UpdateCategoryInput {
	name?: string;
	color?: string | null;
	icon?: string | null;
}

export interface AssignCategoryInput {
	transactionId: string;
	categoryId: string;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class CategoryService {
	/**
	 * Create a new category in a workspace
	 *
	 * @param input - Category creation data
	 * @returns The newly created category
	 * @throws Error if category name already exists in the workspace
	 */
	async create(input: CreateCategoryInput) {
		const id = crypto.randomUUID();
		const now = new Date();

		try {
			const [newCategory] = await db
				.insert(category)
				.values({
					id,
					workspaceId: input.workspaceId,
					name: input.name,
					color: input.color ?? null,
					icon: input.icon ?? null,
					createdAt: now,
					deletedAt: null
				})
				.returning();

			return newCategory;
		} catch (e) {
			// Handle unique constraint violation
			if (e instanceof Error && e.message.includes('UNIQUE constraint failed')) {
				throw new Error('Category with this name already exists in this workspace');
			}
			throw e;
		}
	}

	/**
	 * Get a category by ID (only if not soft-deleted)
	 *
	 * @param id - Category ID
	 * @returns The category or null if not found
	 */
	async read(id: string) {
		const result = await db
			.select()
			.from(category)
			.where(and(eq(category.id, id), isNull(category.deletedAt)))
			.get();

		return result || null;
	}

	/**
	 * Update a category's name, color, or icon
	 *
	 * @param id - Category ID
	 * @param input - Fields to update
	 * @returns The updated category or null if not found
	 * @throws Error if category name already exists in the workspace
	 */
	async update(id: string, input: UpdateCategoryInput) {
		try {
			const [updated] = await db
				.update(category)
				.set(input)
				.where(and(eq(category.id, id), isNull(category.deletedAt)))
				.returning();

			return updated || null;
		} catch (e) {
			// Handle unique constraint violation
			if (e instanceof Error && e.message.includes('UNIQUE constraint failed')) {
				throw new Error('Category with this name already exists in this workspace');
			}
			throw e;
		}
	}

	/**
	 * Soft-delete a category and remove all transaction assignments
	 *
	 * @param id - Category ID
	 */
	async delete(id: string) {
		const now = new Date();

		// Set deletedAt timestamp (soft-delete)
		await db
			.update(category)
			.set({ deletedAt: now })
			.where(and(eq(category.id, id), isNull(category.deletedAt)));

		// Clean up transaction-category associations
		await db.delete(transactionCategory).where(eq(transactionCategory.categoryId, id));
	}

	/**
	 * List all active categories for a workspace
	 *
	 * @param workspaceId - Workspace ID
	 * @returns Array of active categories
	 */
	async listByWorkspaceId(workspaceId: string) {
		return await db
			.select()
			.from(category)
			.where(and(eq(category.workspaceId, workspaceId), isNull(category.deletedAt)))
			.all();
	}

	/**
	 * Count active categories in a workspace
	 *
	 * @param workspaceId - Workspace ID
	 * @returns Number of active categories
	 */
	async countByWorkspaceId(workspaceId: string) {
		const result = await db
			.select({ count: count() })
			.from(category)
			.where(and(eq(category.workspaceId, workspaceId), isNull(category.deletedAt)))
			.get();

		return result?.count ?? 0;
	}

	/**
	 * Assign a category to a transaction (replaces existing assignment)
	 *
	 * @param input - Transaction and category IDs
	 * @returns The transaction-category assignment
	 */
	async assignToTransaction(input: AssignCategoryInput) {
		const now = new Date();

		const [result] = await db
			.insert(transactionCategory)
			.values({
				transactionId: input.transactionId,
				categoryId: input.categoryId,
				assignedAt: now
			})
			.onConflictDoUpdate({
				target: transactionCategory.transactionId,
				set: {
					categoryId: input.categoryId,
					assignedAt: now
				}
			})
			.returning();

		return result;
	}

	/**
	 * Remove category assignment from a transaction
	 *
	 * @param transactionId - Transaction ID
	 */
	async removeFromTransaction(transactionId: string) {
		await db
			.delete(transactionCategory)
			.where(eq(transactionCategory.transactionId, transactionId));
	}

	/**
	 * Get the category assigned to a transaction (including category details)
	 *
	 * @param transactionId - Transaction ID
	 * @returns Transaction-category assignment with category details or null
	 */
	async getCategoryForTransaction(transactionId: string) {
		const result = await db
			.select({
				transactionId: transactionCategory.transactionId,
				categoryId: transactionCategory.categoryId,
				assignedAt: transactionCategory.assignedAt,
				category: {
					id: category.id,
					name: category.name,
					color: category.color,
					icon: category.icon
				}
			})
			.from(transactionCategory)
			.innerJoin(category, eq(transactionCategory.categoryId, category.id))
			.where(eq(transactionCategory.transactionId, transactionId))
			.get();

		return result || null;
	}
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const categoryService = new CategoryService();
