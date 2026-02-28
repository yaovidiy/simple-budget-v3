<script lang="ts">
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Label } from '$lib/components/ui/label';
	import { login, register } from '$lib/remotes/auth.remote';

	let activeTab = $state('login');

	const loginForm = login;
	const registerForm = register;
</script>

<div class="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-900 to-slate-800 px-4 py-12">
	<Card class="w-full max-w-md shadow-2xl">
		<CardHeader class="space-y-1 text-center">
			<CardTitle class="text-3xl font-bold">Welcome</CardTitle>
			<CardDescription class="text-base">Sign in or create an account to continue</CardDescription>
		</CardHeader>
		<CardContent>
			<Tabs bind:value={activeTab} class="w-full">
				<TabsList class="grid w-full grid-cols-2 mb-6">
					<TabsTrigger value="login">Login</TabsTrigger>
					<TabsTrigger value="register">Register</TabsTrigger>
				</TabsList>

				<!-- Login Form -->
				<TabsContent value="login" class="space-y-4">
					<form {...loginForm}>
						<div class="space-y-4">
							<!-- Username Field -->
							<div class="space-y-2">
								<Label for="login-username" class="text-sm font-medium">Username</Label>
								<Input
									id="login-username"
									{...loginForm.fields.username.as('text')}
									placeholder="Enter your username"
									disabled={!!loginForm.pending}
									class="h-10"
									required
								/>
								{#each loginForm.fields.username.issues() as issue}
									<p class="text-xs text-destructive font-medium">
										{issue.message}
									</p>
								{/each}
							</div>

							<!-- Password Field -->
							<div class="space-y-2">
								<Label for="login-password" class="text-sm font-medium">Password</Label>
								<Input
									id="login-password"
									{...loginForm.fields.password.as('password')}
									placeholder="Enter your password"
									disabled={!!loginForm.pending}
									class="h-10"
									required
								/>
								{#each loginForm.fields.password.issues() as issue}
									<p class="text-xs text-destructive font-medium">
										{issue.message}
									</p>
								{/each}
							</div>

							<!-- General Issues -->
							{#each loginForm.fields.allIssues() as issue}
								<div class="bg-destructive/10 text-destructive text-sm p-3 rounded-md border border-destructive/20">
									{issue.message}
								</div>
							{/each}

							<!-- Submit Button -->
							<Button
								type="submit"
								disabled={!!loginForm.pending}
								class="w-full h-10 mt-2 font-medium"
							>
								{loginForm.pending ? 'Signing in...' : 'Sign In'}
							</Button>
						</div>
					</form>

					<!-- Help Text -->
					<p class="text-center text-xs text-muted-foreground mt-4">
						Don't have an account? Click the
						<button
							type="button"
							on:click={() => (activeTab = 'register')}
							class="text-primary hover:underline cursor-pointer font-medium"
						>
							Register tab
						</button>
					</p>
				</TabsContent>

				<!-- Register Form -->
				<TabsContent value="register" class="space-y-4">
					<form {...registerForm}>
						<div class="space-y-4">
							<!-- Username Field -->
							<div class="space-y-2">
								<Label for="register-username" class="text-sm font-medium">Username</Label>
								<Input
									id="register-username"
									{...registerForm.fields.username.as('text')}
									placeholder="Choose a username"
									disabled={!!registerForm.pending}
									class="h-10"
									required
									minlength={3}
									maxlength={20}
								/>
								{#each registerForm.fields.username.issues() as issue}
									<p class="text-xs text-destructive font-medium">
										{issue.message}
									</p>
								{/each}
								<p class="text-xs text-muted-foreground">3 to 20 characters</p>
							</div>

							<!-- Password Field -->
							<div class="space-y-2">
								<Label for="register-password" class="text-sm font-medium">Password</Label>
								<Input
									id="register-password"
									{...registerForm.fields.password.as('password')}
									placeholder="Create a strong password"
									disabled={!!registerForm.pending}
									class="h-10"
									required
									minlength={8}
								/>
								{#each registerForm.fields.password.issues() as issue}
									<p class="text-xs text-destructive font-medium">
										{issue.message}
									</p>
								{/each}
								<p class="text-xs text-muted-foreground">At least 8 characters</p>
							</div>

							<!-- Repeat Password Field -->
							<div class="space-y-2">
								<Label for="register-repeat-password" class="text-sm font-medium">Confirm Password</Label>
								<Input
									id="register-repeat-password"
									{...registerForm.fields.repeatPassword.as('password')}
									placeholder="Confirm your password"
									disabled={!!registerForm.pending}
									class="h-10"
									required
									minlength={8}
								/>
								{#each registerForm.fields.repeatPassword.issues() as issue}
									<p class="text-xs text-destructive font-medium">
										{issue.message}
									</p>
								{/each}
							</div>

							<!-- General Issues -->
							{#each registerForm.fields.allIssues() as issue}
								<div class="bg-destructive/10 text-destructive text-sm p-3 rounded-md border border-destructive/20">
									{issue.message}
								</div>
							{/each}

							<!-- Submit Button -->
							<Button
								type="submit"
								disabled={!!registerForm.pending}
								class="w-full h-10 mt-2 font-medium"
							>
								{registerForm.pending ? 'Creating account...' : 'Create Account'}
							</Button>
						</div>
					</form>

					<!-- Help Text -->
					<p class="text-center text-xs text-muted-foreground mt-4">
						Already have an account? Click the
						<button
							type="button"
							on:click={() => (activeTab = 'login')}
							class="text-primary hover:underline cursor-pointer font-medium"
						>
							Login tab
						</button>
					</p>
				</TabsContent>
			</Tabs>

			<!-- Footer Info -->
			<div class="mt-6 pt-4 border-t text-center">
				<p class="text-xs text-muted-foreground">
					Your information is secure and encrypted
				</p>
			</div>
		</CardContent>
	</Card>
</div>
