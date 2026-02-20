<script lang="ts">
  import { db, type Workout } from '../../lib/db';
  import { liveQuery } from 'dexie';
  import { Plus, ChevronRight, Calendar } from 'lucide-svelte';

  let workouts: Workout[] = [];
  let subscription: any;
  function loadWorkouts() {
    if (subscription) subscription.unsubscribe?.();
    subscription = liveQuery(() => db.workouts.orderBy('start_time').reverse().toArray()).subscribe(data => {
      workouts = data;
    });
  }
  loadWorkouts();

  function formatDate(iso: string) {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  }
  function formatTime(iso: string) {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
</script>

<div class="pb-24 pt-4 px-4 max-w-md mx-auto">
  <header class="flex justify-between items-center mb-6">
    <h1 class="text-2xl font-bold">Workouts</h1>
    <a href="#/workouts/new" class="bg-brand text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-brand-dark transition-colors">
      <Plus size={18} />
      Start Workout 2
    </a>
  </header>
  {#if workouts.length === 0}
    <div class="text-center py-12 text-text-muted">
      <div class="bg-surface-secondary w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
        <Calendar size={32} />
      </div>
      <p>No workouts logged yet.</p>
      <p class="text-xs mt-1">Start tracking your progress!</p>
    </div>
  {:else}
    <div class="space-y-3">
      {#each workouts as workout (workout.id)}
        <a href={`#/workouts/${workout.id}`} class="block bg-card rounded-xl p-4 shadow-sm border border-border-subtle hover:border-brand-light transition-colors">
            <div class="flex justify-between items-start">
                <div>
                    <h3 class="font-semibold text-lg">{workout.name || 'Untitled Workout'}</h3>
                    <div class="text-xs text-text-muted mt-1 flex gap-2">
                        <span>{formatDate(workout.start_time)}</span>
                        <span>•</span>
                        <span>{formatTime(workout.start_time)}</span>
                        {#if workout.end_time}
                            <span>- {formatTime(workout.end_time)}</span>
                        {/if}
                    </div>
                </div>
                <ChevronRight size={20} class="text-text-muted" />
            </div>
        </a>
      {/each}
    </div>
  {/if}
</div>
