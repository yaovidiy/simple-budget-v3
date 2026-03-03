import { db } from '$lib/server/db';
import { user, session } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { hash, verify } from '@node-rs/argon2';
import { generateSessionToken, createSession, validateSessionToken, invalidateSession } from '$lib/server/auth';

export interface RegisterInput {
	username: string;
	password: string;
}

export interface LoginInput {
	username: string;
	password: string;
}

export interface AuthResult {
	success: boolean;
	message?: string;
	userId?: string;
	sessionToken?: string;
}

export class AuthService {
	/**
	 * Hash a password using Argon2
	 */
	private async hashPassword(password: string): Promise<string> {
		return hash(password);
	}

	/**
	 * Verify a password against a hash
	 */
	private async verifyPassword(password: string, hash: string): Promise<boolean> {
		return verify(hash, password);
	}

	/**
	 * Register a new user
	 */
	async register(input: RegisterInput): Promise<AuthResult> {
		// Check if username already exists
		const existingUser = await db
			.select()
			.from(user)
			.where(eq(user.username, input.username))
			.get();

		if (existingUser) {
			return {
				success: false,
				message: 'Username already exists'
			};
		}

		// Validate password
		if (!input.password || input.password.length < 6) {
			return {
				success: false,
				message: 'Password must be at least 6 characters long'
			};
		}

		try {
			const passwordHash = await this.hashPassword(input.password);
			const userId = crypto.randomUUID();

			const [newUser] = await db
				.insert(user)
				.values({
					id: userId,
					username: input.username,
					passwordHash,
					age: null
				})
				.returning();

			return {
				success: true,
				message: 'User registered successfully',
				userId: newUser.id
			};
		} catch {
			return {
				success: false,
				message: 'Registration failed'
			};
		}
	}

	/**
	 * Login a user and create a session
	 */
	async login(input: LoginInput): Promise<AuthResult> {
		// Find user by username
		const foundUser = await db
			.select()
			.from(user)
			.where(eq(user.username, input.username))
			.get();

		if (!foundUser) {
			return {
				success: false,
				message: 'Invalid username or password'
			};
		}

		// Verify password
		const passwordValid = await this.verifyPassword(input.password, foundUser.passwordHash);

		if (!passwordValid) {
			return {
				success: false,
				message: 'Invalid username or password'
			};
		}

		try {
			// Create session
			const sessionToken = generateSessionToken();
			await createSession(sessionToken, foundUser.id);

			return {
				success: true,
				message: 'Login successful',
				userId: foundUser.id,
				sessionToken
			};
		} catch {
			return {
				success: false,
				message: 'Login failed'
			};
		}
	}

	/**
	 * Get user by ID
	 */
	async getUserById(userId: string) {
		const foundUser = await db
			.select()
			.from(user)
			.where(eq(user.id, userId))
			.get();

		return foundUser || null;
	}

	/**
	 * Get user by username
	 */
	async getUserByUsername(username: string) {
		const foundUser = await db
			.select()
			.from(user)
			.where(eq(user.username, username))
			.get();

		return foundUser || null;
	}

	/**
	 * Validate session token
	 */
	async validateSession(token: string) {
		return validateSessionToken(token);
	}

	/**
	 * Invalidate a session
	 */
	async logout(sessionId: string) {
		await invalidateSession(sessionId);
	}

	/**
	 * Update user profile
	 */
	async updateProfile(userId: string, data: { username?: string; age?: number | null }) {
		// Check if new username already exists
		if (data.username) {
			const existingUser = await db
				.select()
				.from(user)
				.where(eq(user.username, data.username))
				.get();

			if (existingUser && existingUser.id !== userId) {
				throw new Error('Username already exists');
			}
		}

		const [updated] = await db
			.update(user)
			.set(data)
			.where(eq(user.id, userId))
			.returning();

		return updated || null;
	}

	/**
	 * Change password
	 */
	async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<AuthResult> {
		// Get user
		const foundUser = await db
			.select()
			.from(user)
			.where(eq(user.id, userId))
			.get();

		if (!foundUser) {
			return {
				success: false,
				message: 'User not found'
			};
		}

		// Verify current password
		const passwordValid = await this.verifyPassword(currentPassword, foundUser.passwordHash);

		if (!passwordValid) {
			return {
				success: false,
				message: 'Current password is incorrect'
			};
		}

		// Validate new password
		if (!newPassword || newPassword.length < 6) {
			return {
				success: false,
				message: 'New password must be at least 6 characters long'
			};
		}

		try {
			const newPasswordHash = await this.hashPassword(newPassword);

			await db
				.update(user)
				.set({ passwordHash: newPasswordHash })
				.where(eq(user.id, userId));

			return {
				success: true,
				message: 'Password changed successfully'
			};
		} catch {
			return {
				success: false,
				message: 'Failed to change password'
			};
		}
	}

	/**
	 * Delete user account
	 */
	async deleteAccount(userId: string): Promise<AuthResult> {
		try {
			// Delete all sessions for this user
			await db.delete(session).where(eq(session.userId, userId));

			// Delete user
			await db.delete(user).where(eq(user.id, userId));

			return {
				success: true,
				message: 'Account deleted successfully'
			};
		} catch {
			return {
				success: false,
				message: 'Failed to delete account'
			};
		}
	}
}

export const authService = new AuthService();
