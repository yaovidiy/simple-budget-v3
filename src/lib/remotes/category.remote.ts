import * as v from 'valibot';
import { error, redirect } from '@sveltejs/kit';
import { query, form, command, getRequestEvent } from '$app/server';
import { validateSessionToken, sessionCookieName } from '$lib/server/auth';
import { categoryService } from '$lib/server/service/category.service';
import { workspaceService } from '$lib/server/service/workspace.service';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get current user from session cookie
 */
async function getCurrentUser() {
	const event = getRequestEvent();
	if (!event) return null;

	const sessionToken = event.cookies.get(sessionCookieName);
	if (!sessionToken) return null;

	const { user } = await validateSessionToken(sessionToken);
	return user;
}

/**
 * Require authentication — redirects to /login if not authenticated
 */
async function requireUser() {
	const user = await getCurrentUser();
	if (!user) redirect(303, '/login');
	return user;
}

/**
 * Verify user is a member of a workspace
 */
async function verifyWorkspaceMember(workspaceId: string, userId: string) {
	const workspace = await workspaceService.read(workspaceId);
	if (!workspace) error(404, 'Workspace not found');

	const isMember = await workspaceService.isMember(workspaceId, userId);
	if (!isMember) error(403, 'You are not a member of this workspace');

	return workspace;
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const workspaceIdSchema = v.pipe(v.string(), v.nonEmpty('Workspace ID is required'));

const categoryIdSchema = v.pipe(v.string(), v.nonEmpty('Category ID is required'));

const transactionIdSchema = v.pipe(v.string(), v.nonEmpty('Transaction ID is required'));

const hexColorRegex = /^#[0-9a-fA-F]{6}$/;

const createCategorySchema = v.object({
	workspaceId: v.pipe(v.string(), v.nonEmpty('Workspace ID is required')),
	name: v.pipe(
		v.string(),
		v.nonEmpty('Category name is required'),
		v.maxLength(50, 'Category name must not exceed 50 characters')
	),
	color: v.optional(
		v.pipe(
			v.string(),
			v.check((val) => hexColorRegex.test(val), 'Color must be a valid hex code (e.g. #FF5733)')
		)
	),
	icon: v.optional(v.pipe(v.string(), v.maxLength(50, 'Icon must not exceed 50 characters')))
});

const updateCategorySchema = v.object({
	categoryId: v.pipe(v.string(), v.nonEmpty('Category ID is required')),
	name: v.optional(
		v.pipe(
			v.string(),
			v.nonEmpty('Category name is required'),
			v.maxLength(50, 'Category name must not exceed 50 characters')
		)
	),
	color: v.optional(
		v.pipe(
			v.string(),
			v.check((val) => hexColorRegex.test(val), 'Color must be a valid hex code (e.g. #FF5733)')
		)
	),
	icon: v.optional(v.pipe(v.string(), v.maxLength(50, 'Icon must not exceed 50 characters')))
});

const assignCategorySchema = v.object({
	transactionId: v.pipe(v.string(), v.nonEmpty('Transaction ID is required')),
	categoryId: v.pipe(v.string(), v.nonEmpty('Category ID is required'))
});

// ============================================================================
// REMOTE FUNCTIONS — QUERIES
// ============================================================================

/**
 * List all active categories in a workspace
 *
 * @param workspaceId - The workspace ID to list categories for
 * @returns Array of category objects with id, name, color, icon, createdAt
 * @throws 401 if not authenticated
 * @throws 403 if user is not a workspace member
 * @throws 404 if workspace not found
 */
export const listCategories = query(workspaceIdSchema, async (workspaceId) => {
	const user = await requireUser();
	await verifyWorkspaceMember(workspaceId, user.id);

	const categories = await categoryService.listByWorkspaceId(workspaceId);

	return categories.map(({ id, name, color, icon, createdAt }) => ({
		id,
		name,
		color,
		icon,
		createdAt
	}));
});

/**
 * Get the count of active categories in a workspace
 *
 * @param workspaceId - The workspace ID to count categories for
 * @returns Object with count property
 * @throws 401 if not authenticated
 * @throws 403 if user is not a workspace member
 * @throws 404 if workspace not found
 */
export const getCategoryCount = query(workspaceIdSchema, async (workspaceId) => {
	const user = await requireUser();
	await verifyWorkspaceMember(workspaceId, user.id);

	const count = await categoryService.countByWorkspaceId(workspaceId);

	return { count };
});

/**
 * Get a single category by ID
 *
 * @param categoryId - The category ID to retrieve
 * @returns Category object with id, name, color, icon, createdAt
 * @throws 401 if not authenticated
 * @throws 403 if user is not a workspace member
 * @throws 404 if category not found
 */
export const getCategory = query(categoryIdSchema, async (categoryId) => {
	const user = await requireUser();

	const cat = await categoryService.read(categoryId);
	if (!cat) error(404, 'Category not found');

	await verifyWorkspaceMember(cat.workspaceId, user.id);

	return {
		id: cat.id,
		name: cat.name,
		color: cat.color,
		icon: cat.icon,
		createdAt: cat.createdAt
	};
});

/**
 * Get the category assigned to a specific transaction
 *
 * @param transactionId - The transaction ID
 * @returns Assignment object with category details, or null if no category assigned
 * @throws 401 if not authenticated
 */
export const getCategoryForTransaction = query(transactionIdSchema, async (transactionId) => {
	await requireUser();

	return await categoryService.getCategoryForTransaction(transactionId);
});

// ============================================================================
// REMOTE FUNCTIONS — FORMS
// ============================================================================

/**
 * Create a new category in a workspace
 *
 * @param data - Object containing workspaceId, name, and optional color and icon
 * @returns Object with success flag and categoryId
 * @throws 401 if not authenticated
 * @throws 403 if user is not a workspace member
 * @throws 404 if workspace not found
 * @throws 409 if a category with the same name already exists in the workspace
 */
export const createCategory = form(
	createCategorySchema,
	async ({ workspaceId, name, color, icon }) => {
		const user = await requireUser();
		await verifyWorkspaceMember(workspaceId, user.id);

		try {
			const newCategory = await categoryService.create({
				workspaceId,
				name,
				color: color ?? null,
				icon: icon ?? null
			});

			// Refresh queries that depend on workspace categories
			await listCategories(workspaceId).refresh();
			await getCategoryCount(workspaceId).refresh();

			return { success: true, categoryId: newCategory.id };
		} catch (e) {
			if (e instanceof Error && e.message.includes('already exists')) {
				error(409, 'A category with this name already exists in this workspace');
			}
			throw e;
		}
	}
);

// ============================================================================
// REMOTE FUNCTIONS — COMMANDS
// ============================================================================

/**
 * Update a category's name, color, or icon
 *
 * @param data - Object containing categoryId and optional updated fields
 * @throws 401 if not authenticated
 * @throws 403 if user is not a workspace member
 * @throws 404 if category not found
 * @throws 409 if a category with the same name already exists in the workspace
 */
export const updateCategory = command(updateCategorySchema, async ({ categoryId, ...updates }) => {
	const user = await requireUser();

	const existing = await categoryService.read(categoryId);
	if (!existing) error(404, 'Category not found');

	await verifyWorkspaceMember(existing.workspaceId, user.id);

	try {
		await categoryService.update(categoryId, updates);
	} catch (e) {
		if (e instanceof Error && e.message.includes('already exists')) {
			error(409, 'A category with this name already exists in this workspace');
		}
		throw e;
	}

	// Refresh the list and the individual category cache
	await listCategories(existing.workspaceId).refresh();
	getCategory(categoryId).refresh();
});

/**
 * Soft-delete a category and remove all associated transaction links
 *
 * @param categoryId - The category ID to delete
 * @throws 401 if not authenticated
 * @throws 403 if user is not a workspace member
 * @throws 404 if category not found
 */
export const deleteCategory = command(categoryIdSchema, async (categoryId) => {
	const user = await requireUser();

	const existing = await categoryService.read(categoryId);
	if (!existing) error(404, 'Category not found');

	await verifyWorkspaceMember(existing.workspaceId, user.id);

	await categoryService.delete(categoryId);

	// Refresh queries that depend on workspace categories
	await listCategories(existing.workspaceId).refresh();
	await getCategoryCount(existing.workspaceId).refresh();
});

/**
 * Assign a category to a transaction (replaces any existing assignment)
 *
 * @param data - Object containing transactionId and categoryId
 * @throws 401 if not authenticated
 * @throws 403 if user is not a workspace member
 * @throws 404 if category not found
 */
export const assignCategoryToTransaction = command(
	assignCategorySchema,
	async ({ transactionId, categoryId }) => {
		const user = await requireUser();

		const cat = await categoryService.read(categoryId);
		if (!cat) error(404, 'Category not found');

		await verifyWorkspaceMember(cat.workspaceId, user.id);

		await categoryService.assignToTransaction({ transactionId, categoryId });

		// Refresh per-transaction category query
		getCategoryForTransaction(transactionId).refresh();
	}
);

/**
 * Remove a category assignment from a transaction
 *
 * @param transactionId - The transaction ID to remove the category from
 * @throws 401 if not authenticated
 */
export const removeCategoryFromTransaction = command(
	transactionIdSchema,
	async (transactionId) => {
		await requireUser();

		await categoryService.removeFromTransaction(transactionId);

		// Refresh per-transaction category query
		getCategoryForTransaction(transactionId).refresh();
	}
);
