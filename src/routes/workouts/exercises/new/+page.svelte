<script lang="ts">
import { db } from '$lib/db';
import { generateId } from '../../../../lib';
import { METRIC_TYPES, type MetricType } from '../../../../lib/workouts';
import { push as goto } from 'svelte-spa-router';

let newName = '';
let newMuscle = 'Chest';
let newEquipment = 'Barbell';
let newMetric: MetricType = 'weight_reps';
const MUSCLE_GROUPS = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio', 'Other'];
const EQUIPMENT_TYPES = ['Barbell', 'Dumbbell', 'Machine', 'Cable', 'Bodyweight', 'Kettlebell', 'Band', 'None'];

async function createExercise() {
  if (!newName) return;
  await db.workout_exercises_def.add({
    id: generateId(),
    user_id: null,
    name: newName,
    muscle_group: newMuscle,
    equipment: newEquipment,
    metric_type: newMetric,
    created_at: new Date(),
    synced: 0
  });
  goto('/workouts/exercises');
}
</script>

<div class="max-w-md mx-auto pt-8 pb-24 px-4">
  <div class="bg-surface p-6 rounded-xl border border-border-subtle shadow">
    <h2 class="text-xl font-bold mb-4 text-center">Create New Exercise</h2>
    <input type="text" placeholder="Exercise name" bind:value={newName} class="w-full p-2 border rounded mb-3" />
    <select bind:value={newMuscle} class="w-full p-2 border rounded mb-3">
      {#each MUSCLE_GROUPS as group}
        <option value={group}>{group}</option>
      {/each}
    </select>
    <select bind:value={newEquipment} class="w-full p-2 border rounded mb-3">
      {#each EQUIPMENT_TYPES as eq}
        <option value={eq}>{eq}</option>
      {/each}
    </select>
    <select bind:value={newMetric} class="w-full p-2 border rounded mb-3">
      {#each METRIC_TYPES as mt}
        <option value={mt}>{mt}</option>
      {/each}
    </select>
    <button class="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold mt-2" on:click={createExercise}>
      Save Exercise
    </button>
    <button class="w-full mt-2 text-gray-500 border border-gray-300 rounded py-2 font-medium hover:bg-gray-100 transition-colors" on:click={() => goto('/workouts/exercises')}>
      Cancel
    </button>
  </div>
</div>
