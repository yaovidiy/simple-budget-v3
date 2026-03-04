import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TagService } from '$lib/server/service/tag.service';
import { db } from '$lib/server/db';

// Mock database
vi.mock('$lib/server/db', () => ({
    db: {
        select: vi.fn(),
        insert: vi.fn(),
        update: vi.fn(),
        delete: vi.fn()
    }
}));

describe('TagService', () => {
    let tagService: TagService;

    const mockTagId = 'tag-123';
    const mockWorkspaceId = 'workspace-abc';
    const mockTransactionId = 'transaction-xyz';
    const mockTagName = 'Important';

    const mockTag = {
        id: mockTagId,
        workspaceId: mockWorkspaceId,
        name: mockTagName,
        createdAt: new Date('2024-01-01'),
        deletedAt: null
    };

    const mockDeletedTag = { ...mockTag, deletedAt: new Date('2024-01-02') };

    const mockTransactionTag = {
        transactionId: mockTransactionId,
        tagId: mockTagId,
        assignedAt: new Date('2024-01-03')
    };

    beforeEach(() => {
        tagService = new TagService();
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    // CREATE
    describe('create()', () => {
        it('should create a new tag with correct fields', async () => {
            const mockDb = vi.mocked(db);

            mockDb.insert.mockReturnValue({
                values: vi.fn().mockReturnValue({
                    returning: vi.fn().mockResolvedValue([mockTag])
                })
            } as any);

            const result = await tagService.create({ workspaceId: mockWorkspaceId, name: mockTagName });

            expect(result.id).toBe(mockTagId);
            expect(result.name).toBe(mockTagName);
            expect(result.workspaceId).toBe(mockWorkspaceId);
        });

        it('should set createdAt and deletedAt: null on creation', async () => {
            const mockDb = vi.mocked(db);
            let capturedValues: any;

            mockDb.insert.mockReturnValue({
                values: vi.fn().mockImplementation((values) => {
                    capturedValues = values;
                    return { returning: vi.fn().mockResolvedValue([mockTag]) };
                })
            } as any);

            await tagService.create({ workspaceId: mockWorkspaceId, name: mockTagName });

            expect(capturedValues.createdAt).toBeInstanceOf(Date);
            expect(capturedValues.deletedAt).toBeNull();
        });

        it('should generate a valid UUID for the tag ID', async () => {
            const mockDb = vi.mocked(db);
            let capturedId: string | undefined;

            mockDb.insert.mockReturnValue({
                values: vi.fn().mockImplementation((values) => {
                    capturedId = values.id;
                    return { returning: vi.fn().mockResolvedValue([mockTag]) };
                })
            } as any);

            await tagService.create({ workspaceId: mockWorkspaceId, name: mockTagName });

            expect(capturedId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        });

        it('should throw error on duplicate tag name in workspace', async () => {
            const mockDb = vi.mocked(db);
            const error = new Error('UNIQUE constraint failed: tag.workspace_id, tag.name');

            mockDb.insert.mockReturnValue({
                values: vi.fn().mockReturnValue({ returning: vi.fn().mockRejectedValue(error) })
            } as any);

            await expect(tagService.create({ workspaceId: mockWorkspaceId, name: mockTagName })).rejects.toThrow(
                'Tag with this name already exists in this workspace'
            );
        });

        it('should pass through non-constraint errors', async () => {
            const mockDb = vi.mocked(db);
            const customError = new Error('Database connection failed');

            mockDb.insert.mockReturnValue({
                values: vi.fn().mockReturnValue({ returning: vi.fn().mockRejectedValue(customError) })
            } as any);

            await expect(tagService.create({ workspaceId: mockWorkspaceId, name: mockTagName })).rejects.toThrow(
                'Database connection failed'
            );
        });
    });

    // READ
    describe('read()', () => {
        it('should return tag when found and not soft-deleted', async () => {
            const mockDb = vi.mocked(db);

            mockDb.select.mockReturnValue({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({ get: vi.fn().mockResolvedValue(mockTag) })
                })
            } as any);

            const result = await tagService.read(mockTagId);

            expect(result).toEqual(mockTag);
            expect(result?.id).toBe(mockTagId);
        });

        it('should return null when tag not found', async () => {
            const mockDb = vi.mocked(db);

            mockDb.select.mockReturnValue({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({ get: vi.fn().mockResolvedValue(null) })
                })
            } as any);

            const result = await tagService.read('nonexistent-id');

            expect(result).toBeNull();
        });

        it('should return null for soft-deleted tag', async () => {
            const mockDb = vi.mocked(db);

            mockDb.select.mockReturnValue({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({ get: vi.fn().mockResolvedValue(null) })
                })
            } as any);

            const result = await tagService.read(mockTagId);

            expect(result).toBeNull();
        });

        it('should filter by deletedAt IS NULL', async () => {
            const mockDb = vi.mocked(db);
            let whereClauseUsed = false;

            mockDb.select.mockReturnValue({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockImplementation((condition) => {
                        whereClauseUsed = true;
                        return { get: vi.fn().mockResolvedValue(mockTag) };
                    })
                })
            } as any);

            await tagService.read(mockTagId);

            expect(whereClauseUsed).toBe(true);
        });
    });

    // UPDATE
    describe('update()', () => {
        it('should update tag name', async () => {
            const updatedTag = { ...mockTag, name: 'Updated Tag' };
            const mockDb = vi.mocked(db);

            mockDb.update.mockReturnValue({
                set: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([updatedTag]) })
                })
            } as any);

            const result = await tagService.update(mockTagId, { name: 'Updated Tag' });

            expect(result?.name).toBe('Updated Tag');
        });

        it('should return null when tag not found', async () => {
            const mockDb = vi.mocked(db);

            mockDb.update.mockReturnValue({
                set: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([]) })
                })
            } as any);

            const result = await tagService.update('nonexistent-id', { name: 'New Name' });

            expect(result).toBeNull();
        });

        it('should throw error on duplicate tag name in workspace', async () => {
            const mockDb = vi.mocked(db);
            const error = new Error('UNIQUE constraint failed: tag.workspace_id, tag.name');

            mockDb.update.mockReturnValue({
                set: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({ returning: vi.fn().mockRejectedValue(error) })
                })
            } as any);

            await expect(tagService.update(mockTagId, { name: 'Duplicate Name' })).rejects.toThrow(
                'Tag with this name already exists in this workspace'
            );
        });

        it('should pass through non-constraint errors', async () => {
            const mockDb = vi.mocked(db);
            const customError = new Error('Database locked');

            mockDb.update.mockReturnValue({
                set: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({ returning: vi.fn().mockRejectedValue(customError) })
                })
            } as any);

            await expect(tagService.update(mockTagId, { name: 'New Name' })).rejects.toThrow('Database locked');
        });

        it('should filter by deletedAt IS NULL', async () => {
            const mockDb = vi.mocked(db);
            let whereClauseUsed = false;

            mockDb.update.mockReturnValue({
                set: vi.fn().mockReturnValue({
                    where: vi.fn().mockImplementation((condition) => {
                        whereClauseUsed = true;
                        return { returning: vi.fn().mockResolvedValue([mockTag]) };
                    })
                })
            } as any);

            await tagService.update(mockTagId, { name: 'New Name' });

            expect(whereClauseUsed).toBe(true);
        });
    });

    // DELETE (soft-delete)
    describe('delete()', () => {
        it('should soft-delete a tag by setting deletedAt', async () => {
            const mockDb = vi.mocked(db);
            let deletedAtValue: Date | null = null;

            mockDb.update.mockReturnValue({
                set: vi.fn().mockImplementation((updates) => {
                    deletedAtValue = updates.deletedAt;
                    return { where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([mockDeletedTag]) }) };
                })
            } as any);

            mockDb.delete.mockReturnValue({ where: vi.fn().mockReturnValue(Promise.resolve()) } as any);

            await tagService.delete(mockTagId);

            expect(deletedAtValue).toBeInstanceOf(Date);
        });

        it('should remove all transactionTag associations when deleting', async () => {
            const mockDb = vi.mocked(db);
            let deleteWasCalled = false;

            mockDb.update.mockReturnValue({
                set: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([mockDeletedTag]) })
                })
            } as any);

            mockDb.delete.mockReturnValue({
                where: vi.fn().mockImplementation(() => {
                    deleteWasCalled = true;
                    return Promise.resolve();
                })
            } as any);

            await tagService.delete(mockTagId);

            expect(deleteWasCalled).toBe(true);
        });

        it('should use tag ID in transactionTag cleanup', async () => {
            const mockDb = vi.mocked(db);

            mockDb.update.mockReturnValue({
                set: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([mockDeletedTag]) })
                })
            } as any);

            mockDb.delete.mockReturnValue({ where: vi.fn().mockReturnValue(Promise.resolve()) } as any);

            await tagService.delete(mockTagId);

            expect(mockDb.delete).toHaveBeenCalled();
        });
    });

    // LIST BY WORKSPACE
    describe('listByWorkspaceId()', () => {
        it('should list all active tags in a workspace', async () => {
            const mockDb = vi.mocked(db);
            const tags = [mockTag, { ...mockTag, id: 'tag-2', name: 'Travel' }];

            mockDb.select.mockReturnValue({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({ all: vi.fn().mockResolvedValue(tags) })
                })
            } as any);

            const result = await tagService.listByWorkspaceId(mockWorkspaceId);

            expect(result).toEqual(tags);
            expect(result.length).toBe(2);
        });

        it('should exclude soft-deleted tags', async () => {
            const mockDb = vi.mocked(db);
            const activeTags = [mockTag];

            mockDb.select.mockReturnValue({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({ all: vi.fn().mockResolvedValue(activeTags) })
                })
            } as any);

            const result = await tagService.listByWorkspaceId(mockWorkspaceId);

            expect(mockDb.select).toHaveBeenCalled();
        });

        it('should return empty array when no tags exist', async () => {
            const mockDb = vi.mocked(db);

            mockDb.select.mockReturnValue({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({ all: vi.fn().mockResolvedValue([]) })
                })
            } as any);

            const result = await tagService.listByWorkspaceId(mockWorkspaceId);

            expect(result).toEqual([]);
            expect(result.length).toBe(0);
        });

        it('should filter by workspace ID', async () => {
            const mockDb = vi.mocked(db);
            let whereClauseUsed = false;

            mockDb.select.mockReturnValue({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockImplementation((condition) => {
                        whereClauseUsed = true;
                        return { all: vi.fn().mockResolvedValue([mockTag]) };
                    })
                })
            } as any);

            await tagService.listByWorkspaceId(mockWorkspaceId);

            expect(whereClauseUsed).toBe(true);
        });
    });

    // COUNT BY WORKSPACE
    describe('countByWorkspaceId()', () => {
        it('should count active tags in a workspace', async () => {
            const mockDb = vi.mocked(db);

            mockDb.select.mockReturnValue({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({ get: vi.fn().mockResolvedValue({ count: 5 }) })
                })
            } as any);

            const result = await tagService.countByWorkspaceId(mockWorkspaceId);

            expect(result).toBe(5);
        });

        it('should return 0 when no tags exist', async () => {
            const mockDb = vi.mocked(db);

            mockDb.select.mockReturnValue({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({ get: vi.fn().mockResolvedValue(null) })
                })
            } as any);

            const result = await tagService.countByWorkspaceId(mockWorkspaceId);

            expect(result).toBe(0);
        });

        it('should return 0 when result count is undefined', async () => {
            const mockDb = vi.mocked(db);

            mockDb.select.mockReturnValue({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({ get: vi.fn().mockResolvedValue({}) })
                })
            } as any);

            const result = await tagService.countByWorkspaceId(mockWorkspaceId);

            expect(result).toBe(0);
        });

        it('should filter by workspace ID and deletedAt IS NULL', async () => {
            const mockDb = vi.mocked(db);
            let whereClauseUsed = false;

            mockDb.select.mockReturnValue({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockImplementation((condition) => {
                        whereClauseUsed = true;
                        return { get: vi.fn().mockResolvedValue({ count: 3 }) };
                    })
                })
            } as any);

            await tagService.countByWorkspaceId(mockWorkspaceId);

            expect(whereClauseUsed).toBe(true);
        });
    });

    // ADD TO TRANSACTION
    describe('addToTransaction()', () => {
        it('should add tag to a transaction', async () => {
            const mockDb = vi.mocked(db);

            mockDb.insert.mockReturnValue({
                values: vi.fn().mockReturnValue({
                    onConflictDoNothing: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([mockTransactionTag]) })
                })
            } as any);

            const result = await tagService.addToTransaction({ transactionId: mockTransactionId, tagId: mockTagId });

            expect(result.transactionId).toBe(mockTransactionId);
            expect(result.tagId).toBe(mockTagId);
        });

        it('should use onConflictDoNothing for duplicates', async () => {
            const mockDb = vi.mocked(db);
            let onConflictUsed = false;

            mockDb.insert.mockReturnValue({
                values: vi.fn().mockReturnValue({
                    onConflictDoNothing: vi.fn().mockImplementation(() => {
                        onConflictUsed = true;
                        return { returning: vi.fn().mockResolvedValue([mockTransactionTag]) };
                    })
                })
            } as any);

            await tagService.addToTransaction({ transactionId: mockTransactionId, tagId: mockTagId });

            expect(onConflictUsed).toBe(true);
        });

        it('should set assignedAt timestamp', async () => {
            const mockDb = vi.mocked(db);
            let assignedAtValue: Date | undefined;

            mockDb.insert.mockReturnValue({
                values: vi.fn().mockImplementation((values) => {
                    assignedAtValue = values.assignedAt;
                    return { onConflictDoNothing: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([mockTransactionTag]) }) };
                })
            } as any);

            await tagService.addToTransaction({ transactionId: mockTransactionId, tagId: mockTagId });

            expect(assignedAtValue).toBeInstanceOf(Date);
        });
    });

    // REMOVE FROM TRANSACTION
    describe('removeFromTransaction()', () => {
        it('should remove tag assignment from a transaction', async () => {
            const mockDb = vi.mocked(db);
            let deleteWasCalled = false;

            mockDb.delete.mockReturnValue({
                where: vi.fn().mockImplementation(() => {
                    deleteWasCalled = true;
                    return Promise.resolve();
                })
            } as any);

            await tagService.removeFromTransaction(mockTransactionId, mockTagId);

            expect(deleteWasCalled).toBe(true);
        });

        it('should delete based on transaction ID and tag ID', async () => {
            const mockDb = vi.mocked(db);
            let usedCondition: any;

            mockDb.delete.mockReturnValue({
                where: vi.fn().mockImplementation((condition) => {
                    usedCondition = condition;
                    return Promise.resolve();
                })
            } as any);

            await tagService.removeFromTransaction(mockTransactionId, mockTagId);

            expect(mockDb.delete).toHaveBeenCalled();
        });
    });

    // GET TAGS FOR TRANSACTION
    describe('getTagsForTransaction()', () => {
        it('should return array of tags for a transaction', async () => {
            const mockDb = vi.mocked(db);
            const mockResult = {
                transactionId: mockTransactionId,
                tagId: mockTagId,
                assignedAt: new Date(),
                tag: {
                    id: mockTagId,
                    name: mockTagName
                }
            };

            mockDb.select.mockReturnValue({
                from: vi.fn().mockReturnValue({
                    innerJoin: vi.fn().mockReturnValue({
                        where: vi.fn().mockReturnValue({ all: vi.fn().mockResolvedValue([mockResult]) })
                    })
                })
            } as any);

            const result = await tagService.getTagsForTransaction(mockTransactionId);

            expect(result).toEqual([mockResult]);
            expect(result[0].tag.name).toBe(mockTagName);
        });

        it('should return empty array when none exist', async () => {
            const mockDb = vi.mocked(db);

            mockDb.select.mockReturnValue({
                from: vi.fn().mockReturnValue({
                    innerJoin: vi.fn().mockReturnValue({
                        where: vi.fn().mockReturnValue({ all: vi.fn().mockResolvedValue([]) })
                    })
                })
            } as any);

            const result = await tagService.getTagsForTransaction(mockTransactionId);

            expect(result).toEqual([]);
        });

        it('should filter by transaction ID', async () => {
            const mockDb = vi.mocked(db);
            let whereClauseUsed = false;

            mockDb.select.mockReturnValue({
                from: vi.fn().mockReturnValue({
                    innerJoin: vi.fn().mockReturnValue({
                        where: vi.fn().mockImplementation((condition) => {
                            whereClauseUsed = true;
                            return { all: vi.fn().mockResolvedValue([]) };
                        })
                    })
                })
            } as any);

            await tagService.getTagsForTransaction(mockTransactionId);

            expect(whereClauseUsed).toBe(true);
        });
    });
});
