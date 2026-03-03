<script lang="ts">
	import {
		Dialog,
		DialogClose,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle,
		DialogTrigger
	} from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { createCategory } from '$lib/remotes/category.remote';
	import { toast } from 'svelte-sonner';
	import { slide } from 'svelte/transition';

	let { workspaceId, triggerLabel = 'Add Category' }: {
		workspaceId: string;
		triggerLabel?: string;
	} = $props();

	let open = $state(false);
	let wasSubmitting = $state(false);

	$effect(() => {
		if (createCategory.pending) {
			wasSubmitting = true;
		}
	});

	$effect(() => {
		if (!createCategory.pending && wasSubmitting) {
			const result = createCategory.result;
			const hasIssues = (createCategory.fields.allIssues()?.length ?? 0) > 0;

			if (result?.categoryId) {
				open = false;
				toast.success('Category created successfully');
			} else if (!hasIssues) {
				toast.error('Failed to create category. Please try again.');
			}

			wasSubmitting = false;
		}
	});
</script>

<Dialog bind:open>
	<DialogTrigger>
		{#snippet child({ props })}
			<Button {...props} variant="outline">{triggerLabel}</Button>
		{/snippet}
	</DialogTrigger>

	<DialogContent class="sm:max-w-md">
		<DialogHeader>
			<DialogTitle>Create Category</DialogTitle>
			<DialogDescription>
				Add a new category to organize your transactions.
			</DialogDescription>
		</DialogHeader>

		<form {...createCategory} class="space-y-4 py-2">
			<input type="hidden" name="workspaceId" value={workspaceId} />

			<div class="space-y-2">
				<Label for="category-name">Name</Label>
				<Input
					id="category-name"
					{...createCategory.fields.name.as('text')}
					placeholder="e.g. Groceries"
					disabled={!!createCategory.pending}
					class="h-10"
					required
				/>
				{#each createCategory.fields.name.issues() as issue}
					<p class="text-xs text-destructive font-medium" transition:slide={{ duration: 150 }}>
						{issue.message}
					</p>
				{/each}
			</div>

			<div class="space-y-2">
				<Label for="category-color">Color <span class="text-muted-foreground">(optional)</span></Label>
				<Input
					id="category-color"
					{...createCategory.fields.color.as('text')}
					placeholder="#FF5733"
					disabled={!!createCategory.pending}
					class="h-10"
				/>
				{#each createCategory.fields.color.issues() as issue}
					<p class="text-xs text-destructive font-medium" transition:slide={{ duration: 150 }}>
						{issue.message}
					</p>
				{/each}
			</div>

			<div class="space-y-2">
				<Label for="category-icon">Icon <span class="text-muted-foreground">(optional)</span></Label>
				<Input
					id="category-icon"
					{...createCategory.fields.icon.as('text')}
					placeholder="e.g. shopping-cart"
					disabled={!!createCategory.pending}
					class="h-10"
				/>
				{#each createCategory.fields.icon.issues() as issue}
					<p class="text-xs text-destructive font-medium" transition:slide={{ duration: 150 }}>
						{issue.message}
					</p>
				{/each}
			</div>

			{#if (createCategory.fields.allIssues()?.length ?? 0) > 0}
				<div
					class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
					transition:slide={{ duration: 150 }}
				>
					{#each createCategory.fields.allIssues() ?? [] as issue}
						<p>{issue.message}</p>
					{/each}
				</div>
			{/if}

			<DialogFooter class="pt-2">
				<DialogClose>
					{#snippet child({ props })}
						<Button {...props} variant="outline" type="button" disabled={!!createCategory.pending}>
							Cancel
						</Button>
					{/snippet}
				</DialogClose>
				<Button type="submit" disabled={!!createCategory.pending}>
					{#if createCategory.pending}
						Creating…
					{:else}
						Create
					{/if}
				</Button>
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>
