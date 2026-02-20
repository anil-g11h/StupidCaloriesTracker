<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { db, type Food } from '$lib/db';
  import { liveQuery } from 'dexie';
  import { ESSENTIAL_AMINO_ACIDS, VITAMINS, MINERALS, MACRO_DETAILS } from '$lib/constants';
  import { MICRO_NUTRIENTS } from '$lib/constants';
  import FoodSelector from '$lib/components/FoodSelector.svelte';
  import { calculateRecipeNutrition } from '$lib/recipes';
  import { generateId } from '$lib';

  let id = $derived($page.params.id);

  let food = $state<Food | undefined>(undefined);
  // Store ingredients with their full food object for calculation
  let ingredients = $state<{id: string, food: Food, quantity: number}[]>([]); 

  let showFoodSelector = $state(false);
  let initialized = $state(false);
  let isDirty = $state(false); // Track if user has modified form to prevent overwriting

  // Local Form State
  let name = $state('');
  let brand = $state('');
  let calories = $state(0);
  let protein = $state(0);
  let carbs = $state(0);
  let fat = $state(0);
  // Micros
  let microValues = $state<Record<string, number>>({});
  
  let servingSize = $state(100);
  let servingUnit = $state('g');

  // Derived check if it effectively is a recipe
  let isRecipe = $derived(ingredients.length > 0);

  // Subscribe to the food data
  const data = liveQuery(async () => {
    if (!id) return null;
    const f = await db.foods.get(id);
    if (!f) return null;

    // Get ingredients if any
    const ingrLinks = await db.food_ingredients.where('parent_food_id').equals(id).toArray();
    
    // We need to fetch the actual food items for these ingredients to get their macros
    const fullIngredients = await Promise.all(ingrLinks.map(async (link) => {
      const ingredientFood = await db.foods.get(link.child_food_id);
      return {
        id: link.id, // The link ID
        food: ingredientFood!, // Assuming it exists
        quantity: link.quantity
      };
    }));

    return { food: f, ingredients: fullIngredients };
  });

  // Sync state when data loads (only initially or if not dirty)
  $effect(() => {
    if ($data && !initialized) {
        food = $data.food;
        ingredients = $data.ingredients.filter(i => !!i.food); // Safety filter

        // Populate form
        name = food.name;
        brand = food.brand || '';
        calories = food.calories;
        protein = food.protein;
        carbs = food.carbs;
        fat = food.fat;
        servingSize = food.serving_size || 100;
        servingUnit = food.serving_unit || 'g';
        
        // Populate micros
        microValues = {};
        if (food.micros) {
            Object.entries(food.micros).forEach(([k, v]) => {
                if (typeof v === 'number') microValues[k] = v;
            });
        }
        
        // If it's a recipe, we might want to recalculate to be sure, 
        // OR we trust the DB. 
        // The user wants "batch" abstraction. 
        // If we trust the DB, we just load. 
        // But if we edit ingredients, we recalculate.
        initialized = true;
    }
  });

  // React to ingredient changes to update macros
  function recalculateFromIngredients() {
      if (ingredients.length > 0) {
          const stats = calculateRecipeNutrition(ingredients);
          calories = stats.calories;
          protein = stats.protein;
          carbs = stats.carbs;
          fat = stats.fat;
          servingSize = stats.weight;
          servingUnit = 'g'; // Force grams for accurate batch weight
          
          // Update micros
          microValues = stats.micros;
      }
  }

  // Add ingredient
  function addIngredient(selectedFood: Food) {
      // Create a temporary ID for the UI list
      const newIng = {
          id: generateId(), // Temp ID
          food: selectedFood,
          quantity: 1 // Default 1 serving (or 1 unit of serving size)
      };
      ingredients = [...ingredients, newIng];
      recalculateFromIngredients();
      showFoodSelector = false;
      isDirty = true;
  }

  function removeIngredient(index: number) {
      ingredients = ingredients.filter((_, i) => i !== index);
      recalculateFromIngredients();
      isDirty = true;
  }

  function updateIngredientQuantity(index: number, newQty: number) {
      ingredients[index].quantity = newQty;
      recalculateFromIngredients();
      isDirty = true;
  }

  async function handleSave() {
    if (!id) return;

    try {
        const now = new Date();
        
        // Prepare updates
        const updates: Partial<Food> = {
            name,
            brand,
            calories,
            protein,
            carbs,
            fat,
            serving_size: servingSize,
            serving_unit: servingUnit,
            micros: microValues,
            updated_at: now,
            synced: 0 // Mark for sync
        };

        if (isRecipe) {
            updates.is_recipe = true;
        }

        await db.foods.update(id, updates);

        // Handle ingredients
        // We delete all existing and recreate (simplest strategy for now)
        // Or diff them.
        // Let's delete all for this food_id and re-add.
        // Warn: This changes IDs of links, might affect sync if sync relies on link IDs.
        // Given offline-first nature, this is usually okay if sync handles it.
        // A better approach is to keep IDs if they exist.
        
        // Current loaded ingredients have 'id' which might be from DB or temp.
        // DB ingredients have ids.
        // Let's just do a clean swipe for simplicity as requested by "allow editing".
        
        const existingLinks = await db.food_ingredients.where('parent_food_id').equals(id).toArray();
        const existingIds = existingLinks.map(l => l.id);
        
        // However, blindly deleting might cause sync churn.
        // Let's try to be smart? No, KISS.
        await db.food_ingredients.bulkDelete(existingIds);
        
        const newLinks = ingredients.map(ing => ({
            id: generateId(), // Generate new IDs for links
            parent_food_id: id,
            child_food_id: ing.food.id,
            quantity: ing.quantity,
            created_at: now, // Ideally preserve if possible, but new link = new creation
            synced: 0
        }));
        
        await db.food_ingredients.bulkAdd(newLinks);

        goto('/foods');
    } catch (e) {
        console.error("Failed to save", e);
        alert("Failed to save changes");
    }
  }

  async function handleDelete() {
      if (!id) return;
      if (!confirm('Are you sure you want to delete this food?')) return;
      
      // Delete ingredients first
      const links = await db.food_ingredients.where('parent_food_id').equals(id).toArray();
      await db.food_ingredients.bulkDelete(links.map(l => l.id));
      
      // Delete food
      await db.foods.delete(id);
      goto('/foods');
  }

  function handleCancel() {
      goto('/foods');
  }

  // Micros helper
  function updateMicro(key: string, val: string) {
      const num = parseFloat(val);
      if (!isNaN(num)) {
          microValues[key] = num;
          if (isRecipe) {
             // For recipes, micros are calculated. 
             // Should we allow override?
             // Usually no, as it breaks consistency.
             // But let's allow it in UI, but recalculateFromIngredients will overwrite it if ingredients change.
          }
      }
  }
</script>

<div class="max-w-xl mx-auto pb-24">
  <div class="flex items-center gap-4 mb-6">
    <button onclick={handleCancel} class="p-2 -ml-2 text-text-muted hover:text-text-main" aria-label="Cancel">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
    </button>
    <h1 class="text-2xl font-bold text-text-main">Edit {isRecipe ? 'Recipe' : 'Food'}</h1>
  </div>

  {#if !initialized}
    <div class="p-8 text-center text-text-muted">Loading...</div>
  {:else}
    <form class="space-y-6" onsubmit={(e) => { e.preventDefault(); handleSave(); }}>
      
      <!-- Basic Info -->
      <div class="bg-card p-5 rounded-2xl shadow-sm border border-border-subtle space-y-4">
        <div>
          <label for="name" class="block text-sm font-medium text-text-muted mb-1">Name</label>
          <input
            type="text"
            id="name"
            bind:value={name}
            class="w-full text-lg font-medium bg-transparent border-0 border-b border-border-subtle text-text-main focus:ring-0 px-0 py-2 placeholder-text-muted/50"
            placeholder="e.g., Banana"
          />
        </div>
        <div>
          <label for="brand" class="block text-sm font-medium text-text-muted mb-1">Brand (Optional)</label>
          <input
            type="text"
            id="brand"
            bind:value={brand}
            class="w-full bg-transparent border-0 border-b border-border-subtle text-text-main focus:ring-0 px-0 py-2 placeholder-text-muted/50"
            placeholder="e.g., Chiquita"
          />
        </div>
      </div>

      <!-- Ingredients Section (Recipe Mode) -->
      <div class="bg-card p-5 rounded-2xl shadow-sm border border-border-subtle space-y-4">
        <div class="flex justify-between items-center">
            <h2 class="font-semibold text-text-main">Ingredients</h2>
            <button 
                type="button"
                onclick={() => showFoodSelector = true}
                class="text-sm font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
            >
                + Add Ingredient
            </button>
        </div>

        {#if ingredients.length === 0}
            <div class="text-center py-6 text-text-muted text-sm bg-surface rounded-xl border border-dashed border-border-subtle">
                No ingredients added. <br> Add ingredients to create a recipe.
            </div>
        {:else}
            <div class="space-y-3">
                {#each ingredients as ing, i}
                    <div class="flex items-center justify-between gap-3 bg-surface p-3 rounded-xl">
                        <div class="flex-1">
                            <div class="font-medium text-text-main">{ing.food.name}</div>
                            <div class="text-xs text-text-muted">
                                {ing.food.calories} kcal / {ing.food.serving_size}{ing.food.serving_unit}
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                             <input 
                                type="number" 
                                min="0.1" 
                                step="any"
                                value={ing.quantity}
                                oninput={(e) => updateIngredientQuantity(i, parseFloat(e.currentTarget.value))}
                                class="w-16 text-center text-sm p-1 rounded border border-border-subtle bg-card text-text-main focus:border-emerald-500 focus:ring-0"
                             />
                             <span class="text-xs text-text-muted">servings</span>
                        </div>
                        <button 
                            type="button"
                            onclick={() => removeIngredient(i)}
                            class="text-text-muted hover:text-text-main" aria-label="Remove ingredient">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                    </div>
                {/each}
                <div class="pt-2 border-t border-border-subtle mt-2">
                     <p class="text-xs text-text-muted text-center">
                        Total {isRecipe ? 'Batch' : ''} Weight: <span class="font-medium text-text-main">{servingSize} {servingUnit}</span>
                     </p>
                </div>
            </div>
        {/if}
      </div>

      <!-- Macros -->
      <div class="bg-card p-5 rounded-2xl shadow-sm border border-border-subtle space-y-6">
        <h2 class="font-semibold text-text-main">Nutrition Facts</h2>
        
        {#if isRecipe}
            <div class="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 p-3 rounded-lg mb-4">
                Values calculated from ingredients (Total Batch).
            </div>
        {/if}

        <div class="grid grid-cols-2 gap-4">
          <div class="col-span-2">
            <label for="calories" class="block text-sm font-medium text-text-main mb-1">Calories</label>
            <div class="relative">
              <input
                type="number"
                id="calories"
                bind:value={calories}
                readonly={isRecipe}
                class="w-full text-lg font-medium bg-surface border-0 border-b border-border-subtle focus:ring-0 px-3 py-2 rounded-t-lg {isRecipe ? 'text-text-muted' : 'text-text-main'}"
              />
              <span class="absolute right-3 top-2.5 text-text-muted text-sm">kcal</span>
            </div>
          </div>

          <div>
            <label for="protein" class="block text-xs font-medium text-text-muted mb-1 uppercase tracking-wider">Protein</label>
            <div class="relative">
              <input
                type="number"
                id="protein"
                bind:value={protein}
                readonly={isRecipe}
                class="w-full bg-surface border-0 border-b border-border-subtle focus:ring-0 px-3 py-2 rounded-t-lg {isRecipe ? 'text-text-muted' : 'text-text-main'}"
              />
              <span class="absolute right-3 top-2.5 text-text-muted text-xs">g</span>
            </div>
          </div>

          <div>
            <label for="carbs" class="block text-xs font-medium text-text-muted mb-1 uppercase tracking-wider">Carbs</label>
            <div class="relative">
              <input
                type="number"
                id="carbs"
                bind:value={carbs}
                readonly={isRecipe}
                class="w-full bg-surface border-0 border-b border-border-subtle focus:ring-0 px-3 py-2 rounded-t-lg {isRecipe ? 'text-text-muted' : 'text-text-main'}"
              />
              <span class="absolute right-3 top-2.5 text-text-muted text-xs">g</span>
            </div>
          </div>

          <div>
            <label for="fat" class="block text-xs font-medium text-text-muted mb-1 uppercase tracking-wider">Fat</label>
            <div class="relative">
              <input
                type="number"
                id="fat"
                bind:value={fat}
                readonly={isRecipe}
                class="w-full bg-zinc-50 border-0 border-b border-zinc-200 focus:ring-0 px-3 py-2 rounded-t-lg {isRecipe ? 'text-zinc-500' : ''}"
              />
              <span class="absolute right-3 top-2.5 text-zinc-400 text-xs">g</span>
            </div>
          </div>
          
           <!-- Serving Size Input (Only editable if NOT a recipe) -->
           <div>
            <label for="servingSize" class="block text-xs font-medium text-zinc-500 mb-1 uppercase tracking-wider">Serving Size</label>
            <div class="relative">
              <input
                type="number"
                id="servingSize"
                bind:value={servingSize}
                readonly={isRecipe}
                class="w-full bg-surface border-0 border-b border-border-subtle focus:ring-0 px-3 py-2 rounded-t-lg text-text-main {isRecipe ? 'text-text-muted' : ''}"
              />
               <span class="absolute right-3 top-2.5 text-text-muted text-xs">{servingUnit}</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Micro Nutrients (Optional check) -->
       <details class="bg-card p-5 rounded-2xl shadow-sm border border-border-subtle group">
          <summary class="font-semibold text-text-main cursor-pointer list-none flex justify-between items-center">
              <span>Detailed Nutrients</span>
              <span class="text-text-muted group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <div class="pt-4 grid grid-cols-2 gap-x-4 gap-y-4">
              <h3 class="col-span-2 font-medium text-text-muted mt-2">Essential Amino Acids</h3>
              {#each ESSENTIAL_AMINO_ACIDS as amino}
                  <div>
                      <label for={amino} class="block text-xs text-text-muted mb-1">{amino} (g)</label>
                      <input 
                          type="number"
                          id={amino}
                          value={microValues[amino] || ''}
                          oninput={(e) => updateMicro(amino, e.currentTarget.value)}
                          readonly={isRecipe}
                          placeholder="-"
                          class="w-full bg-surface border-border-subtle rounded-lg text-text-main text-sm focus:ring-emerald-500 focus:border-emerald-500 disabled:text-text-muted"
                      />
                  </div>
              {/each}

              <h3 class="col-span-2 font-medium text-text-muted mt-2">Vitamins</h3>
              {#each VITAMINS as v}
                  <div>
                      <label for={v.key} class="block text-xs text-text-muted mb-1">{v.name} ({v.unit})</label>
                      <input 
                          type="number"
                          id={v.key}
                          value={microValues[v.key] || ''}
                          oninput={(e) => updateMicro(v.key, e.currentTarget.value)}
                          readonly={isRecipe}
                          placeholder="-"
                          class="w-full bg-surface border-border-subtle rounded-lg text-text-main text-sm focus:ring-emerald-500 focus:border-emerald-500 disabled:text-text-muted"
                      />
                  </div>
              {/each}

              <h3 class="col-span-2 font-medium text-text-muted mt-2">Minerals</h3>
              {#each MINERALS as m}
                  <div>
                      <label for={m.key} class="block text-xs text-text-muted mb-1">{m.name} ({m.unit})</label>
                      <input 
                          type="number"
                          id={m.key}
                          value={microValues[m.key] || ''}
                          oninput={(e) => updateMicro(m.key, e.currentTarget.value)}
                          readonly={isRecipe}
                          placeholder="-"
                          class="w-full bg-surface border-border-subtle rounded-lg text-text-main text-sm focus:ring-emerald-500 focus:border-emerald-500 disabled:text-text-muted"
                      />
                  </div>
              {/each}
              
              <h3 class="col-span-2 font-medium text-text-muted mt-2">Other Macros</h3>
              {#each MACRO_DETAILS as m}
                  <div>
                      <label for={m.key} class="block text-xs text-text-muted mb-1">{m.name} ({m.unit})</label>
                      <input 
                          type="number"
                          id={m.key}
                          value={microValues[m.key] || ''}
                          oninput={(e) => updateMicro(m.key, e.currentTarget.value)}
                          readonly={isRecipe}
                          placeholder="-"
                          class="w-full bg-surface border-border-subtle rounded-lg text-text-main text-sm focus:ring-emerald-500 focus:border-emerald-500 disabled:text-text-muted"
                      />
                  </div>
              {/each}
          </div>
       </details>

      <!-- Actions -->
      <div class="flex gap-4 pt-4">
        <button
          type="submit"
          class="flex-1 bg-emerald-500 text-white py-3 px-4 rounded-xl font-medium shadow-sm hover:bg-emerald-600 active:scale-[0.98] transition-all"
        >
          Save Changes
        </button>
        <button
          type="button"
          onclick={handleCancel}
          class="flex-1 bg-card text-text-main border border-border-subtle py-3 px-4 rounded-xl font-medium shadow-sm hover:bg-surface active:scale-[0.98] transition-all"
        >
          Cancel
        </button>
      </div>

      <div class="pt-6">
        <button
          type="button"
          onclick={handleDelete}
          class="w-full text-rose-600 dark:text-rose-500 py-3 px-4 rounded-xl font-medium hover:bg-rose-50 dark:hover:bg-rose-900/20 active:scale-[0.98] transition-all text-sm"
        >
          Delete Food
        </button>
      </div>
    </form>
  {/if}
  
  {#if showFoodSelector}
    <FoodSelector 
        on:select={(e) => addIngredient(e.detail)} 
        on:close={() => showFoodSelector = false} 
    />
  {/if}
</div>
