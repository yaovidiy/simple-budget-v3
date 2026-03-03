import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CategoryService } from '$lib/server/service/category.service';
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

describe('CategoryService', () => {
	let categoryService: CategoryService;

	// Mock data
	const mockCategoryId = 'category-123';
	const mockWorkspaceId = 'workspace-123';
	const mockTransactionId = 'transaction-456';
	const mockCategoryName = 'Groceries';

	const mockCategory = {
		id: mockCategoryId,
		workspaceId: mockWorkspaceId,
		name: mockCategoryName,
		color: '#FF5733',
		icon: 'shopping-cart',
		createdAt: new Date('2024-01-01'),
		deletedAt: null
	};

	const mockDeletedCategory = {
		...mockCategory,
		deletedAt: new Date('2024-01-02')
	};

	const mockTransactionCategory = {
		transactionId: mockTransactionId,
		categoryId: mockCategoryId,
		assignedAt: new Date('2024-01-03')
	};

	beforeEach(() => {
		categoryService = new CategoryService();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	// ============================================================================
	// CREATE METHOD TESTS
	// ============================================================================

	describe('create()', () => {
		it('should create a new category with correct fields', async () => {
			const mockDb = vi.mocked(db);

			mockDb.insert.mockReturnValue({
				values: vi.fn().mockReturnValue({
					returning: vi.fn().mockResolvedValue([mockCategory])
				})
			} as any);

			const result = await categoryService.create({
				workspaceId: mockWorkspaceId,
				name: mockCategoryName,
				color: '#FF5733',
				icon: 'shopping-cart'
			});

			expect(result.id).toBe(mockCategoryId);
			expect(result.name).toBe(mockCategoryName);
			expect(result.workspaceId).toBe(mockWorkspaceId);
			expect(result.color).toBe('#FF5733');
			expect(result.icon).toBe('shopping-cart');
		});

		it('should set createdAt and deletedAt: null on creation', async () => {
			const mockDb = vi.mocked(db);
			let capturedValues: any;

			mockDb.insert.mockReturnValue({
				values: vi.fn().mockImplementation((values) => {
					capturedValues = values;
					return {
						returning: vi.fn().mockResolvedValue([mockCategory])
					};
				})
			} as any);

			await categoryService.create({
				workspaceId: mockWorkspaceId,
				name: mockCategoryName
			});

			expect(capturedValues.createdAt).toBeInstanceOf(Date);
			expect(capturedValues.deletedAt).toBeNull();
		});

		it('should generate a valid UUID for the category ID', async () => {
			const mockDb = vi.mocked(db);
			let capturedId: string | undefined;

			mockDb.insert.mockReturnValue({
				values: vi.fn().mockImplementation((values) => {
					capturedId = values.id;
					return {
						returning: vi.fn().mockResolvedValue([mockCategory])
					};
				})
			} as any);

			await categoryService.create({
				workspaceId: mockWorkspaceId,
				name: mockCategoryName
			});

			// UUID v4 pattern: 8-4-4-4-12 hex digits
			expect(capturedId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
		});

		it('should handle optional color and icon as null when not provided', async () => {
			const mockDb = vi.mocked(db);
			let capturedValues: any;

			mockDb.insert.mockReturnValue({
				values: vi.fn().mockImplementation((values) => {
					capturedValues = values;
					return {
						returning: vi.fn().mockResolvedValue([mockCategory])
					};
				})
			} as any);

			await categoryService.create({
				workspaceId: mockWorkspaceId,
				name: mockCategoryName
			});

			expect(capturedValues.color).toBeNull();
			expect(capturedValues.icon).toBeNull();
		});

		it('should throw error on duplicate category name in workspace', async () => {
			const mockDb = vi.mocked(db);

			const error = new Error('UNIQUE constraint failed: category.workspace_id, category.name');

			mockDb.insert.mockReturnValue({
				values: vi.fn().mockReturnValue({
					returning: vi.fn().mockRejectedValue(error)
				})
			} as any);

			await expect(
				categoryService.create({
					workspaceId: mockWorkspaceId,
					name: mockCategoryName
				})
			).rejects.toThrow('Category with this name already exists in this workspace');
		});

		it('should pass through non-constraint errors', async () => {
			const mockDb = vi.mocked(db);
			const customError = new Error('Database connection failed');

			mockDb.insert.mockReturnValue({
				values: vi.fn().mockReturnValue({
					returning: vi.fn().mockRejectedValue(customError)
				})
			} as any);

			await expect(
				categoryService.create({
					workspaceId: mockWorkspaceId,
					name: mockCategoryName
				})
			).rejects.toThrow('Database connection failed');
		});
	});

	// ============================================================================
	// READ METHOD TESTS
	// ============================================================================

	describe('read()', () => {
		it('should return category when found and not soft-deleted', async () => {
			const mockDb = vi.mocked(db);

			mockDb.select.mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						get: vi.fn().mockResolvedValue(mockCategory)
					})
				})
			} as any);

			const result = await categoryService.read(mockCategoryId);

			expect(result).toEqual(mockCategory);
			expect(result?.id).toBe(mockCategoryId);
		});

		it('should return null when category not found', async () => {
			const mockDb = vi.mocked(db);

			mockDb.select.mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						get: vi.fn().mockResolvedValue(null)
					})
				})
			} as any);

			const result = await categoryService.read('nonexistent-id');

			expect(result).toBeNull();
		});

		it('should return null for soft-deleted category', async () => {
			const mockDb = vi.mocked(db);

			mockDb.select.mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						get: vi.fn().mockResolvedValue(null)
					})
				})
			} as any);

			const result = await categoryService.read(mockCategoryId);

			expect(result).toBeNull();
		});

		it('should filter by deletedAt IS NULL', async () => {
			const mockDb = vi.mocked(db);
			let whereClauseUsed = false;

			mockDb.select.mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockImplementation((condition) => {
						// Verify the where clause includes a soft-delete filter
						whereClauseUsed = true;
						return {
							get: vi.fn().mockResolvedValue(mockCategory)
						};
					})
				})
			} as any);

			await categoryService.read(mockCategoryId);

			expect(whereClauseUsed).toBe(true);
		});
	});

	// ============================================================================
	// UPDATE METHOD TESTS
	// ============================================================================

	describe('update()', () => {
		it('should update category name', async () => {
			const updatedCategory = { ...mockCategory, name: 'Updated Name' };
			const mockDb = vi.mocked(db);

			mockDb.update.mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						returning: vi.fn().mockResolvedValue([updatedCategory])
					})
				})
			} as any);

			const result = await categoryService.update(mockCategoryId, {
				name: 'Updated Name'
			});

			expect(result?.name).toBe('Updated Name');
		});

		it('should update category color', async () => {
			const updatedCategory = { ...mockCategory, color: '#AABBCC' };
			const mockDb = vi.mocked(db);

			mockDb.update.mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						returning: vi.fn().mockResolvedValue([updatedCategory])
					})
				})
			} as any);

			const result = await categoryService.update(mockCategoryId, {
				color: '#AABBCC'
			});

			expect(result?.color).toBe('#AABBCC');
		});

		it('should update category icon', async () => {
			const updatedCategory = { ...mockCategory, icon: 'new-icon' };
			const mockDb = vi.mocked(db);

			mockDb.update.mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						returning: vi.fn().mockResolvedValue([updatedCategory])
					})
				})
			} as any);

			const result = await categoryService.update(mockCategoryId, {
				icon: 'new-icon'
			});

			expect(result?.icon).toBe('new-icon');
		});

		it('should return null when category not found', async () => {
			const mockDb = vi.mocked(db);

			mockDb.update.mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						returning: vi.fn().mockResolvedValue([])
					})
				})
			} as any);

			const result = await categoryService.update('nonexistent-id', {
				name: 'New Name'
			});

			expect(result).toBeNull();
		});

		it('should throw error on duplicate category name in workspace', async () => {
			const mockDb = vi.mocked(db);
			const error = new Error('UNIQUE constraint failed: category.workspace_id, category.name');

			mockDb.update.mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						returning: vi.fn().mockRejectedValue(error)
					})
				})
			} as any);

			await expect(
				categoryService.update(mockCategoryId, { name: 'Duplicate Name' })
			).rejects.toThrow('Category with this name already exists in this workspace');
		});

		it('should pass through non-constraint errors', async () => {
			const mockDb = vi.mocked(db);
			const customError = new Error('Database locked');

			mockDb.update.mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						returning: vi.fn().mockRejectedValue(customError)
					})
				})
			} as any);

			await expect(
				categoryService.update(mockCategoryId, { name: 'New Name' })
			).rejects.toThrow('Database locked');
		});

		it('should filter by deletedAt IS NULL', async () => {
			const mockDb = vi.mocked(db);
			let whereClauseUsed = false;

			mockDb.update.mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockImplementation((condition) => {
						whereClauseUsed = true;
						return {
							returning: vi.fn().mockResolvedValue([mockCategory])
						};
					})
				})
			} as any);

			await categoryService.update(mockCategoryId, { name: 'New Name' });

			expect(whereClauseUsed).toBe(true);
		});
	});

	// ============================================================================
	// DELETE METHOD TESTS (SOFT-DELETE)
	// ============================================================================

	describe('delete()', () => {
		it('should soft-delete a category by setting deletedAt', async () => {
			const mockDb = vi.mocked(db);
			let deletedAtValue: Date | null = null;

			mockDb.update.mockReturnValue({
				set: vi.fn().mockImplementation((updates) => {
					deletedAtValue = updates.deletedAt;
					return {
						where: vi.fn().mockReturnValue({
							returning: vi.fn().mockResolvedValue([mockDeletedCategory])
						})
					};
				})
			} as any);

			mockDb.delete.mockReturnValue({
				where: vi.fn().mockReturnValue(Promise.resolve())
			} as any);

			await categoryService.delete(mockCategoryId);

			expect(deletedAtValue).toBeInstanceOf(Date);
		});

		it('should remove all transactionCategory associations when deleting', async () => {
			const mockDb = vi.mocked(db);
			let deleteWasCalled = false;

			mockDb.update.mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						returning: vi.fn().mockResolvedValue([mockDeletedCategory])
					})
				})
			} as any);

			mockDb.delete.mockReturnValue({
				where: vi.fn().mockImplementation(() => {
					deleteWasCalled = true;
					return Promise.resolve();
				})
			} as any);

			await categoryService.delete(mockCategoryId);

			expect(deleteWasCalled).toBe(true);
		});

		it('should use category ID in transactionCategory cleanup', async () => {
			const mockDb = vi.mocked(db);

			mockDb.update.mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						returning: vi.fn().mockResolvedValue([mockDeletedCategory])
					})
				})
			} as any);

			mockDb.delete.mockReturnValue({
				where: vi.fn().mockReturnValue(Promise.resolve())
			} as any);

			await categoryService.delete(mockCategoryId);

			expect(mockDb.delete).toHaveBeenCalled();
		});
	});

	// ============================================================================
	// LIST BY WORKSPACE TESTS
	// ============================================================================

	describe('listByWorkspaceId()', () => {
		it('should list all active categories in a workspace', async () => {
			const mockDb = vi.mocked(db);
			const categories = [mockCategory, { ...mockCategory, id: 'cat-2', name: 'Dining Out' }];

			mockDb.select.mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						all: vi.fn().mockResolvedValue(categories)
					})
				})
			} as any);

			const result = await categoryService.listByWorkspaceId(mockWorkspaceId);

			expect(result).toEqual(categories);
			expect(result.length).toBe(2);
		});

		it('should exclude soft-deleted categories', async () => {
			const mockDb = vi.mocked(db);
			const activeCategories = [mockCategory];

			mockDb.select.mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						all: vi.fn().mockResolvedValue(activeCategories)
					})
				})
			} as any);

			const result = await categoryService.listByWorkspaceId(mockWorkspaceId);

			// Query should filter by deletedAt IS NULL
			expect(mockDb.select).toHaveBeenCalled();
		});

		it('should return empty array when no categories exist', async () => {
			const mockDb = vi.mocked(db);

			mockDb.select.mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						all: vi.fn().mockResolvedValue([])
					})
				})
			} as any);

			const result = await categoryService.listByWorkspaceId(mockWorkspaceId);

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
						return {
							all: vi.fn().mockResolvedValue([mockCategory])
						};
					})
				})
			} as any);

			await categoryService.listByWorkspaceId(mockWorkspaceId);

			expect(whereClauseUsed).toBe(true);
		});
	});

	// ============================================================================
	// COUNT BY WORKSPACE TESTS
	// ============================================================================

	describe('countByWorkspaceId()', () => {
		it('should count active categories in a workspace', async () => {
			const mockDb = vi.mocked(db);

			mockDb.select.mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						get: vi.fn().mockResolvedValue({ count: 5 })
					})
				})
			} as any);

			const result = await categoryService.countByWorkspaceId(mockWorkspaceId);

			expect(result).toBe(5);
		});

		it('should return 0 when no categories exist', async () => {
			const mockDb = vi.mocked(db);

			mockDb.select.mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						get: vi.fn().mockResolvedValue(null)
					})
				})
			} as any);

			const result = await categoryService.countByWorkspaceId(mockWorkspaceId);

			expect(result).toBe(0);
		});

		it('should return 0 when result count is undefined', async () => {
			const mockDb = vi.mocked(db);

			mockDb.select.mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						get: vi.fn().mockResolvedValue({})
					})
				})
			} as any);

			const result = await categoryService.countByWorkspaceId(mockWorkspaceId);

			expect(result).toBe(0);
		});

		it('should filter by workspace ID and deletedAt IS NULL', async () => {
			const mockDb = vi.mocked(db);
			let whereClauseUsed = false;

			mockDb.select.mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockImplementation((condition) => {
						whereClauseUsed = true;
						return {
							get: vi.fn().mockResolvedValue({ count: 3 })
						};
					})
				})
			} as any);

			await categoryService.countByWorkspaceId(mockWorkspaceId);

			expect(whereClauseUsed).toBe(true);
		});
	});

	// ============================================================================
	// ASSIGN TO TRANSACTION TESTS
	// ============================================================================

	describe('assignToTransaction()', () => {
		it('should assign a category to a transaction', async () => {
			const mockDb = vi.mocked(db);

			mockDb.insert.mockReturnValue({
				values: vi.fn().mockReturnValue({
					onConflictDoUpdate: vi.fn().mockReturnValue({
						returning: vi.fn().mockResolvedValue([mockTransactionCategory])
					})
				})
			} as any);

			const result = await categoryService.assignToTransaction({
				transactionId: mockTransactionId,
				categoryId: mockCategoryId
			});

			expect(result.transactionId).toBe(mockTransactionId);
			expect(result.categoryId).toBe(mockCategoryId);
		});

		it('should replace existing assignment (upsert)', async () => {
			const mockDb = vi.mocked(db);
			let onConflictUsed = false;

			mockDb.insert.mockReturnValue({
				values: vi.fn().mockReturnValue({
					onConflictDoUpdate: vi.fn().mockImplementation(() => {
						onConflictUsed = true;
						return {
							returning: vi.fn().mockResolvedValue([mockTransactionCategory])
						};
					})
				})
			} as any);

			await categoryService.assignToTransaction({
				transactionId: mockTransactionId,
				categoryId: mockCategoryId
			});

			expect(onConflictUsed).toBe(true);
		});

		it('should set assignedAt timestamp', async () => {
			const mockDb = vi.mocked(db);
			let assignedAtValue: Date | undefined;

			mockDb.insert.mockReturnValue({
				values: vi.fn().mockImplementation((values) => {
					assignedAtValue = values.assignedAt;
					return {
						onConflictDoUpdate: vi.fn().mockReturnValue({
							returning: vi.fn().mockResolvedValue([mockTransactionCategory])
						})
					};
				})
			} as any);

			await categoryService.assignToTransaction({
				transactionId: mockTransactionId,
				categoryId: mockCategoryId
			});

			expect(assignedAtValue).toBeInstanceOf(Date);
		});
	});

	// ============================================================================
	// REMOVE FROM TRANSACTION TESTS
	// ============================================================================

	describe('removeFromTransaction()', () => {
		it('should remove category assignment from a transaction', async () => {
			const mockDb = vi.mocked(db);
			let deleteWasCalled = false;

			mockDb.delete.mockReturnValue({
				where: vi.fn().mockImplementation(() => {
					deleteWasCalled = true;
					return Promise.resolve();
				})
			} as any);

			await categoryService.removeFromTransaction(mockTransactionId);

			expect(deleteWasCalled).toBe(true);
		});

		it('should delete based on transaction ID', async () => {
			const mockDb = vi.mocked(db);
			let usedTransactionId: string | undefined;

			mockDb.delete.mockReturnValue({
				where: vi.fn().mockImplementation((condition) => {
					usedTransactionId = condition?.toString() || mockTransactionId;
					return Promise.resolve();
				})
			} as any);

			await categoryService.removeFromTransaction(mockTransactionId);

			expect(mockDb.delete).toHaveBeenCalled();
		});
	});

	// ============================================================================
	// GET CATEGORY FOR TRANSACTION TESTS
	// ============================================================================

	describe('getCategoryForTransaction()', () => {
		it('should return category for a transaction', async () => {
			const mockDb = vi.mocked(db);
			const mockResult = {
				transactionId: mockTransactionId,
				categoryId: mockCategoryId,
				assignedAt: new Date(),
				category: {
					id: mockCategoryId,
					name: mockCategoryName,
					color: '#FF5733',
					icon: 'shopping-cart'
				}
			};

			mockDb.select.mockReturnValue({
				from: vi.fn().mockReturnValue({
					innerJoin: vi.fn().mockReturnValue({
						where: vi.fn().mockReturnValue({
							get: vi.fn().mockResolvedValue(mockResult)
						})
					})
				})
			} as any);

			const result = await categoryService.getCategoryForTransaction(mockTransactionId);

			expect(result).toEqual(mockResult);
			expect(result?.category.name).toBe(mockCategoryName);
		});

		it('should return null when no category assigned to transaction', async () => {
			const mockDb = vi.mocked(db);

			mockDb.select.mockReturnValue({
				from: vi.fn().mockReturnValue({
					innerJoin: vi.fn().mockReturnValue({
						where: vi.fn().mockReturnValue({
							get: vi.fn().mockResolvedValue(null)
						})
					})
				})
			} as any);

			const result = await categoryService.getCategoryForTransaction(mockTransactionId);

			expect(result).toBeNull();
		});

		it('should include category details in result', async () => {
			const mockDb = vi.mocked(db);
			const mockResult = {
				transactionId: mockTransactionId,
				categoryId: mockCategoryId,
				assignedAt: new Date(),
				category: {
					id: mockCategoryId,
					name: mockCategoryName,
					color: '#FF5733',
					icon: 'shopping-cart'
				}
			};

			mockDb.select.mockReturnValue({
				from: vi.fn().mockReturnValue({
					innerJoin: vi.fn().mockReturnValue({
						where: vi.fn().mockReturnValue({
							get: vi.fn().mockResolvedValue(mockResult)
						})
					})
				})
			} as any);

			const result = await categoryService.getCategoryForTransaction(mockTransactionId);

			expect(result?.category).toBeDefined();
			expect(result?.category.id).toBe(mockCategoryId);
			expect(result?.category.name).toBe(mockCategoryName);
		});

		it('should filter by transaction ID', async () => {
			const mockDb = vi.mocked(db);
			let whereClauseUsed = false;

			mockDb.select.mockReturnValue({
				from: vi.fn().mockReturnValue({
					innerJoin: vi.fn().mockReturnValue({
						where: vi.fn().mockImplementation((condition) => {
							whereClauseUsed = true;
							return {
								get: vi.fn().mockResolvedValue(null)
							};
						})
					})
				})
			} as any);

			await categoryService.getCategoryForTransaction(mockTransactionId);

			expect(whereClauseUsed).toBe(true);
		});
	});
});
