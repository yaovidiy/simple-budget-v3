<script lang="ts">
	import { page } from '$app/state';
	import { getCategoryCount } from '$lib/remotes/category.remote';
	import { getTagCount } from '$lib/remotes/tag.remote';
	import CreateCategoryDialog from '$lib/components/client/create-category-dialog.svelte';
	import CreateTagDialog from '$lib/components/client/create-tag-dialog.svelte';

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

			{@const categoryData = await getCategoryCount(workspaceId)}
			{@const tagData = await getTagCount(workspaceId)}

			<div class="flex gap-4 justify-center">
				<div class="rounded-lg border px-6 py-4 space-y-1">
					<p class="text-3xl font-bold">{categoryData.count}</p>
					<p class="text-sm text-muted-foreground">{categoryData.count === 1 ? 'Category' : 'Categories'}</p>
				</div>

				<div class="rounded-lg border px-6 py-4 space-y-1">
					<p class="text-3xl font-bold">{tagData.count}</p>
					<p class="text-sm text-muted-foreground">{tagData.count === 1 ? 'Tag' : 'Tags'}</p>
				</div>
			</div>

			{#snippet failed()}
				<div class="rounded-lg border px-6 py-4">
					<p class="text-destructive text-sm">Failed to load categories.</p>
				</div>
			{/snippet}
		</svelte:boundary>

		<div class="flex gap-2 items-center justify-center">
			<CreateCategoryDialog {workspaceId} />
			<CreateTagDialog {workspaceId} />
		</div>
	</div>
</div>
