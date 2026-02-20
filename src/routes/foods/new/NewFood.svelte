<script lang="ts">
  import { db } from '$lib/db';
  import { ESSENTIAL_AMINO_ACIDS } from '$lib/constants';
  import { generateId } from '$lib';
  import { push } from 'svelte-spa-router';

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
      push('/foods');
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
    <!-- Optionally add micronutrients and amino acids here -->
    <button type="submit" class="w-full bg-blue-600 text-white py-3 rounded-lg text-sm font-semibold hover:bg-blue-700 active:bg-blue-800 transition shadow-sm mt-2">
      Save Food
    </button>
  </form>
</div>
