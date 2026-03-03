<script lang="ts">
	import CreateWorkspaceDialog from '$lib/components/client/create-workspace-dialog.svelte';
</script>

<div class="flex min-h-screen items-center justify-center">
	<div class="text-center space-y-4">
		<h1 class="text-2xl font-bold">Welcome to Simple Budget</h1>
		<p class="text-muted-foreground">Create your first workspace to get started.</p>
		<CreateWorkspaceDialog triggerLabel="Create Workspace" />
	</div>
</div>
