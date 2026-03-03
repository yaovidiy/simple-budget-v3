<script lang="ts">
	import { page } from '$app/state';
	import { getCategoryCount } from '$lib/remotes/category.remote';
	import CreateCategoryDialog from '$lib/components/client/create-category-dialog.svelte';

	const workspaceId = $derived(page.params.workspaceId as string);
</script>

<div class="flex min-h-screen items-center justify-center">
	<div class="text-center space-y-4">
		<h1 class="text-2xl font-bold">Workspace</h1>
		<p class="text-muted-foreground font-mono text-sm">{workspaceId}</p>

		<svelte:boundary>
			{#snippet pending()}
				<div class="rounded-lg border px-6 py-4">
					<p class="text-muted-foreground text-sm">Loading categories…</p>
				</div>
			{/snippet}

			{@const countData = await getCategoryCount(workspaceId)}

			<div class="rounded-lg border px-6 py-4 space-y-1">
				<p class="text-3xl font-bold">{countData.count}</p>
				<p class="text-sm text-muted-foreground">
					{countData.count === 1 ? 'Category' : 'Categories'}
				</p>
			</div>

			{#snippet failed()}
				<div class="rounded-lg border px-6 py-4">
					<p class="text-destructive text-sm">Failed to load categories.</p>
				</div>
			{/snippet}
		</svelte:boundary>

		<CreateCategoryDialog {workspaceId} />
	</div>
</div>
