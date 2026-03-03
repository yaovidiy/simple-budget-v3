import { db } from '$lib/server/db';
import { workspace, workspaceMember } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

export interface CreateWorkspaceInput {
	name: string;
	ownerUserId: string;
}

export interface UpdateWorkspaceInput {
	name?: string;
}

export interface InviteMemberInput {
	workspaceId: string;
	userId: string;
	role?: 'owner' | 'member';
}

export interface RemoveMemberInput {
	workspaceId: string;
	userId: string;
}

export interface UpdateMemberRoleInput {
	workspaceId: string;
	userId: string;
	role: 'owner' | 'member';
}

export class WorkspaceService {
	/**
	 * Create a new workspace
	 */
	async create(input: CreateWorkspaceInput) {
		const id = crypto.randomUUID();
		const now = new Date();

		const [newWorkspace] = await db
			.insert(workspace)
			.values({
				id,
				ownerUserId: input.ownerUserId,
				name: input.name,
				createdAt: now,
				updatedAt: now
			})
			.returning();

		// Add owner as workspace member
		await db.insert(workspaceMember).values({
			workspaceId: id,
			userId: input.ownerUserId,
			role: 'owner',
			joinedAt: now
		});

		return newWorkspace;
	}

	/**
	 * Get a workspace by ID
	 */
	async read(id: string) {
		const result = await db
			.select()
			.from(workspace)
			.where(eq(workspace.id, id))
			.get();

		return result || null;
	}

	/**
	 * Update a workspace
	 */
	async update(id: string, input: UpdateWorkspaceInput) {
		const now = new Date();

		const [updated] = await db
			.update(workspace)
			.set({
				...input,
				updatedAt: now
			})
			.where(eq(workspace.id, id))
			.returning();

		return updated || null;
	}

	/**
	 * Delete a workspace
	 */
	async delete(id: string) {
		await db.delete(workspace).where(eq(workspace.id, id));
	}

	/**
	 * List all workspaces for a user
	 */
	async listByUserId(userId: string) {
		return await db
			.select()
			.from(workspaceMember)
			.where(eq(workspaceMember.userId, userId))
			.all();
	}

	/**
	 * Invite a user to a workspace
	 */
	async inviteMember(input: InviteMemberInput) {
		const now = new Date();
		const role = input.role || 'member';

		// Check if user is already a member
		const existingMember = await db
			.select()
			.from(workspaceMember)
			.where(
				and(
					eq(workspaceMember.workspaceId, input.workspaceId),
					eq(workspaceMember.userId, input.userId)
				)
			)
			.get();

		if (existingMember) {
			throw new Error('User is already a member of this workspace');
		}

		const [newMember] = await db
			.insert(workspaceMember)
			.values({
				workspaceId: input.workspaceId,
				userId: input.userId,
				role,
				joinedAt: now
			})
			.returning();

		return newMember;
	}

	/**
	 * Remove a member from a workspace
	 */
	async removeMember(input: RemoveMemberInput) {
		await db
			.delete(workspaceMember)
			.where(
				and(
					eq(workspaceMember.workspaceId, input.workspaceId),
					eq(workspaceMember.userId, input.userId)
				)
			);
	}

	/**
	 * Update a member's role in a workspace
	 */
	async updateMemberRole(input: UpdateMemberRoleInput) {
		const [updated] = await db
			.update(workspaceMember)
			.set({
				role: input.role
			})
			.where(
				and(
					eq(workspaceMember.workspaceId, input.workspaceId),
					eq(workspaceMember.userId, input.userId)
				)
			)
			.returning();

		return updated || null;
	}

	/**
	 * Get all members of a workspace
	 */
	async listMembers(workspaceId: string) {
		return await db
			.select()
			.from(workspaceMember)
			.where(eq(workspaceMember.workspaceId, workspaceId))
			.all();
	}

	/**
	 * Check if user is a member of a workspace
	 */
	async isMember(workspaceId: string, userId: string) {
		const member = await db
			.select()
			.from(workspaceMember)
			.where(
				and(
					eq(workspaceMember.workspaceId, workspaceId),
					eq(workspaceMember.userId, userId)
				)
			)
			.get();

		return !!member;
	}

	/**
	 * Get a workspace member
	 */
	async getMember(workspaceId: string, userId: string) {
		return await db
			.select()
			.from(workspaceMember)
			.where(
				and(
					eq(workspaceMember.workspaceId, workspaceId),
					eq(workspaceMember.userId, userId)
				)
			)
			.get();
	}
}

export const workspaceService = new WorkspaceService();
