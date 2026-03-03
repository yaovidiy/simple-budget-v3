import * as v from 'valibot';
import { error, redirect } from '@sveltejs/kit';
import { query, form, command, getRequestEvent } from '$app/server';
import { validateSessionToken, sessionCookieName } from '$lib/server/auth';
import { workspaceService } from '$lib/server/service/workspace.service';
import { authService } from '$lib/server/service/auth.service';

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
	const workspace = await workspaceService.read(workspaceId);

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

const inviteUserSchema = v.object({
	workspaceId: v.pipe(
		v.string(),
		v.nonEmpty('Workspace ID is required')
	),
	username: v.pipe(
		v.string(),
		v.nonEmpty('Username is required')
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

	const members = await workspaceService.listByUserId(user.id);
	const workspaces = await Promise.all(members.map((m) => workspaceService.read(m.workspaceId)));

	return workspaces
		.filter((w): w is NonNullable<typeof w> => w !== null)
		.map(({ id, name, createdAt, updatedAt }) => ({ id, name, createdAt, updatedAt }));
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

		const newWorkspace = await workspaceService.create({ name, ownerUserId: user.id });

		// Refresh listWorkspaces query to reflect the new workspace
		await listWorkspaces().refresh();

		return {
			success: true,
			workspaceId: newWorkspace.id
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

		const updated = await workspaceService.update(workspaceId, { name });

		// Update the cached getWorkspace query with new data
		if (updated) {
			getWorkspace(workspaceId).set({
				id: updated.id,
				name: updated.name,
				createdAt: updated.createdAt,
				updatedAt: updated.updatedAt
			});
		}

		return {
			success: true
		};
	}
);

/**
 * Invite a registered user to a workspace
 *
 * @param data - Object containing workspaceId and username
 * @returns Object with success flag and userId
 * @throws 401 if not authenticated
 * @throws 403 if user is not the owner of the workspace
 * @throws 404 if workspace or user not found
 * @throws 400 if trying to invite yourself
 * @throws 409 if user is already a member of the workspace
 */
export const inviteUserToWorkspace = form(
	inviteUserSchema,
	async ({ workspaceId, username }) => {
		const user = await getCurrentUser();

		if (!user) {
			redirect(303, '/login');
		}

		// Verify caller is the workspace owner
		await verifyWorkspaceOwner(workspaceId, user.id);

		// Look up the user to invite by username
		const invitee = await authService.getUserByUsername(username);

		if (!invitee) {
			error(404, 'User not found');
		}

		// Prevent self-invite
		if (invitee.id === user.id) {
			error(400, 'You cannot invite yourself');
		}

		try {
			await workspaceService.inviteMember({ workspaceId, userId: invitee.id, role: 'member' });
		} catch (e) {
			if (e instanceof Error && e.message.includes('already a member')) {
				error(409, 'User is already a member of this workspace');
			}
			throw e;
		}

		return {
			success: true,
			userId: invitee.id
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

	await workspaceService.delete(workspaceId);

	// Refresh listWorkspaces query to reflect the deletion
	await listWorkspaces().refresh();
});
