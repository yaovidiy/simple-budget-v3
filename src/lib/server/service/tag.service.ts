import { db } from '$lib/server/db';
import { tag, transactionTag } from '$lib/server/db/schema';
import { eq, and, isNull, count } from 'drizzle-orm';

export interface CreateTagInput {
    workspaceId: string;
    name: string;
}

export interface UpdateTagInput {
    name?: string;
}

export interface AssignTagInput {
    transactionId: string;
    tagId: string;
}

export class TagService {
    async create(input: CreateTagInput) {
        const id = crypto.randomUUID();
        const now = new Date();

        try {
            const [newTag] = await db
                .insert(tag)
                .values({
                    id,
                    workspaceId: input.workspaceId,
                    name: input.name,
                    createdAt: now,
                    deletedAt: null
                })
                .returning();

            return newTag;
        } catch (e) {
            if (e instanceof Error && e.message.includes('UNIQUE constraint failed')) {
                throw new Error('Tag with this name already exists in this workspace');
            }
            throw e;
        }
    }

    async read(id: string) {
        const result = await db
            .select()
            .from(tag)
            .where(and(eq(tag.id, id), isNull(tag.deletedAt)))
            .get();

        return result || null;
    }

    async update(id: string, input: UpdateTagInput) {
        try {
            const [updated] = await db
                .update(tag)
                .set(input)
                .where(and(eq(tag.id, id), isNull(tag.deletedAt)))
                .returning();

            return updated || null;
        } catch (e) {
            if (e instanceof Error && e.message.includes('UNIQUE constraint failed')) {
                throw new Error('Tag with this name already exists in this workspace');
            }
            throw e;
        }
    }

    async delete(id: string) {
        const now = new Date();

        await db
            .update(tag)
            .set({ deletedAt: now })
            .where(and(eq(tag.id, id), isNull(tag.deletedAt)));

        await db.delete(transactionTag).where(eq(transactionTag.tagId, id));
    }

    async listByWorkspaceId(workspaceId: string) {
        return await db
            .select()
            .from(tag)
            .where(and(eq(tag.workspaceId, workspaceId), isNull(tag.deletedAt)))
            .all();
    }

    async countByWorkspaceId(workspaceId: string) {
        const result = await db
            .select({ count: count() })
            .from(tag)
            .where(and(eq(tag.workspaceId, workspaceId), isNull(tag.deletedAt)))
            .get();

        return result?.count ?? 0;
    }

    async addToTransaction(input: AssignTagInput) {
        const now = new Date();

        const [result] = await db
            .insert(transactionTag)
            .values({
                transactionId: input.transactionId,
                tagId: input.tagId,
                assignedAt: now
            })
            .onConflictDoNothing()
            .returning();

        return result;
    }

    async removeFromTransaction(transactionId: string, tagId: string) {
        await db.delete(transactionTag).where(and(eq(transactionTag.transactionId, transactionId), eq(transactionTag.tagId, tagId)));
    }

    async getTagsForTransaction(transactionId: string) {
        return await db
            .select({
                transactionId: transactionTag.transactionId,
                tagId: transactionTag.tagId,
                assignedAt: transactionTag.assignedAt,
                tag: {
                    id: tag.id,
                    name: tag.name,
                    createdAt: tag.createdAt
                }
            })
            .from(transactionTag)
            .innerJoin(tag, eq(transactionTag.tagId, tag.id))
            .where(eq(transactionTag.transactionId, transactionId))
            .all();
    }
}

export const tagService = new TagService();
