<script lang="ts">
	import { page } from '$app/state';
</script>

<div class="flex min-h-screen items-center justify-center">
	<div class="text-center space-y-2">
		<h1 class="text-2xl font-bold">Workspace</h1>
		<p class="text-muted-foreground font-mono text-sm">{page.params.workspaceId}</p>
	</div>
</div>
