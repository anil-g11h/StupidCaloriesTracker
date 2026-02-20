<script lang="ts">
  import { db } from '$lib/db';
  import { goto } from '$app/navigation';
  import { ESSENTIAL_AMINO_ACIDS } from '$lib/constants';
  import { generateId } from '$lib';

  let name = '';
  let brand = '';
  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;
  let serving_size = 100;
  let serving_unit = 'g';
  let micros: Record<string, number> = {};

  $: calories = Math.round(((protein || 0) * 4) + ((carbs || 0) * 4) + ((fat || 0) * 9));

  async function handleSubmit() {
    try {
      await db.foods.add({
        id: generateId(),
        name,
        brand: brand || undefined,
        calories,
        protein,
        carbs,
        fat,
        serving_size,
        serving_unit,
        micros,
        is_recipe: false,
        created_at: new Date(),
        updated_at: new Date(),
        synced: 0
      });
      goto('/foods');
    } catch (error) {
      console.error('Failed to create food:', error);
      alert('Failed to create food');
    }
  }
</script>

<div class="container mx-auto p-4 max-w-lg">
  <h1 class="text-2xl font-bold mb-6">Create New Food</h1>
  
  <form on:submit|preventDefault={handleSubmit} class="space-y-4">
    <div>
      <label for="food-name" class="block text-sm font-medium mb-1">Name</label>
      <input id="food-name" type="text" required bind:value={name} class="w-full p-2 border rounded" />
    </div>

    <div>
      <label for="food-brand" class="block text-sm font-medium mb-1">Brand (Optional)</label>
      <input id="food-brand" type="text" bind:value={brand} class="w-full p-2 border rounded" />
    </div>

    <div class="grid grid-cols-2 gap-4">
      <div>
        <label for="serving-size" class="block text-sm font-medium mb-1">Serving Size</label>
        <input id="serving-size" type="number" step="any" bind:value={serving_size} class="w-full p-2 border rounded" />
      </div>
      <div>
        <label for="serving-unit" class="block text-sm font-medium mb-1">Unit</label>
        <input id="serving-unit" type="text" bind:value={serving_unit} class="w-full p-2 border rounded" placeholder="g, ml, oz" />
      </div>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <div>
        <label for="calories" class="block text-sm font-medium mb-1">Calories (kcal)</label>
        <input id="calories" type="number" step="any" required bind:value={calories} class="w-full p-2 border rounded" />
      </div>
      <div>
        <label for="protein" class="block text-sm font-medium mb-1">Protein (g)</label>
        <input id="protein" type="number" step="any" required bind:value={protein} class="w-full p-2 border rounded" />
      </div>
      <div>
        <label for="carbs" class="block text-sm font-medium mb-1">Carbs (g)</label>
        <input id="carbs" type="number" step="any" required bind:value={carbs} class="w-full p-2 border rounded" />
      </div>
      <div>
        <label for="fat" class="block text-sm font-medium mb-1">Fat (g)</label>
        <input id="fat" type="number" step="any" required bind:value={fat} class="w-full p-2 border rounded" />
      </div>
    </div>

    <details class="group bg-surface border border-border-subtle rounded-lg p-2 mt-4">
      <summary class="font-medium cursor-pointer list-none flex justify-between items-center text-text-main">
        <span>Amino Acids / Micros</span>
        <span class="text-sm text-text-muted group-open:rotate-180 transition-transform">▼</span>
      </summary>
      <div class="grid grid-cols-2 gap-4 mt-4 text-sm">
        {#each ESSENTIAL_AMINO_ACIDS as amino}
          <div>
            <label for="amino-{amino}" class="block mb-1 text-text-muted">{amino} (g)</label>
            <input id="amino-{amino}" type="number" step="any" bind:value={micros[amino]} class="w-full p-2 border rounded" />
          </div>
        {/each}
      </div>
    </details>

    <div class="flex justify-end gap-2 pt-4">
      <a href="/foods" class="px-4 py-2 border border-border-subtle rounded text-text-main hover:bg-surface">Cancel</a>
      <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save Food</button>
    </div>
  </form>
</div>
