import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	// Check if user is authenticated
	if (!locals.user && url.pathname !== '/login' && url.pathname !== '/register') {
		// Redirect to login if not authenticated
		throw redirect(303, '/login');
	}

	return {
		user: locals.user
	};
};
