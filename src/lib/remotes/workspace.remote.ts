import * as v from 'valibot';
import { error, redirect } from '@sveltejs/kit';
import { query, form, command, getRequestEvent } from '$app/server';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { validateSessionToken, sessionCookieName } from '$lib/server/auth';
import { encodeHexLowerCase } from '@oslojs/encoding';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get current user from session cookie
 */
async function getCurrentUser() {
	const event = getRequestEvent();
	if (!event) {
		return null;
	}

	const sessionToken = event.cookies.get(sessionCookieName);
	if (!sessionToken) {
		return null;
	}

	const { user } = await validateSessionToken(sessionToken);
	return user;
}

/**
 * Verify user is the owner of a workspace
 */
async function verifyWorkspaceOwner(workspaceId: string, userId: string) {
	const [workspace] = await db
		.select()
		.from(table.workspace)
		.where(eq(table.workspace.id, workspaceId));

	if (!workspace) {
		error(404, 'Workspace not found');
	}

	if (workspace.ownerUserId !== userId) {
		error(403, 'Forbidden: You are not the owner of this workspace');
	}

	return workspace;
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const workspaceIdSchema = v.pipe(
	v.string(),
	v.nonEmpty('Workspace ID is required')
);

const createWorkspaceSchema = v.object({
	name: v.pipe(
		v.string(),
		v.nonEmpty('Workspace name is required'),
		v.maxLength(100, 'Workspace name must not exceed 100 characters')
	)
});

const updateWorkspaceSchema = v.object({
	workspaceId: v.pipe(
		v.string(),
		v.nonEmpty('Workspace ID is required')
	),
	name: v.pipe(
		v.string(),
		v.nonEmpty('Workspace name is required'),
		v.maxLength(100, 'Workspace name must not exceed 100 characters')
	)
});

// ============================================================================
// REMOTE FUNCTIONS - QUERIES
// ============================================================================

/**
 * List all workspaces owned by the current user
 *
 * @returns Array of workspaces with id, name, createdAt, updatedAt
 * @throws 401 if not authenticated
 */
export const listWorkspaces = query(async () => {
	const user = await getCurrentUser();

	if (!user) {
		redirect(303, '/login');
	}

	const workspaces = await db
		.select({
			id: table.workspace.id,
			name: table.workspace.name,
			createdAt: table.workspace.createdAt,
			updatedAt: table.workspace.updatedAt
		})
		.from(table.workspace)
		.where(eq(table.workspace.ownerUserId, user.id));

	return workspaces;
});

/**
 * Get a single workspace by ID
 *
 * @param workspaceId - The workspace ID to retrieve
 * @returns Workspace object with id, name, createdAt, updatedAt
 * @throws 401 if not authenticated
 * @throws 404 if workspace not found
 * @throws 403 if user is not the owner
 */
export const getWorkspace = query(workspaceIdSchema, async (workspaceId) => {
	const user = await getCurrentUser();

	if (!user) {
		redirect(303, '/login');
	}

	const workspace = await verifyWorkspaceOwner(workspaceId, user.id);

	return {
		id: workspace.id,
		name: workspace.name,
		createdAt: workspace.createdAt,
		updatedAt: workspace.updatedAt
	};
});

// ============================================================================
// REMOTE FUNCTIONS - FORMS
// ============================================================================

/**
 * Create a new workspace
 *
 * @param data - Object containing workspace name
 * @returns Object with success flag and workspaceId
 * @throws 401 if not authenticated
 */
export const createWorkspace = form(
	createWorkspaceSchema,
	async ({ name }) => {
		const user = await getCurrentUser();

		if (!user) {
			redirect(303, '/login');
		}

		const workspaceId = encodeHexLowerCase(crypto.getRandomValues(new Uint8Array(8)));
		const now = new Date();

		const newWorkspace = {
			id: workspaceId,
			ownerUserId: user.id,
			name,
			createdAt: now,
			updatedAt: now
		};

		await db.insert(table.workspace).values(newWorkspace);

		// Refresh listWorkspaces query to reflect the new workspace
		await listWorkspaces().refresh();

		return {
			success: true,
			workspaceId
		};
	}
);

/**
 * Update an existing workspace
 *
 * @param data - Object containing workspaceId and updated name
 * @returns Object with success flag
 * @throws 401 if not authenticated
 * @throws 404 if workspace not found
 * @throws 403 if user is not the owner
 */
export const updateWorkspace = form(
	updateWorkspaceSchema,
	async ({ workspaceId, name }) => {
		const user = await getCurrentUser();

		if (!user) {
			redirect(303, '/login');
		}

		// Verify ownership
		await verifyWorkspaceOwner(workspaceId, user.id);

		const updatedAt = new Date();

		await db
			.update(table.workspace)
			.set({
				name,
				updatedAt
			})
			.where(eq(table.workspace.id, workspaceId));

		// Update the cached getWorkspace query with new data
		await getWorkspace(workspaceId).set({
			id: workspaceId,
			name,
			createdAt: (await db.select().from(table.workspace).where(eq(table.workspace.id, workspaceId)))[0]
				?.createdAt,
			updatedAt
		});

		return {
			success: true
		};
	}
);

// ============================================================================
// REMOTE FUNCTIONS - COMMANDS
// ============================================================================

/**
 * Delete a workspace
 *
 * @param workspaceId - The ID of the workspace to delete
 * @throws 401 if not authenticated
 * @throws 404 if workspace not found
 * @throws 403 if user is not the owner
 */
export const deleteWorkspace = command(workspaceIdSchema, async (workspaceId) => {
	const user = await getCurrentUser();

	if (!user) {
		redirect(303, '/login');
	}

	// Verify ownership
	await verifyWorkspaceOwner(workspaceId, user.id);

	// Delete workspace (this will cascade delete related data if configured)
	await db.delete(table.workspace).where(eq(table.workspace.id, workspaceId));

	// Refresh listWorkspaces query to reflect the deletion
	await listWorkspaces().refresh();
});
