<script lang="ts">
  import { db, type Goal, type BodyMetric } from '$lib/db';
  import { liveQueryStore } from '$lib/stores/liveQuery';
  import { onMount, onDestroy } from 'svelte';
  import Chart from 'chart.js/auto';
  import { generateId } from '$lib';
  import { supabase } from '$lib/supabaseClient';
  import Auth from '$lib/components/Auth.svelte';
  // --- Auth Logic ---
  let session: any = null;
  let loading = true;

  onMount(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      session = s;
      loading = false;
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, _session) => {
      session = _session;
    });
    return () => subscription.unsubscribe();
  });

  // --- Goals Logic ---
  let isEditingGoal = false;
  interface GoalForm {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    sleep: number | null;
    water: number | null;
    weight: number | null;
  }
  let goalForm: GoalForm = {
    calories: 2000,
    protein: 150,
    carbs: 200,
    fat: 65,
    sleep: 8,
    water: 2000,
    weight: 70
  };
  const activeGoal = liveQueryStore(async () => {
    const goals = await db.goals.orderBy('start_date').reverse().toArray();
    return goals.length > 0 ? goals[0] : null;
  });
  $: if ($activeGoal && !isEditingGoal) {
    goalForm = {
      calories: $activeGoal.calories_target,
      protein: $activeGoal.protein_target,
      carbs: $activeGoal.carbs_target,
      fat: $activeGoal.fat_target,
      sleep: $activeGoal.sleep_target ?? 8,
      water: $activeGoal.water_target ?? 2000,
      weight: $activeGoal.weight_target ?? 70
    };
  }
  async function saveGoal() {
    const today = new Date().toISOString().split('T')[0];
    try {
      const existingToday = await db.goals.where({ start_date: today }).first();
      const newGoal: Goal = {
        id: existingToday?.id || generateId(),
        user_id: session?.user?.id || 'local-user',
        start_date: today,
        calories_target: goalForm.calories,
        protein_target: goalForm.protein,
        carbs_target: goalForm.carbs,
        fat_target: goalForm.fat,
        sleep_target: goalForm.sleep ?? undefined,
        water_target: goalForm.water ?? undefined,
        weight_target: goalForm.weight ?? undefined,
        synced: 0,
        created_at: new Date()
      };
      await db.goals.put(newGoal);
      isEditingGoal = false;
    } catch (error) {
      console.error('Failed to save goal:', error);
      alert('Failed to save goal');
    }
  }

  // --- Metrics Logic ---
  let metricForm = {
    type: 'weight',
    value: 0,
    unit: 'kg',
    date: new Date().toISOString().split('T')[0]
  };
  async function addMetric() {
    try {
      const newMetric: BodyMetric = {
        id: generateId(),
        user_id: session?.user?.id || 'local-user',
        date: metricForm.date,
        type: metricForm.type,
        value: Number(metricForm.value),
        unit: metricForm.unit,
        synced: 0,
        created_at: new Date()
      };
      await db.metrics.put(newMetric);
      metricForm.value = 0;
    } catch (error) {
      console.error('Failed to add metric:', error);
      alert('Failed to add metric');
    }
  }

  // --- Chart Logic ---
  let chartCanvas: HTMLCanvasElement | undefined;
  let chartInstance: Chart | null = null;
  const weightHistory = liveQueryStore(async () => {
    return await db.metrics.where('type').equals('weight').sortBy('date');
  });
  function updateChart() {
    if (!chartCanvas || !$weightHistory) return;
    const labels = $weightHistory.map(m => m.date);
    const data = $weightHistory.map(m => m.value);
    if (chartInstance) {
      chartInstance.data.labels = labels;
      chartInstance.data.datasets[0].data = data;
      chartInstance.update();
    } else {
      const computedStyle = getComputedStyle(document.documentElement);
      const gridColor = computedStyle.getPropertyValue('--color-border-subtle').trim() || '#e4e4e7';
      const textColor = computedStyle.getPropertyValue('--color-text-muted').trim() || '#71717a';
      chartInstance = new Chart(chartCanvas, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'Weight',
            data: data,
            borderColor: 'rgb(75, 192, 192)',
            tension: 0.1,
            fill: false
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: false,
              grid: { color: gridColor },
              ticks: { color: textColor }
            },
            x: {
              grid: { color: gridColor },
              ticks: { color: textColor }
            }
          },
          plugins: {
            legend: { labels: { color: textColor } }
          }
        }
      });
    }
  }
  $: if ($weightHistory && chartCanvas) updateChart();
  onMount(() => { if ($weightHistory) updateChart(); });
  onDestroy(() => { if (chartInstance) chartInstance.destroy(); });
</script>

<div class="space-y-6 pb-20">
  <header class="flex justify-between items-center bg-card p-4 shadow-sm border-b border-border-subtle sticky top-0 z-10">
    <h1 class="text-xl font-bold text-text-main">Profile & Goals</h1>
    {#if session}
      <button 
        class="text-sm font-medium text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors bg-red-50 dark:bg-red-900/20 px-3 py-1 rounded-full" 
        on:click={() => supabase.auth.signOut()}
      >
        Sign Out
      </button>
    {/if}
  </header>
  {#if !session && !loading}
    <div class="px-4 max-w-lg mx-auto mt-10">
      <Auth />
    </div>
  {:else if session}
    <div class="px-4 space-y-6 max-w-lg mx-auto">
      <section class="bg-card p-5 rounded-xl shadow-sm border border-border-subtle">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-semibold text-text-main">Daily Targets</h2>
          <button 
            class="text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full" 
            on:click={() => isEditingGoal = !isEditingGoal}
          >
            {isEditingGoal ? 'Cancel' : 'Edit'}
          </button>
        </div>
        {#if isEditingGoal}
          <form on:submit|preventDefault={saveGoal} class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-1">
                <label for="calories" class="text-xs font-medium text-text-muted uppercase tracking-wide">Calories</label>
                <input id="calories" type="number" bind:value={goalForm.calories} class="w-full rounded-lg border-border-subtle bg-surface text-text-main focus:bg-card focus:border-blue-500 focus:ring-blue-500 text-sm transition-all" />
              </div>
              <div class="space-y-1">
                <label for="protein" class="text-xs font-medium text-text-muted uppercase tracking-wide">Protein (g)</label>
                <input id="protein" type="number" bind:value={goalForm.protein} class="w-full rounded-lg border-border-subtle bg-surface text-text-main focus:bg-card focus:border-blue-500 focus:ring-blue-500 text-sm transition-all" />
              </div>
              <div class="space-y-1">
                <label for="carbs" class="text-xs font-medium text-text-muted uppercase tracking-wide">Carbs (g)</label>
                <input id="carbs" type="number" bind:value={goalForm.carbs} class="w-full rounded-lg border-border-subtle bg-surface text-text-main focus:bg-card focus:border-blue-500 focus:ring-blue-500 text-sm transition-all" />
              </div>
              <div class="space-y-1">
                <label for="fat" class="text-xs font-medium text-text-muted uppercase tracking-wide">Fat (g)</label>
                <input id="fat" type="number" bind:value={goalForm.fat} class="w-full rounded-lg border-border-subtle bg-surface text-text-main focus:bg-card focus:border-blue-500 focus:ring-blue-500 text-sm transition-all" />
              </div>
              <div class="space-y-1">
                <label for="sleep" class="text-xs font-medium text-text-muted uppercase tracking-wide">Sleep (hours)</label>
                <input id="sleep" type="number" step="0.5" bind:value={goalForm.sleep} class="w-full rounded-lg border-border-subtle bg-surface text-text-main focus:bg-card focus:border-blue-500 focus:ring-blue-500 text-sm transition-all" />
              </div>
              <div class="space-y-1">
                <label for="water" class="text-xs font-medium text-text-muted uppercase tracking-wide">Water (ml)</label>
                <input id="water" type="number" step="50" bind:value={goalForm.water} class="w-full rounded-lg border-border-subtle bg-surface text-text-main focus:bg-card focus:border-blue-500 focus:ring-blue-500 text-sm transition-all" />
              </div>
              <div class="space-y-1 col-span-2">
                <label for="weight" class="text-xs font-medium text-text-muted uppercase tracking-wide">Weight Goal</label>
                <input id="weight" type="number" step="0.1" bind:value={goalForm.weight} class="w-full rounded-lg border-border-subtle bg-surface text-text-main focus:bg-card focus:border-blue-500 focus:ring-blue-500 text-sm transition-all" />
              </div>
            </div>
            <button type="submit" class="w-full bg-blue-600 text-white py-3 rounded-lg text-sm font-semibold hover:bg-blue-700 active:bg-blue-800 transition shadow-sm mt-2">
              Save Goals
            </button>
          </form>
        {:else if $activeGoal}
          <div class="grid grid-cols-2 gap-3">
            <div class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl text-center border border-blue-100 dark:border-blue-900/30 flex flex-col justify-center">
              <span class="text-2xl font-bold text-blue-700 dark:text-blue-400 leading-none">{$activeGoal.calories_target}</span>
              <span class="text-[10px] font-bold text-blue-400 dark:text-blue-300 uppercase tracking-wider mt-1">Calories</span>
            </div>
            <div class="bg-surface p-4 rounded-xl text-center border border-border-subtle flex flex-col justify-center">
              <span class="text-2xl font-bold text-text-main leading-none">{$activeGoal.protein_target}g</span>
              <span class="text-[10px] font-bold text-text-muted uppercase tracking-wider mt-1">Protein</span>
            </div>
            <div class="bg-surface p-4 rounded-xl text-center border border-border-subtle flex flex-col justify-center">
              <span class="text-2xl font-bold text-text-main leading-none">{$activeGoal.carbs_target}g</span>
              <span class="text-[10px] font-bold text-text-muted uppercase tracking-wider mt-1">Carbs</span>
            </div>
            <div class="bg-surface p-4 rounded-xl text-center border border-border-subtle flex flex-col justify-center">
              <span class="text-2xl font-bold text-text-main leading-none">{$activeGoal.fat_target}g</span>
              <span class="text-[10px] font-bold text-text-muted uppercase tracking-wider mt-1">Fat</span>
            </div>
            <div class="bg-surface p-4 rounded-xl text-center border border-border-subtle flex flex-col justify-center">
              <span class="text-2xl font-bold text-text-main leading-none">{$activeGoal.sleep_target || '-'} <span class="text-sm font-normal text-text-muted">h</span></span>
              <span class="text-[10px] font-bold text-text-muted uppercase tracking-wider mt-1">Sleep</span>
            </div>
            <div class="bg-surface p-4 rounded-xl text-center border border-border-subtle flex flex-col justify-center">
              <span class="text-2xl font-bold text-text-main leading-none">{$activeGoal.water_target || '-'} <span class="text-sm font-normal text-text-muted">ml</span></span>
              <span class="text-[10px] font-bold text-text-muted uppercase tracking-wider mt-1">Water</span>
            </div>
            <div class="bg-surface p-4 rounded-xl text-center border border-border-subtle flex flex-col justify-center col-span-2">
              <span class="text-2xl font-bold text-text-main leading-none">{$activeGoal.weight_target || '-'}</span>
              <span class="text-[10px] font-bold text-text-muted uppercase tracking-wider mt-1">Weight Goal</span>
            </div>
          </div>
        {:else}
          <div class="text-center py-8 bg-surface rounded-xl border border-dashed border-border-subtle">
            <p class="text-text-muted text-sm mb-3">No nutritional goals set yet.</p>
            <button 
              class="text-white bg-blue-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm transition"
              on:click={() => isEditingGoal = true}
            >
              Set Goals
            </button>
          </div>
        {/if}
      </section>
      <section class="bg-card p-5 rounded-xl shadow-sm border border-border-subtle space-y-6">
        <h2 class="text-lg font-semibold text-text-main border-b border-border-subtle pb-3">Body Metrics</h2>
        <form on:submit|preventDefault={addMetric} class="space-y-4 bg-surface p-4 rounded-xl border border-border-subtle">
          <div class="grid grid-cols-2 gap-4">
            <div class="col-span-1 space-y-1">
              <label for="metric-type" class="text-xs font-medium text-text-muted uppercase tracking-wide">Type</label>
              <select id="metric-type" bind:value={metricForm.type} class="block w-full rounded-lg border-border-subtle bg-card text-text-main shadow-sm focus:border-green-500 focus:ring-green-500 text-sm py-2">
                <option value="weight">Weight</option>
                <option value="waist">Waist</option>
                <option value="chest">Chest</option>
                <option value="hips">Hips</option>
                <option value="body_fat">Body Fat %</option>
              </select>
            </div>
            <div class="col-span-1 space-y-1">
              <label for="metric-date" class="text-xs font-medium text-text-muted uppercase tracking-wide">Date</label>
              <input id="metric-date" type="date" bind:value={metricForm.date} class="block w-full rounded-lg border-border-subtle bg-card text-text-main shadow-sm focus:border-green-500 focus:ring-green-500 text-sm py-2" />
            </div>
            <div class="col-span-1 space-y-1">
              <label for="metric-value" class="text-xs font-medium text-text-muted uppercase tracking-wide">Value</label>
              <div class="relative">
                <input id="metric-value" type="number" step="0.1" bind:value={metricForm.value} placeholder="0.0" class="block w-full rounded-lg border-border-subtle bg-card text-text-main shadow-sm focus:border-green-500 focus:ring-green-500 text-sm py-2" />
              </div>
            </div>
            <div class="col-span-1 space-y-1">
              <label for="metric-unit" class="text-xs font-medium text-text-muted uppercase tracking-wide">Unit</label>
              <input id="metric-unit" type="text" bind:value={metricForm.unit} placeholder="kg" class="block w-full rounded-lg border-border-subtle bg-card text-text-main shadow-sm focus:border-green-500 focus:ring-green-500 text-sm py-2" />
            </div>
          </div>
          <button type="submit" class="w-full bg-green-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 active:bg-green-800 transition shadow-sm">
            Add Entry
          </button>
        </form>
        <div class="pt-2">
          <h3 class="font-medium text-sm text-text-muted mb-3 px-1">Weight Trends</h3>
          <div class="relative h-60 w-full bg-card rounded-lg">
            <canvas bind:this={chartCanvas}></canvas>
          </div>
          {#if !$weightHistory || $weightHistory.length === 0}
            <p class="text-center text-text-muted text-xs mt-2 italic">Start logging your weight to see trends.</p>
          {/if}
        </div>
      </section>
    </div>
  {/if}
</div>
