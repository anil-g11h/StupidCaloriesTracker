<script lang="ts">
	import { liveQuery } from 'dexie';
	import { db, type Food } from '$lib/db';
	import { createEventDispatcher, onMount } from 'svelte';

	const dispatch = createEventDispatcher<{ select: Food; close: null }>();

	let searchQuery = '';
	let searchInput: HTMLInputElement;

	$: searchResults = liveQuery(async () => {
		if (!searchQuery) return [];
		return await db.foods
			.filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
			.limit(10)
			.toArray();
	});

	function select(food: Food) {
		dispatch('select', food);
		searchQuery = '';
	}

  onMount(() => {
    if (searchInput) {
      searchInput.focus();
    }
  });
</script>

<div class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
	<div class="bg-card rounded-lg shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
		<div class="p-4 border-b border-border-subtle flex justify-between items-center bg-surface">
			<h3 class="font-bold text-lg text-text-main">Add Ingredient</h3>
			<button on:click={() => dispatch('close')} class="text-text-muted hover:text-text-main">✕</button>
		</div>

		<div class="p-4 border-b border-border-subtle">
			<input
				type="text"
				bind:this={searchInput}
				bind:value={searchQuery}
				placeholder="Search for food..."
				class="w-full p-2 border border-border-subtle rounded bg-card text-text-main focus:ring-2 focus:ring-blue-500 focus:outline-none"
			/>
		</div>

		<div class="overflow-y-auto flex-1 p-2">
			{#if $searchResults && $searchResults.length > 0}
				<div class="space-y-1">
					{#each $searchResults as food}
						<button
							class="w-full text-left p-3 hover:bg-blue-50 rounded flex justify-between items-center group"
							on:click={() => select(food)}
						>
							<div>
								<div class="font-medium group-hover:text-blue-700">{food.name} {food.brand ? `(${food.brand})` : ''}</div>
								<div class="text-xs text-gray-500">
									{food.calories} kcal • P:{food.protein} • C:{food.carbs} • F:{food.fat}
								</div>
							</div>
							<div class="text-blue-500 text-sm font-semibold opacity-0 group-hover:opacity-100">
								Add +
							</div>
						</button>
					{/each}
				</div>
			{:else if searchQuery}
				<div class="p-4 text-center text-gray-500">No foods found matching "{searchQuery}"</div>
			{:else}
				<div class="p-4 text-center text-gray-400 text-sm">Type to search...</div>
			{/if}
		</div>
	</div>
</div>
