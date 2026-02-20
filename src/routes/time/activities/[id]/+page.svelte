<script lang="ts">
import { page } from '$app/stores';
import { db } from '$lib/db';
import { goto } from '$app/navigation';
import { base } from '$app/paths';
import { onMount } from 'svelte';
import { generateId } from '$lib';

let id = $page.params.id;
let isNew = id === 'new';

let name = $state('');
let calories = $state(0);
let category = $state('');
let targetDuration = $state<number | undefined>(undefined);
let targetType = $state<'min' | 'max'>('min');

onMount(async () => {
  if (!isNew) {
    const activity = await db.activities.get(id);
    if (activity) {
      name = activity.name;
      calories = activity.calories_per_hour;
      category = activity.category || '';
      targetDuration = activity.target_duration_minutes;
      targetType = activity.target_type || 'min';
    }
  }
});

async function save() {
  const activityData = {
    name,
    calories_per_hour: calories,
    category: category || 'Uncategorized',
    target_duration_minutes: targetDuration,
    target_type: targetType,
  };

  if (isNew) {
    await db.activities.add({
      id: generateId(),
      ...activityData,
      synced: 0,
      created_at: new Date(),
      updated_at: new Date()
    });
  } else {
    await db.activities.update(id, {
      ...activityData,
      updated_at: new Date(),
      synced: 0
    });
  }
  goto(`${base}/time/activities`);
}
</script>

<div class="px-4 py-6 max-w-lg mx-auto">
  <h1 class="text-2xl font-bold mb-6 text-text-main">{isNew ? 'New Activity' : 'Edit Activity'}</h1>

  <div class="space-y-6">
    <div>
      <label for="name" class="block text-sm font-medium text-text-muted mb-2">Name</label>
      <input id="name" bind:value={name} class="w-full p-3 rounded-xl border border-border-subtle bg-card text-text-main" placeholder="e.g. Running" />
    </div>

    <div>
      <label for="category" class="block text-sm font-medium text-text-muted mb-2">Category</label>
      <input 
        id="category" 
        list="categories" 
        bind:value={category} 
        class="w-full p-3 rounded-xl border border-border-subtle bg-card text-text-main" 
        placeholder="Select or type a category" 
      />
      <datalist id="categories">
        <option value="Work"></option>
        <option value="Rest"></option>
        <option value="Leisure"></option>
        <option value="Chore"></option>
        <option value="Health"></option>
        <option value="Other"></option>
      </datalist>
    </div>

    <div>
      <label for="calories" class="block text-sm font-medium text-text-muted mb-2">Calories / Hour (Optional)</label>
      <input id="calories" type="number" bind:value={calories} class="w-full p-3 rounded-xl border border-border-subtle bg-card text-text-main" />
    </div>

    <div class="space-y-4 pt-4 border-t border-border-subtle">
      <h2 class="font-medium text-lg text-text-main">Goal Settings</h2>
      
      <div>
        <label for="targetDuration" class="block text-sm font-medium text-text-muted mb-2">Daily Goal (Minutes)</label>
        <input 
          id="targetDuration" 
          type="number" 
          bind:value={targetDuration} 
          class="w-full p-3 rounded-xl border border-border-subtle bg-card text-text-main" 
          placeholder="e.g. 60"
        />
      </div>

      <div>
        <span class="block text-sm font-medium text-text-muted mb-2">Goal Type</span>
        <div class="flex gap-4">
          <label class="flex items-center gap-2 cursor-pointer text-text-main">
            <input 
              type="radio" 
              name="targetType" 
              value="min" 
              bind:group={targetType} 
              class="w-5 h-5 accent-brand"
            />
            <span>Minimum (at least)</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer text-text-main">
            <input 
              type="radio" 
              name="targetType" 
              value="max" 
              bind:group={targetType} 
              class="w-5 h-5 accent-black"
            />
            <span>Maximum (limit)</span>
          </label>
        </div>
      </div>
    </div>

    <div class="pt-4 flex gap-3">
      <button onclick={save} class="flex-1 bg-black text-white py-3 rounded-xl font-medium">Save</button>
      <a href="{base}/time/activities" class="px-6 py-3 rounded-xl border border-zinc-200 font-medium">Cancel</a>
    </div>
  </div>
</div>
