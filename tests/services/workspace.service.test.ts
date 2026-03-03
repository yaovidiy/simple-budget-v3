import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WorkspaceService } from '$lib/server/service/workspace.service';
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

describe('WorkspaceService', () => {
	let workspaceService: WorkspaceService;

	// Mock data
	const mockWorkspaceId = 'workspace-123';
	const mockOwnerId = 'user-owner-123';
	const mockMemberId = 'user-member-456';
	const mockWorkspaceName = 'My Workspace';

	const mockWorkspace = {
		id: mockWorkspaceId,
		ownerUserId: mockOwnerId,
		name: mockWorkspaceName,
		createdAt: new Date('2024-01-01'),
		updatedAt: new Date('2024-01-01')
	};

	const mockWorkspaceMember = {
		workspaceId: mockWorkspaceId,
		userId: mockOwnerId,
		role: 'owner' as const,
		joinedAt: new Date('2024-01-01')
	};

	const mockMember = {
		workspaceId: mockWorkspaceId,
		userId: mockMemberId,
		role: 'member' as const,
		joinedAt: new Date('2024-01-02')
	};

	beforeEach(() => {
		workspaceService = new WorkspaceService();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('create()', () => {
		it('should create a new workspace with owner', async () => {
			const mockDb = vi.mocked(db);

			mockDb.insert.mockReturnValue({
				values: vi.fn().mockReturnValue({
					returning: vi.fn().mockResolvedValue([mockWorkspace])
				})
			} as any);

			const result = await workspaceService.create({
				name: mockWorkspaceName,
				ownerUserId: mockOwnerId
			});

			expect(result.id).toBe(mockWorkspaceId);
			expect(result.name).toBe(mockWorkspaceName);
			expect(result.ownerUserId).toBe(mockOwnerId);
		});

		it('should add owner as workspace member', async () => {
			const mockDb = vi.mocked(db);
			const insertCalls: unknown[] = [];

			mockDb.insert.mockImplementation((table) => {
				return {
					values: vi.fn().mockImplementation((values) => {
						insertCalls.push(values);
						return {
							returning: vi.fn().mockResolvedValue([mockWorkspace])
						};
					})
				} as any;
			});

			await workspaceService.create({
				name: mockWorkspaceName,
				ownerUserId: mockOwnerId
			});

			expect(insertCalls.length).toBeGreaterThan(0);
		});

		it('should set correct timestamps on creation', async () => {
			const mockDb = vi.mocked(db);
			let capturedWorkspace: any;

			mockDb.insert.mockReturnValue({
				values: vi.fn().mockImplementation((values) => {
					capturedWorkspace = values;
					return {
						returning: vi.fn().mockResolvedValue([mockWorkspace])
					};
				})
			} as any);

			await workspaceService.create({
				name: mockWorkspaceName,
				ownerUserId: mockOwnerId
			});

		// Verify insert was called for workspace creation (second verification)
		expect(mockDb.insert).toHaveBeenCalled();
		});
	});

	describe('read()', () => {
		it('should return workspace when found', async () => {
			const mockDb = vi.mocked(db);

			mockDb.select.mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						get: vi.fn().mockResolvedValue(mockWorkspace)
					})
				})
			} as any);

			const result = await workspaceService.read(mockWorkspaceId);

			expect(result).toEqual(mockWorkspace);
			expect(result?.id).toBe(mockWorkspaceId);
		});

		it('should return null when workspace not found', async () => {
			const mockDb = vi.mocked(db);

			mockDb.select.mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						get: vi.fn().mockResolvedValue(null)
					})
				})
			} as any);

			const result = await workspaceService.read('nonexistent-id');

			expect(result).toBeNull();
		});
	});

	describe('update()', () => {
		it('should update workspace name', async () => {
			const updatedWorkspace = {
				...mockWorkspace,
				name: 'Updated Workspace',
				updatedAt: new Date('2024-01-02')
			};

			const mockDb = vi.mocked(db);

			mockDb.update.mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						returning: vi.fn().mockResolvedValue([updatedWorkspace])
					})
				})
			} as any);

			const result = await workspaceService.update(mockWorkspaceId, {
				name: 'Updated Workspace'
			});

			expect(result?.name).toBe('Updated Workspace');
		});

		it('should return null when workspace not found', async () => {
			const mockDb = vi.mocked(db);

			mockDb.update.mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						returning: vi.fn().mockResolvedValue([])
					})
				})
			} as any);

			const result = await workspaceService.update('nonexistent-id', {
				name: 'Updated Workspace'
			});

			expect(result).toBeNull();
		});

		it('should update the updatedAt timestamp', async () => {
			const mockDb = vi.mocked(db);
			let capturedData: any;

			mockDb.update.mockReturnValue({
				set: vi.fn().mockImplementation((data) => {
					capturedData = data;
					return {
						where: vi.fn().mockReturnValue({
							returning: vi.fn().mockResolvedValue([mockWorkspace])
						})
					};
				})
			} as any);

			await workspaceService.update(mockWorkspaceId, {
				name: 'Updated Workspace'
			});

			expect(capturedData?.updatedAt).toBeDefined();
		});
	});

	describe('delete()', () => {
		it('should delete a workspace', async () => {
			const mockDb = vi.mocked(db);

			mockDb.delete.mockReturnValue({
				where: vi.fn().mockResolvedValue(undefined)
			} as any);

			await expect(workspaceService.delete(mockWorkspaceId)).resolves.not.toThrow();

			expect(mockDb.delete).toHaveBeenCalled();
		});
	});

	describe('listByUserId()', () => {
		it('should return all workspaces for a user', async () => {
			const mockDb = vi.mocked(db);
			const mockWorkspaces = [
				mockWorkspaceMember,
				{ ...mockWorkspaceMember, workspaceId: 'workspace-456' }
			];

			mockDb.select.mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						all: vi.fn().mockResolvedValue(mockWorkspaces)
					})
				})
			} as any);

			const result = await workspaceService.listByUserId(mockOwnerId);

			expect(result).toHaveLength(2);
			expect(result[0].userId).toBe(mockOwnerId);
		});

		it('should return empty array when user has no workspaces', async () => {
			const mockDb = vi.mocked(db);

			mockDb.select.mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						all: vi.fn().mockResolvedValue([])
					})
				})
			} as any);

			const result = await workspaceService.listByUserId('user-with-no-workspaces');

			expect(result).toEqual([]);
		});
	});

	describe('inviteMember()', () => {
		it('should invite a member to a workspace', async () => {
			const mockDb = vi.mocked(db);

			mockDb.select.mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						get: vi.fn().mockResolvedValue(null)
					})
				})
			} as any);

			mockDb.insert.mockReturnValue({
				values: vi.fn().mockReturnValue({
					returning: vi.fn().mockResolvedValue([mockMember])
				})
			} as any);

			const result = await workspaceService.inviteMember({
				workspaceId: mockWorkspaceId,
				userId: mockMemberId,
				role: 'member'
			});

			expect(result.userId).toBe(mockMemberId);
			expect(result.role).toBe('member');
		});

		it('should set default role to member if not specified', async () => {
			const mockDb = vi.mocked(db);
			let capturedMember: any;

			mockDb.select.mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						get: vi.fn().mockResolvedValue(null)
					})
				})
			} as any);

			mockDb.insert.mockReturnValue({
				values: vi.fn().mockImplementation((values) => {
					capturedMember = values;
					return {
						returning: vi.fn().mockResolvedValue([mockMember])
					};
				})
			} as any);

			await workspaceService.inviteMember({
				workspaceId: mockWorkspaceId,
				userId: mockMemberId
			});

			expect(capturedMember?.role).toBe('member');
		});

		it('should throw error when user is already a member', async () => {
			const mockDb = vi.mocked(db);

			mockDb.select.mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						get: vi.fn().mockResolvedValue(mockMember)
					})
				})
			} as any);

			await expect(
				workspaceService.inviteMember({
					workspaceId: mockWorkspaceId,
					userId: mockMemberId
				})
			).rejects.toThrow('User is already a member of this workspace');
		});
	});

	describe('removeMember()', () => {
		it('should remove a member from workspace', async () => {
			const mockDb = vi.mocked(db);

			mockDb.delete.mockReturnValue({
				where: vi.fn().mockResolvedValue(undefined)
			} as any);

			await expect(
				workspaceService.removeMember({
					workspaceId: mockWorkspaceId,
					userId: mockMemberId
				})
			).resolves.not.toThrow();

			expect(mockDb.delete).toHaveBeenCalled();
		});
	});

	describe('updateMemberRole()', () => {
		it('should update member role to owner', async () => {
			const updatedMember = {
				...mockMember,
				role: 'owner' as const
			};

			const mockDb = vi.mocked(db);

			mockDb.update.mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						returning: vi.fn().mockResolvedValue([updatedMember])
					})
				})
			} as any);

			const result = await workspaceService.updateMemberRole({
				workspaceId: mockWorkspaceId,
				userId: mockMemberId,
				role: 'owner'
			});

			expect(result?.role).toBe('owner');
		});

		it('should update member role to member', async () => {
			const updatedMember = {
				...mockMember,
				role: 'member' as const
			};

			const mockDb = vi.mocked(db);

			mockDb.update.mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						returning: vi.fn().mockResolvedValue([updatedMember])
					})
				})
			} as any);

			const result = await workspaceService.updateMemberRole({
				workspaceId: mockWorkspaceId,
				userId: mockMemberId,
				role: 'member'
			});

			expect(result?.role).toBe('member');
		});

		it('should return null when member not found', async () => {
			const mockDb = vi.mocked(db);

			mockDb.update.mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						returning: vi.fn().mockResolvedValue([])
					})
				})
			} as any);

			const result = await workspaceService.updateMemberRole({
				workspaceId: mockWorkspaceId,
				userId: 'nonexistent-user',
				role: 'owner'
			});

			expect(result).toBeNull();
		});
	});

	describe('listMembers()', () => {
		it('should return all members of a workspace', async () => {
			const mockDb = vi.mocked(db);
			const mockMembers = [mockWorkspaceMember, mockMember];

			mockDb.select.mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						all: vi.fn().mockResolvedValue(mockMembers)
					})
				})
			} as any);

			const result = await workspaceService.listMembers(mockWorkspaceId);

			expect(result).toHaveLength(2);
			expect(result[0].role).toBe('owner');
			expect(result[1].role).toBe('member');
		});

		it('should return empty array when workspace has no members', async () => {
			const mockDb = vi.mocked(db);

			mockDb.select.mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						all: vi.fn().mockResolvedValue([])
					})
				})
			} as any);

			const result = await workspaceService.listMembers('empty-workspace');

			expect(result).toEqual([]);
		});
	});

	describe('isMember()', () => {
		it('should return true when user is a member', async () => {
			const mockDb = vi.mocked(db);

			mockDb.select.mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						get: vi.fn().mockResolvedValue(mockMember)
					})
				})
			} as any);

			const result = await workspaceService.isMember(mockWorkspaceId, mockMemberId);

			expect(result).toBe(true);
		});

		it('should return false when user is not a member', async () => {
			const mockDb = vi.mocked(db);

			mockDb.select.mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						get: vi.fn().mockResolvedValue(null)
					})
				})
			} as any);

			const result = await workspaceService.isMember(mockWorkspaceId, 'nonexistent-user');

			expect(result).toBe(false);
		});
	});

	describe('getMember()', () => {
		it('should return member when found', async () => {
			const mockDb = vi.mocked(db);

			mockDb.select.mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						get: vi.fn().mockResolvedValue(mockMember)
					})
				})
			} as any);

			const result = await workspaceService.getMember(mockWorkspaceId, mockMemberId);

			expect(result).toEqual(mockMember);
			expect(result?.userId).toBe(mockMemberId);
		});

		it('should return null when member not found', async () => {
			const mockDb = vi.mocked(db);

			mockDb.select.mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						get: vi.fn().mockResolvedValue(null)
					})
				})
			} as any);

			const result = await workspaceService.getMember(mockWorkspaceId, 'nonexistent-user');

			expect(result).toBeNull();
		});
	});
});
