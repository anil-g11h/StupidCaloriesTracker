<script lang="ts">
  import { liveQuery } from 'dexie';
  import { db } from '../../../lib/db';

  let activities: any[] = [];

  let subscription: any;
  function loadActivities() {
    if (subscription) subscription.unsubscribe?.();
    subscription = liveQuery(() => db.activities.toArray()).subscribe(acts => {
      activities = acts;
    });
  }
  loadActivities();

  async function deleteActivity(id: string) {
    if (confirm('Are you sure you want to delete this activity?')) {
      await db.activities.delete(id);
    }
  }
</script>

<div class="px-4 py-6 max-w-lg mx-auto">
  <div class="flex items-center justify-between mb-6">
    <h1 class="text-2xl font-bold text-text-main">Manage Activities</h1>
    <a href="#/time" class="text-sm font-medium text-text-muted hover:text-text-main">Done</a>
  </div>
  <div class="space-y-4">
    {#each activities as activity}
      <div class="bg-card p-4 rounded-2xl border border-border-subtle shadow-sm flex items-center justify-between">
        <div>
          <div class="font-semibold text-text-main">{activity.name}</div>
          <div class="text-sm text-text-muted">{activity.calories_per_hour} cal/hr</div>
        </div>
        <div class="flex gap-2">
            <a href={`#/time/activities/${activity.id}`} class="text-sm px-3 py-1 bg-surface rounded-lg text-text-muted hover:bg-surface/80 hover:text-text-main">Edit</a>
            <button on:click={() => deleteActivity(activity.id)} class="text-sm px-3 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40">Delete</button>
        </div>
      </div>
    {/each}
    <a href="#/time/activities/new" class="block w-full py-4 rounded-2xl border-2 border-dashed border-border-subtle text-text-muted font-medium text-center hover:border-brand hover:text-text-main transition-all">
      + Create New Activity
    </a>
  </div>
</div>
