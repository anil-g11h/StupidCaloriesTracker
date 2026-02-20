<script lang="ts">
  import { db, type Food } from '../../../lib/db';
  import { liveQuery } from 'dexie';
  import { calculateRecipeNutrition } from '../../../lib/recipes';
  import { generateId } from '../../../lib';
  import { push } from 'svelte-spa-router';

  let recipeName = '';
  let servingCount = 1;
  let description = '';

  interface SelectedIngredient {
    food: Food;
    quantity: number;
  }
  let selectedIngredients: SelectedIngredient[] = [];
  let searchQuery = '';
  let showSearchModal = false;

  $: searchResults = searchQuery
    ? liveQuery(async () => {
        return await db.foods
          .filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
          .limit(10)
          .toArray();
      })
    : null;

  $: recipeStats = calculateRecipeNutrition(selectedIngredients);
  $: totalCalories = recipeStats.calories;
  $: totalProtein = recipeStats.protein;
  $: totalCarbs = recipeStats.carbs;
  $: totalFat = recipeStats.fat;
  $: totalWeight = recipeStats.weight;
  $: perServingCalories = totalCalories / (servingCount || 1);
  $: perServingProtein = totalProtein / (servingCount || 1);
  $: perServingCarbs = totalCarbs / (servingCount || 1);
  $: perServingFat = totalFat / (servingCount || 1);

  function addIngredient(food: Food) {
    selectedIngredients = [...selectedIngredients, { food, quantity: 1 }];
    showSearchModal = false;
    searchQuery = '';
  }
  function removeIngredient(index: number) {
    selectedIngredients = selectedIngredients.filter((_, i) => i !== index);
  }
  async function saveRecipe() {
    if (!recipeName) return alert('Please enter a recipe name');
    if (selectedIngredients.length === 0) return alert('Please add at least one ingredient');
    try {
      const recipeId = generateId();
      const now = new Date();
      const recipeFood: Food = {
        id: recipeId,
        name: recipeName,
        brand: 'Home Recipe',
        calories: recipeStats.calories,
        protein: recipeStats.protein,
        carbs: recipeStats.carbs,
        fat: recipeStats.fat,
        serving_size: recipeStats.weight,
        serving_unit: 'g',
        micros: {},
        is_recipe: true,
        created_at: now,
        updated_at: now,
        synced: 0,
        description,
        ingredients: selectedIngredients.map(i => ({ id: i.food.id, quantity: i.quantity }))
      };
      await db.foods.add(recipeFood);
      push('/foods');
    } catch (error) {
      console.error('Failed to save recipe:', error);
      alert('Failed to save recipe');
    }
  }
</script>

<div class="container mx-auto p-4 max-w-lg">
  <h1 class="text-2xl font-bold mb-6">Create New Recipe</h1>
  <form on:submit|preventDefault={saveRecipe} class="space-y-4">
    <div>
      <label class="block text-sm font-medium mb-1">Recipe Name</label>
      <input type="text" required bind:value={recipeName} class="w-full p-2 border rounded" />
    </div>
    <div>
      <label class="block text-sm font-medium mb-1">Description (optional)</label>
      <textarea bind:value={description} class="w-full p-2 border rounded"></textarea>
    </div>
    <div>
      <label class="block text-sm font-medium mb-1">Ingredients</label>
      <button type="button" class="bg-blue-500 text-white px-3 py-1 rounded mb-2" on:click={() => showSearchModal = true}>Add Ingredient</button>
      <ul class="mb-2">
        {#each selectedIngredients as ing, i}
          <li class="flex items-center justify-between mb-1">
            <span>{ing.food.name} ({ing.quantity} × {ing.food.serving_size}{ing.food.serving_unit})</span>
            <button type="button" class="text-red-500 ml-2" on:click={() => removeIngredient(i)}>&times;</button>
          </li>
        {/each}
      </ul>
    </div>
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium mb-1">Total Calories</label>
        <input type="number" value={totalCalories} readonly class="w-full p-2 border rounded bg-gray-100" />
      </div>
      <div>
        <label class="block text-sm font-medium mb-1">Total Protein (g)</label>
        <input type="number" value={totalProtein} readonly class="w-full p-2 border rounded bg-gray-100" />
      </div>
      <div>
        <label class="block text-sm font-medium mb-1">Total Carbs (g)</label>
        <input type="number" value={totalCarbs} readonly class="w-full p-2 border rounded bg-gray-100" />
      </div>
      <div>
        <label class="block text-sm font-medium mb-1">Total Fat (g)</label>
        <input type="number" value={totalFat} readonly class="w-full p-2 border rounded bg-gray-100" />
      </div>
    </div>
    <button type="submit" class="w-full bg-green-600 text-white py-3 rounded-lg text-sm font-semibold hover:bg-green-700 active:bg-green-800 transition shadow-sm mt-2">
      Save Recipe
    </button>
  </form>
  {#if showSearchModal}
    <div class="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div class="bg-white p-6 rounded shadow-lg max-w-md w-full">
        <h2 class="text-lg font-bold mb-2">Add Ingredient</h2>
        <input type="text" placeholder="Search foods..." bind:value={searchQuery} class="w-full p-2 border rounded mb-2" />
        <div class="max-h-48 overflow-y-auto">
          {#if searchResults}
            {#each $searchResults as food}
              <div class="p-2 hover:bg-gray-100 cursor-pointer" on:click={() => addIngredient(food)}>{food.name}</div>
            {/each}
          {:else}
            <div class="text-gray-500">Type to search foods...</div>
          {/if}
        </div>
        <button class="mt-4 text-sm text-gray-600" on:click={() => showSearchModal = false}>Close</button>
      </div>
    </div>
  {/if}
</div>
