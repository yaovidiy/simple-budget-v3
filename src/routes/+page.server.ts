import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { workspaceService } from '$lib/server/service/workspace.service';

export const load: PageServerLoad = async ({ locals }) => {
	// Layout already redirects unauthenticated users to /login,
	// but guard here for type safety
	if (!locals.user) {
		redirect(303, '/login');
	}

	const members = await workspaceService.listByUserId(locals.user.id);

	if (members.length > 0) {
		redirect(303, `/${members[0].workspaceId}`);
	}

	return {};
};
