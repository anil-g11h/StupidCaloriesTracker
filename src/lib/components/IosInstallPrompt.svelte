<script lang="ts">
	import { Share, X } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';

	let showPrompt = $state(false);

	onMount(() => {
		// Check if it's iOS
		const isIOS = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
		
		// Check if it's already installed (standalone mode)
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const isStandalone = ('standalone' in window.navigator) && (window.navigator as any).standalone;

		// Check if user has dismissed it before
		const isDismissed = localStorage.getItem('ios-install-prompt-dismissed');

		if (isIOS && !isStandalone && !isDismissed) {
			// Show after a short delay
			setTimeout(() => {
				showPrompt = true;
			}, 3000);
		}
	});

	function dismiss() {
		showPrompt = false;
		localStorage.setItem('ios-install-prompt-dismissed', 'true');
	}
</script>

{#if showPrompt}
		<div class="fixed inset-0 z-[100] flex items-end justify-center px-4 pb-6 pointer-events-none">
			<!-- Backdrop -->
			<div 
				class="absolute inset-0 bg-black/50 pointer-events-auto" 
				onclick={dismiss}
				onkeydown={(e) => e.key === 'Escape' && dismiss()}
				role="button"
				tabindex="0"
				transition:fade
			></div>

			<!-- Modal -->
			<div 
				class="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-xl p-6 shadow-xl pointer-events-auto border border-zinc-200 dark:border-zinc-800"
				transition:fly={{ y: 200, duration: 300 }}
			>
				<button 
					onclick={dismiss}
					class="absolute top-2 right-2 p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
				>
					<X size={20} />
				</button>

				<h3 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
					Install App
				</h3>
				<p class="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
					Install this app on your iPhone for the best experience. It's free and takes less than a minute.
				</p>
				
				<div class="space-y-4">
					<div class="flex items-center gap-3 text-zinc-800 dark:text-zinc-200">
						<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 shrink-0">
							<Share size={18} class="text-blue-500" />
						</div>
						<span class="text-sm">1. Tap the <strong>Share</strong> button at the bottom of the screen.</span>
					</div>
	
					<div class="flex items-center gap-3 text-zinc-800 dark:text-zinc-200">
						<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 shrink-0">
							<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-zinc-900 dark:text-zinc-100"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>
						</div>
						<span class="text-sm">2. Scroll down and tap <strong>Add to Home Screen</strong>.</span>
					</div>
				</div>
			</div>
		</div>
{/if}
