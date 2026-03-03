import * as v from 'valibot';
import { form, getRequestEvent } from '$app/server';
import { generateSessionToken, createSession, setSessionTokenCookie, validateSessionToken } from '$lib/server/auth';
import { redirect } from '@sveltejs/kit';
import { authService } from '$lib/server/service/auth.service';

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
 * @throws Error if username already exists or registration fails
 */
export const register = form(
	registerSchema,
	async ({ username, password }) => {
		const event = getRequestEvent();
		if (!event) {
			throw new Error('Request event not found');
		}

		const result = await authService.register({ username, password });

		if (!result.success || !result.userId) {
			throw new Error(result.message ?? 'Registration failed');
		}

		// Create and persist session (HTTP concern handled in remote)
		const sessionToken = generateSessionToken();
		const session = await createSession(sessionToken, result.userId);
		setSessionTokenCookie(event, sessionToken, session.expiresAt);

		redirect(303, '/');
	}
);

/**
 * Login a user
 *
 * @param data - Object containing username and password
 * @throws Error if credentials are invalid or login fails
 */
export const login = form(
	loginSchema,
	async ({ username, password }) => {
		const event = getRequestEvent();
		if (!event) {
			throw new Error('Request event not found');
		}

		const result = await authService.login({ username, password });

		if (!result.success || !result.sessionToken) {
			throw new Error(result.message ?? 'Login failed');
		}

		// Retrieve session to obtain expiresAt for the cookie
		const { session } = await validateSessionToken(result.sessionToken);
		if (!session) {
			throw new Error('Failed to establish session');
		}

		setSessionTokenCookie(event, result.sessionToken, session.expiresAt);

		redirect(303, '/');
	}
);
