<script lang="ts">
  import { db, type Food } from '$lib/db';
  import { liveQuery } from 'dexie';
  import { goto } from '$app/navigation';
  import { calculateRecipeNutrition } from '$lib/recipes';
  import { generateId } from '$lib';

  // Recipe basic info
  let recipeName = '';
  // Removed servingCount as we default to Batch Total
  let servingCount = 1;
  let description = '';

  // Ingredient management
  interface SelectedIngredient {
    food: Food;
    quantity: number; // The multiplier of the base serving size or grams
  }

  let selectedIngredients: SelectedIngredient[] = [];
  
  // Search state for adding ingredients
  let searchQuery = '';
  let showSearchModal = false;

  // Live query for searching foods to add
  $: searchResults = liveQuery(async () => {
    if (!searchQuery) return [];
    return await db.foods
      .filter(f => 
        f.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .limit(10)
      .toArray();
  });

  // Calculated totals
  $: recipeStats = calculateRecipeNutrition(selectedIngredients);
  
  // Display per serving (optional, for UI only)
  // Taking total weight (g) and assuming standard 100g reference?
  // Or just show total batch stats? Let's show Batch stats to be clear.
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
    // Default quantity is 1 (which means 1 serving or 1 unit of whatever the food is)
    // If the food has a serving size of 100g, quantity 1 = 100g.
    // If we want to be more precise, we could ask the user. For now, default to 1.
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

      // Create Food as defined by the Batch (Sum of ingredients)
      const recipeFood: Food = {
        id: recipeId,
        name: recipeName,
        brand: 'Home Recipe',
        calories: recipeStats.calories,
        protein: recipeStats.protein,
        carbs: recipeStats.carbs,
        fat: recipeStats.fat,
        micros: recipeStats.micros,
        serving_size: recipeStats.weight, // Total Batch Weight
        serving_unit: 'g',
        is_recipe: true,
        created_at: now,
        updated_at: now,
        synced: 0
      };

      await db.foods.add(recipeFood);

      // Create Ingredients
      const ingredients = selectedIngredients.map(item => ({
        id: generateId(),
        parent_food_id: recipeId,
        child_food_id: item.food.id,
        quantity: item.quantity, // This is the amount used in the TOTAL recipe
        created_at: now,
        synced: 0
      }));

      await db.food_ingredients.bulkAdd(ingredients);

      goto('/foods');
    } catch (err) {
      console.error('Error saving recipe:', err);
      alert('Failed to save recipe');
    }
  }
</script>

<div class="container mx-auto p-4 max-w-2xl">
  <h1 class="text-2xl font-bold mb-6">Create New Recipe</h1>

  <!-- Recipe Details -->
  <div class="bg-white p-4 rounded shadow mb-6 space-y-4">
    <div>
      <label for="recipe-name" class="block text-sm font-medium mb-1 text-text-main">Recipe Name</label>
      <input id="recipe-name" type="text" bind:value={recipeName} placeholder="E.g. Mom's Spaghetti" class="w-full p-2 border border-border-subtle rounded bg-card text-text-main" />
    </div>
    
    <div>
      <label for="serving-count" class="block text-sm font-medium mb-1 text-text-main">Number of Servings</label>
      <input id="serving-count" type="number" min="1" bind:value={servingCount} class="w-full p-2 border border-border-subtle rounded bg-card text-text-main" />
      <p class="text-sm text-text-muted mt-1">
        This determines the nutritional values for "1 serving" of this recipe.
      </p>
    </div>
  </div>

  <!-- Ingredients List -->
  <div class="bg-card p-4 rounded shadow mb-6 border border-border-subtle">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-lg font-semibold text-text-main">Ingredients</h2>
      <button 
        class="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
        onclick={() => showSearchModal = true}
      >
        + Add Ingredient
      </button>
    </div>

    {#if selectedIngredients.length === 0}
      <p class="text-text-muted text-center py-4">No ingredients added yet.</p>
    {:else}
      <div class="space-y-3">
        {#each selectedIngredients as item, i}
          <div class="flex items-center justify-between border-b border-border-subtle pb-2 last:border-0 last:pb-0">
             <div class="flex-1">
               <div class="font-medium text-text-main">{item.food.name}</div>
               <div class="text-xs text-text-muted">
                 {item.food.calories} kcal, P:{item.food.protein}g, C:{item.food.carbs}g, F:{item.food.fat}g (per 1 unit)
               </div>
             </div>
             
             <div class="flex items-center space-x-2">
                <div class="flex items-center">
                  <span class="text-sm mr-2 text-text-muted">Qty:</span>
                  <input 
                    type="number" 
                    step="0.1" 
                    min="0"
                    bind:value={item.quantity} 
                    class="w-20 p-1 border border-border-subtle rounded text-right bg-card text-text-main"
                  />
                </div>
                <button 
                  class="text-red-500 hover:text-red-700 font-bold px-2"
                  onclick={() => removeIngredient(i)}
                >
                  ✕
                </button>
             </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Summary -->
  <div class="bg-surface p-4 rounded border border-border-subtle mb-6">
    <h3 class="font-bold mb-2 text-text-main">Recipe Totals</h3>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
      <div>
        <div class="text-2xl font-bold text-text-main">{Math.round(totalCalories)}</div>
        <div class="text-xs uppercase text-text-muted font-semibold">Total Cals</div>
      </div>
      <div>
        <div class="text-xl font-semibold text-text-muted">{totalProtein.toFixed(1)}g</div>
        <div class="text-xs uppercase text-text-muted">Protein</div>
      </div>
      <div>
        <div class="text-xl font-semibold text-text-muted">{totalCarbs.toFixed(1)}g</div>
        <div class="text-xs uppercase text-text-muted">Carbs</div>
      </div>
      <div>
        <div class="text-xl font-semibold text-text-muted">{totalFat.toFixed(1)}g</div>
        <div class="text-xs uppercase text-text-muted">Fat</div>
      </div>
    </div>
    
    <div class="mt-4 pt-4 border-t border-border-subtle">
      <h3 class="font-bold mb-2 text-text-main">Per Serving ({servingCount})</h3>
       <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        <div>
          <div class="text-2xl font-bold text-blue-600">{Math.round(perServingCalories)}</div>
          <div class="text-xs uppercase text-text-muted font-semibold">Cals / Srv</div>
        </div>
        <div>
          <div class="text-xl font-semibold text-blue-500">{perServingProtein.toFixed(1)}g</div>
          <div class="text-xs uppercase text-text-muted">Prot / Srv</div>
        </div>
        <div>
          <div class="text-xl font-semibold text-blue-500">{perServingCarbs.toFixed(1)}g</div>
          <div class="text-xs uppercase text-text-muted">Carbs / Srv</div>
        </div>
        <div>
          <div class="text-xl font-semibold text-blue-500">{perServingFat.toFixed(1)}g</div>
          <div class="text-xs uppercase text-gray-500">Fat / Srv</div>
        </div>
      </div>
    </div>
  </div>

  <div class="flex justify-end gap-3">
     <a href="#/foods" class="px-5 py-2 border rounded hover:bg-gray-100">Cancel</a>
     <button 
       onclick={saveRecipe}
       class="px-5 py-2 bg-green-600 text-white font-bold rounded hover:bg-green-700 shadow"
     >
       Save Recipe
     </button>
  </div>
</div>

<!-- Search Modal -->
{#if showSearchModal}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
    <div class="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
      <div class="p-4 border-b flex justify-between items-center bg-gray-50">
        <h3 class="font-bold text-lg">Add Ingredient</h3>
        <button onclick={() => showSearchModal = false} class="text-gray-500 hover:text-gray-700">✕</button>
      </div>
      
      <div class="p-4 border-b">
        <input 
          type="text" 
          bind:value={searchQuery}
          placeholder="Search for food..."
          class="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>
      
      <div class="overflow-y-auto flex-1 p-2">
        {#if $searchResults && $searchResults.length > 0}
          <div class="space-y-1">
             {#each $searchResults as food}
               <button 
                 class="w-full text-left p-3 hover:bg-blue-50 rounded flex justify-between items-center group"
                 onclick={() => addIngredient(food)}
               >
                 <div>
                   <div class="font-medium group-hover:text-blue-700">{food.name}</div>
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
{/if}
