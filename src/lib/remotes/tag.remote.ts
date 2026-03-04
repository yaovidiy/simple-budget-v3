import * as v from 'valibot';
import { error } from '@sveltejs/kit';
import { query, form, command, getRequestEvent } from '$app/server';
import { validateSessionToken, sessionCookieName } from '$lib/server/auth';
import { tagService } from '$lib/server/service/tag.service';
import { workspaceService } from '$lib/server/service/workspace.service';

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------
async function getCurrentUser() {
    const event = getRequestEvent();
    if (!event) return null;

    const sessionToken = event.cookies.get(sessionCookieName);
    if (!sessionToken) return null;

    const { user } = await validateSessionToken(sessionToken);
    return user;
}

async function requireUser() {
    const user = await getCurrentUser();
    if (!user) error(303, '/login');
    return user;
}

async function verifyWorkspaceMember(workspaceId: string, userId: string) {
    const workspace = await workspaceService.read(workspaceId);
    if (!workspace) error(404, 'Workspace not found');

    const isMember = await workspaceService.isMember(workspaceId, userId);
    if (!isMember) error(403, 'You are not a member of this workspace');

    return workspace;
}

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------
const workspaceIdSchema = v.pipe(v.string(), v.nonEmpty('Workspace ID is required'));
const tagIdSchema = v.pipe(v.string(), v.nonEmpty('Tag ID is required'));
const transactionIdSchema = v.pipe(v.string(), v.nonEmpty('Transaction ID is required'));

const createTagSchema = v.object({
    workspaceId: v.pipe(v.string(), v.nonEmpty('Workspace ID is required')),
    name: v.pipe(v.string(), v.nonEmpty('Tag name is required'), v.maxLength(30, 'Tag name must not exceed 30 characters'))
});

const updateTagSchema = v.object({
    tagId: v.pipe(v.string(), v.nonEmpty('Tag ID is required')),
    name: v.optional(v.pipe(v.string(), v.nonEmpty('Tag name is required'), v.maxLength(30, 'Tag name must not exceed 30 characters')))
});

const assignTagSchema = v.object({
    transactionId: v.pipe(v.string(), v.nonEmpty('Transaction ID is required')),
    tagId: v.pipe(v.string(), v.nonEmpty('Tag ID is required'))
});

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------
export const listTags = query(workspaceIdSchema, async (workspaceId) => {
    const user = await requireUser();
    await verifyWorkspaceMember(workspaceId, user.id);

    const tags = await tagService.listByWorkspaceId(workspaceId);

    return tags.map(({ id, name, createdAt }) => ({ id, name, createdAt }));
});

export const getTagCount = query(workspaceIdSchema, async (workspaceId) => {
    const user = await requireUser();
    await verifyWorkspaceMember(workspaceId, user.id);

    const count = await tagService.countByWorkspaceId(workspaceId);
    return { count };
});

export const getTag = query(tagIdSchema, async (tagId) => {
    const user = await requireUser();

    const t = await tagService.read(tagId);
    if (!t) error(404, 'Tag not found');

    await verifyWorkspaceMember(t.workspaceId, user.id);

    return { id: t.id, name: t.name, createdAt: t.createdAt };
});

export const getTagsForTransaction = query(transactionIdSchema, async (transactionId) => {
    await requireUser();

    return await tagService.getTagsForTransaction(transactionId);
});

// ---------------------------------------------------------------------------
// Forms (mutations)
// ---------------------------------------------------------------------------
export const createTag = form(createTagSchema, async ({ workspaceId, name }) => {
    const user = await requireUser();
    await verifyWorkspaceMember(workspaceId, user.id);

    try {
        const newTag = await tagService.create({ workspaceId, name });

        await listTags(workspaceId).refresh();
        await getTagCount(workspaceId).refresh();

        return { success: true, tagId: newTag.id };
    } catch (e) {
        if (e instanceof Error && e.message.includes('already exists')) {
            error(409, 'A tag with this name already exists in this workspace');
        }
        throw e;
    }
});

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------
export const updateTag = command(updateTagSchema, async ({ tagId, ...updates }) => {
    const user = await requireUser();

    const existing = await tagService.read(tagId);
    if (!existing) error(404, 'Tag not found');

    await verifyWorkspaceMember(existing.workspaceId, user.id);

    try {
        await tagService.update(tagId, updates);
    } catch (e) {
        if (e instanceof Error && e.message.includes('already exists')) {
            error(409, 'A tag with this name already exists in this workspace');
        }
        throw e;
    }

    await listTags(existing.workspaceId).refresh();
    getTag(tagId).refresh();
});

export const deleteTag = command(tagIdSchema, async (tagId) => {
    const user = await requireUser();

    const existing = await tagService.read(tagId);
    if (!existing) error(404, 'Tag not found');

    await verifyWorkspaceMember(existing.workspaceId, user.id);

    await tagService.delete(tagId);

    await listTags(existing.workspaceId).refresh();
    await getTagCount(existing.workspaceId).refresh();
});

export const addTagToTransaction = command(assignTagSchema, async ({ transactionId, tagId }) => {
    const user = await requireUser();

    const t = await tagService.read(tagId);
    if (!t) error(404, 'Tag not found');

    await verifyWorkspaceMember(t.workspaceId, user.id);

    await tagService.addToTransaction({ transactionId, tagId });

    getTagsForTransaction(transactionId).refresh();
});

export const removeTagFromTransaction = command(assignTagSchema, async ({ transactionId, tagId }) => {
    await requireUser();

    await tagService.removeFromTransaction(transactionId, tagId);

    getTagsForTransaction(transactionId).refresh();
});
