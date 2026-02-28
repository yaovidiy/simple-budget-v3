import * as v from 'valibot';
import { form, getRequestEvent } from '$app/server';
import { hash, verify } from '@node-rs/argon2';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { generateSessionToken, createSession, setSessionTokenCookie } from '$lib/server/auth';
import { eq } from 'drizzle-orm';
import { encodeHexLowerCase } from '@oslojs/encoding';
import { redirect } from '@sveltejs/kit';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const registerSchema = v.pipe(
	v.object({
		username: v.pipe(
			v.string(),
			v.nonEmpty('Username is required'),
			v.minLength(3, 'Username must be at least 3 characters'),
			v.maxLength(20, 'Username must not exceed 20 characters')
		),
		password: v.pipe(
			v.string(),
			v.nonEmpty('Password is required'),
			v.minLength(8, 'Password must be at least 8 characters')
		),
		repeatPassword: v.pipe(
			v.string(),
			v.nonEmpty('Please confirm your password')
		)
	}),
	v.check(
		(input) => input.password === input.repeatPassword,
		"Passwords don't match"
	)
);

const loginSchema = v.object({
	username: v.pipe(
		v.string(),
		v.nonEmpty('Username is required')
	),
	password: v.pipe(
		v.string(),
		v.nonEmpty('Password is required')
	)
});

// ============================================================================
// REMOTE FUNCTIONS - FORMS
// ============================================================================

/**
 * Register a new user
 *
 * @param data - Object containing username and password
 * @returns Object with success flag and userId
 * @throws Error if username already exists
 * @throws Error if registration fails
 */
export const register = form(
	registerSchema,
	async ({ username, password }) => {
		const event = getRequestEvent();
		if (!event) {
			throw new Error('Request event not found');
		}

		// Check if username already exists
		const [existingUser] = await db
			.select()
			.from(table.user)
			.where(eq(table.user.username, username));

		if (existingUser) {
			throw new Error('Username already taken');
		}

		// Hash password
		const passwordHash = await hash(password, {
			memoryCost: 19456,
			timeCost: 2,
			outputLen: 32,
			parallelism: 1
		});

		// Create new user
		const userId = encodeHexLowerCase(crypto.getRandomValues(new Uint8Array(16)));

		const newUser = {
			id: userId,
			username,
			passwordHash,
			age: null
		};

		await db.insert(table.user).values(newUser);

		// Create session
		const sessionToken = generateSessionToken();
		const session = await createSession(sessionToken, userId);
		setSessionTokenCookie(event, sessionToken, session.expiresAt);

		redirect(303, '/');
	}
);

/**
 * Login a user
 *
 * @param data - Object containing username and password
 * @returns Object with success flag and userId
 * @throws Error if username not found or password is invalid
 */
export const login = form(
	loginSchema,
	async ({ username, password }) => {
		const event = getRequestEvent();
		if (!event) {
			throw new Error('Request event not found');
		}

		// Find user by username
		const [user] = await db
			.select()
			.from(table.user)
			.where(eq(table.user.username, username));

		if (!user) {
			throw new Error('Invalid username or password');
		}

		// Verify password
		const validPassword = await verify(user.passwordHash, password);

		if (!validPassword) {
			throw new Error('Invalid username or password');
		}

		// Create session
		const sessionToken = generateSessionToken();
		const session = await createSession(sessionToken, user.id);
		setSessionTokenCookie(event, sessionToken, session.expiresAt);

		redirect(303, '/');
	}
);
