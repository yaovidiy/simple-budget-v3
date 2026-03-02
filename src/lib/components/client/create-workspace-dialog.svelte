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
	import { createWorkspace } from '$lib/remotes/workspace.remote';
	import { slide } from 'svelte/transition';

	let { triggerLabel = 'New Workspace' }: { triggerLabel?: string } = $props();

	let open = $state(false);
</script>

<Dialog bind:open>
	<DialogTrigger>
		{#snippet child({ props })}
			<Button {...props}>{triggerLabel}</Button>
		{/snippet}
	</DialogTrigger>

	<DialogContent class="sm:max-w-md">
		<DialogHeader>
			<DialogTitle>Create Workspace</DialogTitle>
			<DialogDescription>
				Give your workspace a name. You can always change it later.
			</DialogDescription>
		</DialogHeader>

		<form {...createWorkspace} class="space-y-4 py-2">
			<div class="space-y-2">
				<Label for="workspace-name">Workspace name</Label>
				<Input
					id="workspace-name"
					{...createWorkspace.fields.name.as('text')}
					placeholder="e.g. Personal Budget"
					disabled={!!createWorkspace.pending}
					class="h-10"
					required
				/>
				{#each createWorkspace.fields.name.issues() as issue}
					<p class="text-xs text-destructive font-medium" transition:slide={{ duration: 150 }}>
						{issue.message}
					</p>
				{/each}
			</div>

			{#if (createWorkspace.fields.allIssues()?.length ?? 0) > 0}
				<div
					class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
					transition:slide={{ duration: 150 }}
				>
					{#each createWorkspace.fields.allIssues() ?? [] as issue}
						<p>{issue.message}</p>
					{/each}
				</div>
			{/if}

			<DialogFooter class="pt-2">
				<DialogClose>
					{#snippet child({ props })}
						<Button {...props} variant="outline" type="button" disabled={!!createWorkspace.pending}>
							Cancel
						</Button>
					{/snippet}
				</DialogClose>
				<Button type="submit" disabled={!!createWorkspace.pending}>
					{#if createWorkspace.pending}
						Creating…
					{:else}
						Create
					{/if}
				</Button>
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>
