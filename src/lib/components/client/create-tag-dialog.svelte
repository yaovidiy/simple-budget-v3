<script lang="ts">
    import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '$lib/components/ui/dialog';
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import { Label } from '$lib/components/ui/label';
    import { createTag } from '$lib/remotes/tag.remote';
    import { toast } from 'svelte-sonner';
    import { slide } from 'svelte/transition';

    let { workspaceId, triggerLabel = 'Add Tag' }: { workspaceId: string; triggerLabel?: string } = $props();

    let open = $state(false);
    let wasSubmitting = $state(false);

    $effect(() => {
        if (createTag.pending) {
            wasSubmitting = true;
        }
    });

    $effect(() => {
        if (!createTag.pending && wasSubmitting) {
            const result = createTag.result;
            const hasIssues = (createTag.fields.allIssues()?.length ?? 0) > 0;

            if (result?.tagId) {
                open = false;
                toast.success('Tag created successfully');
            } else if (!hasIssues) {
                toast.error('Failed to create tag. Please try again.');
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
            <DialogTitle>Create Tag</DialogTitle>
            <DialogDescription>
                Add a new tag to label transactions.
            </DialogDescription>
        </DialogHeader>

        <form {...createTag} class="space-y-4 py-2">
            <input type="hidden" name="workspaceId" value={workspaceId} />

            <div class="space-y-2">
                <Label for="tag-name">Name</Label>
                <Input
                    id="tag-name"
                    {...createTag.fields.name.as('text')}
                    placeholder="e.g. Vacation"
                    disabled={!!createTag.pending}
                    class="h-10"
                    required
                />
                {#each createTag.fields.name.issues() as issue}
                    <p class="text-xs text-destructive font-medium" transition:slide={{ duration: 150 }}>
                        {issue.message}
                    </p>
                {/each}
            </div>

            {#if (createTag.fields.allIssues()?.length ?? 0) > 0}
                <div class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" transition:slide={{ duration: 150 }}>
                    {#each createTag.fields.allIssues() ?? [] as issue}
                        <p>{issue.message}</p>
                    {/each}
                </div>
            {/if}

            <DialogFooter class="pt-2">
                <DialogClose>
                    {#snippet child({ props })}
                        <Button {...props} variant="outline" type="button" disabled={!!createTag.pending}>
                            Cancel
                        </Button>
                    {/snippet}
                </DialogClose>
                <Button type="submit" disabled={!!createTag.pending}>
                    {#if createTag.pending}
                        Creating…
                    {:else}
                        Create
                    {/if}
                </Button>
            </DialogFooter>
        </form>
    </DialogContent>
</Dialog>
