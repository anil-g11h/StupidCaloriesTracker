<script lang="ts">
  import { db, type WorkoutExerciseDef } from '$lib/db';
  import { liveQuery } from 'dexie';
  import { page } from '$app/stores';
import { goto } from '$app/navigation';
import { base } from '$app/paths';
  import { Search, Plus, ArrowLeft } from 'lucide-svelte';
  import { generateId } from '$lib';
  import { METRIC_TYPES, type MetricType } from '$lib/workouts';

  let workoutId = $page.url.searchParams.get('workoutId');
  let searchTerm = $state('');
  
  let exercises = $state<WorkoutExerciseDef[]>([]);
  let isCreating = $state(false);

  // New Exercise Form State
  let newName = $state('');
  let newMuscle = $state('Chest');
  let newEquipment = $state('Barbell');
  let newMetric = $state<MetricType>('weight_reps');
  
  const MUSCLE_GROUPS = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio', 'Other'];
  const EQUIPMENT_TYPES = ['Barbell', 'Dumbbell', 'Machine', 'Cable', 'Bodyweight', 'Kettlebell', 'Band', 'None'];

  $effect(() => {
    const sub = liveQuery(async () => {
      const all = await db.workout_exercises_def.toArray();
      // Simple client-side filter
      if (!searchTerm) {
          // If creating, allow searching to filter list background but sorting matters
          return all.sort((a,b) => a.name.localeCompare(b.name));
      }
      
      const lower = searchTerm.toLowerCase();
      return all.filter(e => 
          e.name.toLowerCase().includes(lower) || 
          (e.muscle_group && e.muscle_group.toLowerCase().includes(lower))
      ).sort((a,b) => a.name.localeCompare(b.name));
    }).subscribe(data => {
      exercises = data;
      
      if (data.length === 0 && !searchTerm) {
          seedDefaults();
      }
    });
    return () => sub.unsubscribe();
  });

  async function seedDefaults() {
      const defaults = [
          { name: 'Bench Press', muscle_group: 'Chest', equipment: 'Barbell', metric_type: 'weight_reps' },
          { name: 'Squat', muscle_group: 'Legs', equipment: 'Barbell', metric_type: 'weight_reps' },
          { name: 'Deadlift', muscle_group: 'Back', equipment: 'Barbell', metric_type: 'weight_reps' },
          { name: 'Overhead Press', muscle_group: 'Shoulders', equipment: 'Barbell', metric_type: 'weight_reps' },
          { name: 'Pull Up', muscle_group: 'Back', equipment: 'Bodyweight', metric_type: 'weighted_bodyweight' },
          { name: 'Running', muscle_group: 'Cardio', equipment: 'None', metric_type: 'distance_duration' }
      ];
      
      await db.transaction('rw', db.workout_exercises_def, async () => {
          for (const d of defaults) {
              await db.workout_exercises_def.add({
                  id: generateId(),
                  user_id: null, // Public/Global
                  name: d.name,
                  muscle_group: d.muscle_group,
                  equipment: d.equipment,
                  metric_type: d.metric_type,
                  created_at: new Date(),
                  synced: 0
              });
          }
      });
  }

  async function selectExercise(exercise: WorkoutExerciseDef) {
      if (workoutId) {
          // Add to workout
          // Find max sort order
          const existing = await db.workout_log_entries.where('workout_id').equals(workoutId).toArray();
          const maxOrder = existing.reduce((max, e) => Math.max(max, e.sort_order || 0), 0);
          
          await db.workout_log_entries.add({
              id: generateId(),
              workout_id: workoutId,
              exercise_id: exercise.id,
              sort_order: maxOrder + 1,
              created_at: new Date(),
              synced: 0
          });
          
          goto(`${base}/workouts/${workoutId}`);
      } else {
          // Edit mode could go here
          alert(`Selected ${exercise.name}`);
      }
  }

  function startCreate() {
      newName = searchTerm;
      isCreating = true;
  }

  async function saveNewExercise() {
      if (!newName) return;
      
      const id = generateId();
      await db.workout_exercises_def.add({
          id,
          user_id: 'current-user',
          name: newName,
          muscle_group: newMuscle,
          equipment: newEquipment,
          metric_type: newMetric,
          created_at: new Date(),
          synced: 0
      });
      
      isCreating = false;
      searchTerm = '';
      
      // If currently picking for workout, auto-select it
      if (workoutId) {
          const ex = await db.workout_exercises_def.get(id);
          if (ex) selectExercise(ex);
      }
  }
</script>

<div class="pb-24 pt-4 px-4 max-w-md mx-auto min-h-screen bg-background">
  {#if isCreating}
      <!-- Create Exercise Form -->
      <div class="fixed inset-0 bg-background z-50 p-4 flex flex-col">
          <div class="flex items-center mb-6">
              <button onclick={() => isCreating = false} class="mr-4 text-text-primary p-2 -ml-2">
                  <ArrowLeft />
              </button>
              <h2 class="text-xl font-bold">New Exercise</h2>
          </div>

          <div class="space-y-6 flex-1 overflow-y-auto pb-20">
              <div>
                  <label for="exercise-name" class="block text-xs font-semibold text-text-muted uppercase mb-2">Name</label>
                  <input id="exercise-name" type="text" bind:value={newName} class="w-full bg-surface p-3 rounded-xl border border-border-subtle focus:border-brand focus:ring-0 text-lg" placeholder="e.g. Bulgarian Split Squat" />
              </div>

              <div>
                  <label for="exercise-target-muscle" class="block text-xs font-semibold text-text-muted uppercase mb-2">Target Muscle</label>
                  <div class="flex flex-wrap gap-2">
                      {#each MUSCLE_GROUPS as m}
                          <button 
                              class="px-3 py-1.5 rounded-full text-sm font-medium border transition-colors {newMuscle === m ? 'bg-brand text-white border-brand' : 'bg-surface border-border-subtle text-text-muted'}"
                              onclick={() => newMuscle = m}
                          >
                              {m}
                          </button>
                      {/each}
                  </div>
              </div>

              <div>
                  <label for="exercise-equipment" class="block text-xs font-semibold text-text-muted uppercase mb-2">Equipment</label>
                  <div class="flex flex-wrap gap-2">
                      {#each EQUIPMENT_TYPES as e}
                          <button 
                              class="px-3 py-1.5 rounded-full text-sm font-medium border transition-colors {newEquipment === e ? 'bg-brand text-white border-brand' : 'bg-surface border-border-subtle text-text-muted'}"
                              onclick={() => newEquipment = e}
                          >
                              {e}
                          </button>
                      {/each}
                  </div>
              </div>

              <div>
                  <label for="exercise-tracking-type" class="block text-xs font-semibold text-text-muted uppercase mb-2">Tracking Type</label>
                  <div class="bg-surface rounded-xl border border-border-subtle overflow-hidden">
                    <select id="exercise-tracking-type" bind:value={newMetric} class="w-full bg-transparent p-3 text-base focus:ring-0 border-none outline-none">
                        {#each Object.entries(METRIC_TYPES) as [key, label]}
                            <option value={key}>{label}</option>
                        {/each}
                    </select>
                  </div>
                  <p class="text-xs text-text-muted mt-2 px-1">
                      Determines which inputs (Weight, Reps, Time, Distance) you'll track.
                  </p>
              </div>
          </div>

          <div class="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border-subtle">
              <button 
                  onclick={saveNewExercise} 
                  disabled={!newName}
                  class="w-full py-3 bg-brand text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                  Save Exercise
              </button>
          </div>
      </div>
  {:else}
      <!-- List View -->
      <div class="flex items-center gap-3 mb-6">
        {#if workoutId}
            <a href="{base}/workouts/{workoutId}" class="p-2 -ml-2 text-text-muted hover:text-text-primary">
                <ArrowLeft size={20} />
            </a>
        {/if}
        <h1 class="text-xl font-bold flex-1">{workoutId ? 'Add Exercise' : 'Exercises'}</h1>
      </div>

      <div class="mb-4 relative">
        <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted" size={18} />
        <input 
            type="text" 
            placeholder="Search exercises..." 
            bind:value={searchTerm}
            class="w-full pl-10 pr-4 py-3 bg-surface rounded-xl border-transparent focus:border-brand focus:ring-0"
        />
      </div>

      <div class="space-y-2">
          {#each exercises as exercise (exercise.id)}
            <button 
                class="w-full text-left bg-card p-4 rounded-xl border border-border-subtle hover:border-brand transition-colors flex justify-between items-center group"
                onclick={() => selectExercise(exercise)}
            >
                <div>
                    <div class="font-bold text-base group-hover:text-brand transition-colors">{exercise.name}</div>
                    <div class="text-xs text-text-muted mt-0.5 opacity-70">
                        {exercise.muscle_group || 'Other'} • {exercise.equipment || 'Any'}
                        {#if exercise.metric_type}
                             • {METRIC_TYPES[exercise.metric_type] || exercise.metric_type}
                        {/if}
                    </div>
                </div>
                {#if workoutId}
                    <div class="w-8 h-8 rounded-full bg-surface-secondary flex items-center justify-center text-brand group-hover:bg-brand group-hover:text-white transition-colors">
                        <Plus size={18} />
                    </div>
                {/if}
            </button>
          {/each}

          {#if exercises.length === 0 && searchTerm}
            <div class="text-center py-12 text-text-muted">
                <p>No exercises found for "{searchTerm}"</p>
            </div>
          {/if}
          
          <button 
            onclick={startCreate} 
            class="w-full py-4 text-brand font-bold flex items-center justify-center gap-2 mt-4 border-2 border-dashed border-border-subtle rounded-xl hover:border-brand hover:bg-surface-secondary transition-all"
          >
            <Plus size={18} />
            Create "{searchTerm}"
          </button>
      </div>
  {/if}
</div>
