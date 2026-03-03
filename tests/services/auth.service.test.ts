import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AuthService } from '$lib/server/service/auth.service';
import * as argon2 from '@node-rs/argon2';
import * as authModule from '$lib/server/auth';
import { db } from '$lib/server/db';

// Mock dependencies
vi.mock('$lib/server/db', () => ({
	db: {
		select: vi.fn(),
		insert: vi.fn(),
		update: vi.fn(),
		delete: vi.fn()
	}
}));

vi.mock('@node-rs/argon2', () => ({
	hash: vi.fn(),
	verify: vi.fn()
}));

vi.mock('$lib/server/auth', () => ({
	generateSessionToken: vi.fn(),
	createSession: vi.fn(),
	validateSessionToken: vi.fn(),
	invalidateSession: vi.fn()
}));

describe('AuthService', () => {
	let authService: AuthService;

	// Mock data
	const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
	const mockUsername = 'testuser';
	const mockPassword = 'securePassword123';
	const mockPasswordHash = '$argon2id$v=19$m=19456,t=2,p=1$...hash';
	const mockSessionToken = 'session_token_123';

	const mockUser = {
		id: mockUserId,
		username: mockUsername,
		passwordHash: mockPasswordHash,
		age: null
	};

	const mockSession = {
		id: 'session_id_123',
		userId: mockUserId,
		expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
	};

	beforeEach(() => {
		authService = new AuthService();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('register()', () => {
		it('should successfully register a new user', async () => {
			const mockDb = {
				where: vi.fn().mockReturnValue({
					get: vi.fn().mockResolvedValue(null)
				}),
				values: vi.fn().mockReturnValue({
					returning: vi.fn().mockResolvedValue([mockUser])
				})
			};

			vi.spyOn(db, 'select').mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						get: vi.fn().mockResolvedValue(null)
					})
				})
			} as any);

			vi.spyOn(db, 'insert').mockReturnValue({
				values: vi.fn().mockReturnValue({
					returning: vi.fn().mockResolvedValue([mockUser])
				})
			} as any);

			vi.spyOn(argon2, 'hash').mockResolvedValue(mockPasswordHash);

			const result = await authService.register({
				username: mockUsername,
				password: mockPassword
			});

			expect(result.success).toBe(true);
			expect(result.userId).toBe(mockUserId);
			expect(result.message).toBe('User registered successfully');
		});

		it('should return error when username already exists', async () => {
			vi.spyOn(db, 'select').mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						get: vi.fn().mockResolvedValue(mockUser)
					})
				})
			} as any);

			const result = await authService.register({
				username: mockUsername,
				password: mockPassword
			});

			expect(result.success).toBe(false);
			expect(result.message).toBe('Username already exists');
		});

		it('should return error when password is too short', async () => {
			vi.spyOn(db, 'select').mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						get: vi.fn().mockResolvedValue(null)
					})
				})
			} as any);

			const result = await authService.register({
				username: mockUsername,
				password: '123'
			});

			expect(result.success).toBe(false);
			expect(result.message).toBe('Password must be at least 6 characters long');
		});

		it('should return error when password is empty', async () => {
			vi.spyOn(db, 'select').mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						get: vi.fn().mockResolvedValue(null)
					})
				})
			} as any);

			const result = await authService.register({
				username: mockUsername,
				password: ''
			});

			expect(result.success).toBe(false);
			expect(result.message).toBe('Password must be at least 6 characters long');
		});

		it('should handle database errors gracefully', async () => {
			vi.spyOn(db, 'select').mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						get: vi.fn().mockResolvedValue(null)
					})
				})
			} as any);

			vi.spyOn(db, 'insert').mockReturnValue({
				values: vi.fn().mockReturnValue({
					returning: vi.fn().mockRejectedValue(new Error('Database error'))
				})
			} as any);

			vi.spyOn(argon2, 'hash').mockResolvedValue(mockPasswordHash);

			const result = await authService.register({
				username: mockUsername,
				password: mockPassword
			});

			expect(result.success).toBe(false);
			expect(result.message).toBe('Registration failed');
		});
	});

	describe('login()', () => {
		it('should successfully login a user', async () => {
			vi.spyOn(db, 'select').mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						get: vi.fn().mockResolvedValue(mockUser)
					})
				})
			} as any);

			vi.spyOn(argon2, 'verify').mockResolvedValue(true);
			vi.spyOn(authModule, 'generateSessionToken').mockReturnValue(mockSessionToken);
			vi.spyOn(authModule, 'createSession').mockResolvedValue(undefined);

			const result = await authService.login({
				username: mockUsername,
				password: mockPassword
			});

			expect(result.success).toBe(true);
			expect(result.userId).toBe(mockUserId);
			expect(result.sessionToken).toBe(mockSessionToken);
			expect(result.message).toBe('Login successful');
		});

		it('should return error when user not found', async () => {
			vi.spyOn(db, 'select').mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						get: vi.fn().mockResolvedValue(null)
					})
				})
			} as any);

			const result = await authService.login({
				username: 'nonexistent',
				password: mockPassword
			});

			expect(result.success).toBe(false);
			expect(result.message).toBe('Invalid username or password');
		});

		it('should return error when password is incorrect', async () => {
			vi.spyOn(db, 'select').mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						get: vi.fn().mockResolvedValue(mockUser)
					})
				})
			} as any);

			vi.spyOn(argon2, 'verify').mockResolvedValue(false);

			const result = await authService.login({
				username: mockUsername,
				password: 'wrongPassword'
			});

			expect(result.success).toBe(false);
			expect(result.message).toBe('Invalid username or password');
		});

		it('should handle session creation errors', async () => {
			vi.spyOn(db, 'select').mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						get: vi.fn().mockResolvedValue(mockUser)
					})
				})
			} as any);

			vi.spyOn(argon2, 'verify').mockResolvedValue(true);
			vi.spyOn(authModule, 'generateSessionToken').mockReturnValue(mockSessionToken);
			vi.spyOn(authModule, 'createSession').mockRejectedValue(new Error('Session creation failed'));

			const result = await authService.login({
				username: mockUsername,
				password: mockPassword
			});

			expect(result.success).toBe(false);
			expect(result.message).toBe('Login failed');
		});
	});

	describe('getUserById()', () => {
		it('should return user when found', async () => {
			vi.spyOn(db, 'select').mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						get: vi.fn().mockResolvedValue(mockUser)
					})
				})
			} as any);

			const user = await authService.getUserById(mockUserId);

			expect(user).toEqual(mockUser);
			expect(user?.id).toBe(mockUserId);
		});

		it('should return null when user not found', async () => {
			vi.spyOn(db, 'select').mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						get: vi.fn().mockResolvedValue(null)
					})
				})
			} as any);

			const user = await authService.getUserById('nonexistent-id');

			expect(user).toBeNull();
		});
	});

	describe('getUserByUsername()', () => {
		it('should return user when found', async () => {
			vi.spyOn(db, 'select').mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						get: vi.fn().mockResolvedValue(mockUser)
					})
				})
			} as any);

			const user = await authService.getUserByUsername(mockUsername);

			expect(user).toEqual(mockUser);
			expect(user?.username).toBe(mockUsername);
		});

		it('should return null when user not found', async () => {
			vi.spyOn(db, 'select').mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						get: vi.fn().mockResolvedValue(null)
					})
				})
			} as any);

			const user = await authService.getUserByUsername('nonexistent');

			expect(user).toBeNull();
		});
	});

	describe('validateSession()', () => {
		it('should validate session token', async () => {
			vi.spyOn(authModule, 'validateSessionToken').mockResolvedValue({
				session: mockSession,
				user: mockUser
			});

			const result = await authService.validateSession(mockSessionToken);

			expect(result).toEqual({
				session: mockSession,
				user: mockUser
			});
		});

		it('should return null for invalid session', async () => {
			vi.spyOn(authModule, 'validateSessionToken').mockResolvedValue(null);

			const result = await authService.validateSession('invalid-token');

			expect(result).toBeNull();
		});
	});

	describe('logout()', () => {
		it('should invalidate session', async () => {
			vi.spyOn(authModule, 'invalidateSession').mockResolvedValue(undefined);

			await authService.logout('session_id_123');

			expect(authModule.invalidateSession).toHaveBeenCalledWith('session_id_123');
		});
	});

	describe('updateProfile()', () => {
		it('should update user profile with new username', async () => {
			const updatedUser = { ...mockUser, username: 'newusername' };

			vi.spyOn(db, 'select').mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						get: vi.fn().mockResolvedValue(null)
					})
				})
			} as any);

			vi.spyOn(db, 'update').mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						returning: vi.fn().mockResolvedValue([updatedUser])
					})
				})
			} as any);

			const result = await authService.updateProfile(mockUserId, {
				username: 'newusername'
			});

			expect(result?.username).toBe('newusername');
		});

		it('should update user profile with age', async () => {
			const updatedUser = { ...mockUser, age: 25 };

			vi.spyOn(db, 'update').mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						returning: vi.fn().mockResolvedValue([updatedUser])
					})
				})
			} as any);

			const result = await authService.updateProfile(mockUserId, {
				age: 25
			});

			expect(result?.age).toBe(25);
		});

		it('should throw error when new username already exists', async () => {
			vi.spyOn(db, 'select').mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						get: vi.fn().mockResolvedValue({ ...mockUser, id: 'different-id' })
					})
				})
			} as any);

			await expect(
				authService.updateProfile(mockUserId, {
					username: 'existinguser'
				})
			).rejects.toThrow('Username already exists');
		});

		it('should allow same username for same user', async () => {
			const updatedUser = mockUser;

			vi.spyOn(db, 'select').mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						get: vi.fn().mockResolvedValue(mockUser)
					})
				})
			} as any);

			vi.spyOn(db, 'update').mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						returning: vi.fn().mockResolvedValue([updatedUser])
					})
				})
			} as any);

			const result = await authService.updateProfile(mockUserId, {
				username: mockUsername
			});

			expect(result?.username).toBe(mockUsername);
		});
	});

	describe('changePassword()', () => {
		it('should successfully change password', async () => {
			vi.spyOn(db, 'select').mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						get: vi.fn().mockResolvedValue(mockUser)
					})
				})
			} as any);

			vi.spyOn(argon2, 'verify').mockResolvedValue(true);
			vi.spyOn(argon2, 'hash').mockResolvedValue('new_hash_123');

			vi.spyOn(db, 'update').mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockResolvedValue(undefined)
				})
			} as any);

			const result = await authService.changePassword(mockUserId, mockPassword, 'newPassword123');

			expect(result.success).toBe(true);
			expect(result.message).toBe('Password changed successfully');
		});

		it('should return error when user not found', async () => {
			vi.spyOn(db, 'select').mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						get: vi.fn().mockResolvedValue(null)
					})
				})
			} as any);

			const result = await authService.changePassword(mockUserId, mockPassword, 'newPassword123');

			expect(result.success).toBe(false);
			expect(result.message).toBe('User not found');
		});

		it('should return error when current password is incorrect', async () => {
			vi.spyOn(db, 'select').mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						get: vi.fn().mockResolvedValue(mockUser)
					})
				})
			} as any);

			vi.spyOn(argon2, 'verify').mockResolvedValue(false);

			const result = await authService.changePassword(mockUserId, 'wrongPassword', 'newPassword123');

			expect(result.success).toBe(false);
			expect(result.message).toBe('Current password is incorrect');
		});

		it('should return error when new password is too short', async () => {
			vi.spyOn(db, 'select').mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						get: vi.fn().mockResolvedValue(mockUser)
					})
				})
			} as any);

			vi.spyOn(argon2, 'verify').mockResolvedValue(true);

			const result = await authService.changePassword(mockUserId, mockPassword, '123');

			expect(result.success).toBe(false);
			expect(result.message).toBe('New password must be at least 6 characters long');
		});

		it('should handle password change database errors', async () => {
			vi.spyOn(db, 'select').mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						get: vi.fn().mockResolvedValue(mockUser)
					})
				})
			} as any);

			vi.spyOn(argon2, 'verify').mockResolvedValue(true);
			vi.spyOn(argon2, 'hash').mockResolvedValue('new_hash_123');

			vi.spyOn(db, 'update').mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockRejectedValue(new Error('Database error'))
				})
			} as any);

			const result = await authService.changePassword(mockUserId, mockPassword, 'newPassword123');

			expect(result.success).toBe(false);
			expect(result.message).toBe('Failed to change password');
		});
	});

	describe('deleteAccount()', () => {
		it('should successfully delete user account', async () => {
			vi.spyOn(db, 'delete').mockReturnValue({
				where: vi.fn().mockResolvedValue(undefined)
			} as any);

			const result = await authService.deleteAccount(mockUserId);

			expect(result.success).toBe(true);
			expect(result.message).toBe('Account deleted successfully');
		});

		it('should handle deletion errors', async () => {
			vi.spyOn(db, 'delete').mockReturnValue({
				where: vi.fn().mockRejectedValue(new Error('Database error'))
			} as any);

			const result = await authService.deleteAccount(mockUserId);

			expect(result.success).toBe(false);
			expect(result.message).toBe('Failed to delete account');
		});
	});
});
