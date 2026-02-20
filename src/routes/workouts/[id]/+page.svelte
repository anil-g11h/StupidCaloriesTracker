<script lang="ts">
  import { db, type Workout, type WorkoutExerciseDef, type WorkoutLogEntry, type WorkoutSet } from '$lib/db';
  import { liveQuery } from 'dexie';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import { Plus, Check, Trash, MoreVertical, X, Settings, Timer, ChevronDown, ChevronUp } from 'lucide-svelte';
  import { generateId } from '$lib';
  import { getMetricConfig, getPreviousWorkoutSets, formatSet, type MetricType, METRIC_TYPES } from '$lib/workouts';

  let workoutId = $page.params.id;
  
  // Data State
  let workout = $state<Workout | undefined>(undefined);
  let exercises = $state<WorkoutLogEntry[]>([]);
  let definitions = $state<Record<string, WorkoutExerciseDef>>({});
  let sets = $state<Record<string, WorkoutSet[]>>({});
  let history = $state<Record<string, { logEntry: WorkoutLogEntry, sets: WorkoutSet[] }>>({});
  
  // UI State
  let elapsedTime = $state('00:00');
  let intervalId: any;
  let activeRestTimer = $state<{ exerciseId: string, seconds: number, total: number, endTime: number } | null>(null);
  let restTimerInterval: any;
  let expandedMenuId = $state<string | null>(null);
  let restPreferences = $state<Record<string, number>>({});
  let silentAudio: HTMLAudioElement;

  function loadRestPreferences() {
      if (!browser) return;
      try {
          const stored = localStorage.getItem('rest_timer_preferences');
          if (stored) {
              restPreferences = JSON.parse(stored);
          }
      } catch (e) {
          console.error('Failed to load rest preferences', e);
      }
  }

  function getRestTime(exerciseId: string): number {
      return restPreferences[exerciseId] || 60;
  }

  function saveRestTime(exerciseId: string, seconds: number) {
      restPreferences[exerciseId] = seconds;
      if (browser) {
          localStorage.setItem('rest_timer_preferences', JSON.stringify(restPreferences));
      }
  }

  function handleTimerAction(action: string) {
     console.log('Timer action received:', action);
     if (action === 'add-15') {
         if (activeRestTimer && activeRestTimer.seconds <= 0 && !restTimerInterval) {
             // Restart if finished
             startRestTimer(activeRestTimer.exerciseId, 15);
         } else {
             adjustRestTimer(15);
         }
     } else if (action === 'sub-15') {
         adjustRestTimer(-15);
     } else if (action === 'skip') {
         skipRestTimer();
     }
  }

  // Load initial data
  onMount(() => {
      loadRestPreferences();
      if (browser && 'serviceWorker' in navigator) {
          navigator.serviceWorker.addEventListener('message', (event) => {
             if (event.data.type === 'TIMER_ACTION') {
                 handleTimerAction(event.data.action);
             }
          });
      }
  });

  // Load static exercise definitions
  $effect(() => {
    loadRestPreferences();
    const sub = liveQuery(() => db.workout_exercises_def.toArray()).subscribe(defs => {
      const map: Record<string, WorkoutExerciseDef> = {};
      defs.forEach(d => map[d.id] = d);
      definitions = map;
    });
    return () => sub.unsubscribe();
  });

  // Load current workout
  $effect(() => {
    if (!workoutId) return;
    const sub = liveQuery(() => db.workouts.get(workoutId)).subscribe(w => {
      workout = w;
      if (w && !w.end_time) {
          startTimer();
      }
    });
    return () => sub.unsubscribe();
  });

  // Load entries for this workout
  $effect(() => {
    if (!workoutId) return;
    const sub = liveQuery(() => 
      db.workout_log_entries
        .where('workout_id').equals(workoutId)
        .sortBy('sort_order')
    ).subscribe(entries => {
      exercises = entries;
      loadHistory(entries);
    });
    return () => sub.unsubscribe();
  });

  // Load sets for all entries
  $effect(() => {
      if (exercises.length === 0) {
          sets = {};
          return; 
      }
      
      const entryIds = exercises.map(e => e.id);
      const sub = liveQuery(() => 
          db.workout_sets
            .where('workout_log_entry_id').anyOf(entryIds)
            .toArray()
      ).subscribe(allSets => {
          const newSets: Record<string, WorkoutSet[]> = {};
          exercises.forEach(e => newSets[e.id] = []);
          allSets.forEach(s => {
              if (newSets[s.workout_log_entry_id]) {
                  newSets[s.workout_log_entry_id].push(s);
              }
          });
          // Sort
          Object.keys(newSets).forEach(k => {
              newSets[k].sort((a, b) => a.set_number - b.set_number);
          });
          sets = newSets;
      });
      return () => sub.unsubscribe();
  });

  async function loadHistory(currentExercises: WorkoutLogEntry[]) {
      if (!workout?.start_time) return;
      const exerciseIds = currentExercises.map(e => e.exercise_id);
      const uniqueIds = [...new Set(exerciseIds)];
      
      try {
          // Use the helper from lib/workouts.ts
          history = await getPreviousWorkoutSets(uniqueIds, workout.start_time);
      } catch (err) {
          console.error("Failed to load history:", err);
      }
  }

  function startTimer() {
      if (intervalId) clearInterval(intervalId);
      intervalId = setInterval(() => {
          if (!workout?.start_time) return;
          const start = new Date(workout.start_time).getTime();
          const now = Date.now();
          const diff = Math.floor((now - start) / 1000);
          
          const hours = Math.floor(diff / 3600);
          const minutes = Math.floor((diff % 3600) / 60);
          const seconds = diff % 60;
          
          if (hours > 0) {
              elapsedTime = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
          } else {
              elapsedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
          }
      }, 1000);
  }

  // Rest Timer Logic
  function startRestTimer(exerciseId: string, seconds: number = 60) {
      if (restTimerInterval) clearInterval(restTimerInterval);
      
      // Request notifications
      if ('Notification' in window && Notification.permission !== 'granted') {
          Notification.requestPermission();
      }
      
      // Show notification immediately when timer starts
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
              type: 'SHOW_NOTIFICATION',
              payload: {
                  title: 'Rest Timer Started',
                  options: {
                      body: `Rest for ${seconds} seconds`,
                      icon: '/pwa-192x192.png',
                      tag: 'rest-timer',
                      requireInteraction: false,
                      actions: [
                          { action: 'skip', title: 'Skip' }
                      ],
                      data: {
                          url: window.location.href,
                          timerId: exerciseId
                      }
                  }
              }
          });
      } else {
          new Notification('Rest Timer Started', {
              body: `Rest for ${seconds} seconds`,
          });
      }

      // Start silent audio to keep background alive
      if (silentAudio) {
          silentAudio.loop = true;
          silentAudio.play().catch(() => console.log('Autoplay blocked'));
      }

      const startTime = Date.now();
      const endTime = startTime + (seconds * 1000);
      
      activeRestTimer = { exerciseId, seconds, total: seconds, endTime };
      
      restTimerInterval = setInterval(async () => {
          const now = Date.now();
          const remaining = Math.ceil((activeRestTimer.endTime - now) / 1000);
          
          if (activeRestTimer) {
              activeRestTimer.seconds = remaining > 0 ? remaining : 0;
          }

          if (remaining <= 0) {
              clearInterval(restTimerInterval);
              restTimerInterval = null;
              // Vibration
              if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
              // Stop silent audio
              if (silentAudio) {
                  silentAudio.pause();
                  silentAudio.currentTime = 0;
              }
              // Show actionable notification
              if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                  try {
                      navigator.serviceWorker.controller.postMessage({
                          type: 'SHOW_NOTIFICATION',
                          payload: {
                              title: 'Rest Timer Finished!',
                              options: {
                                  body: 'What next?',
                                  icon: '/pwa-192x192.png',
                              }
                          }
                      });
                  } catch (e) { /* ignore */ }
              }
              // Auto-close rest timer card
              activeRestTimer = null;
          }
      }, 1000);
  }

  function adjustRestTimer(seconds: number) {
      if (!activeRestTimer) return;
      // Only update seconds and total, do not restart timer
      let newSeconds = activeRestTimer.seconds + seconds;
      if (newSeconds < 0) newSeconds = 0;
      const now = Date.now();
      activeRestTimer.endTime = now + (newSeconds * 1000);
      activeRestTimer.seconds = newSeconds;
      activeRestTimer.total = Math.max(activeRestTimer.total, newSeconds);
  }

  function skipRestTimer() {
      if (restTimerInterval) clearInterval(restTimerInterval);
      // Request notifications
      if ('Notification' in window && Notification.permission !== 'granted') {
          Notification.requestPermission();
      }

      // Show notification immediately when timer starts
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
              type: 'SHOW_NOTIFICATION',
              payload: {
                  title: 'Rest Timer Started',
                  options: {
                      body: `Rest for ${seconds} seconds`,
                      icon: '/pwa-192x192.png',
                      tag: 'rest-timer',
                      requireInteraction: false,
                      actions: [
                          { action: 'skip', title: 'Skip' }
                      ],
                      data: {
                          url: window.location.href,
                          timerId: exerciseId
                      }
                  }
              }
          });
      } else {
          new Notification('Rest Timer Started', {
              body: `Rest for ${seconds} seconds`,
          });
      }

      // Start silent audio to keep background alive
      if (silentAudio) {
          silentAudio.loop = true;
          silentAudio.play().catch(() => console.log('Autoplay blocked'));
      }

      const startTime = Date.now();
      const endTime = startTime + (seconds * 1000);

      activeRestTimer = { exerciseId, seconds, total: seconds };

      restTimerInterval = setInterval(async () => {
          const now = Date.now();
          const remaining = Math.ceil((endTime - now) / 1000);

          if (activeRestTimer) {
              activeRestTimer.seconds = remaining > 0 ? remaining : 0;
          }

          if (remaining <= 0) {
              clearInterval(restTimerInterval);
              restTimerInterval = null;

              // Vibration
              if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);

              // Stop silent audio
              if (silentAudio) {
                  silentAudio.pause();
                  silentAudio.currentTime = 0;
              }

              // Show actionable notification
              if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                  try {
                      navigator.serviceWorker.controller.postMessage({
                          type: 'SHOW_NOTIFICATION',
                          payload: {
                              title: 'Rest Timer Finished!',
                              options: {
                                  body: 'What next?',
                                  icon: '/pwa-192x192.png',
                                  renotify: true,
                                  tag: 'rest-timer',
                                  requireInteraction: true,
                                  actions: [
                                      { action: 'add-15', title: '+15s' },
                                      { action: 'sub-15', title: '-15s' },
                                      { action: 'skip', title: 'Done' }
                                  ],
                                  data: {
                                      url: window.location.href,
                                      timerId: exerciseId
                                  }
                              }
                          }
                      });
                  } catch (e) {
                      console.error('Failed to show SW notification', e);
                      // Fallback
                      new Notification('Rest Timer Finished!');
                  }
              } else {
                  new Notification('Rest Timer Finished!');
              }
          }
      }, 1000);
        //            duration_seconds: last.duration_seconds
        //        };
        //   }
        // });      }
      // removed extra closing brace

    //   await db.workout_sets.add({
    //       id: generateId(),
    //       workout_log_entry_id: entry.id,
    //       set_number: setNumber,
    //       weight: defaults.weight || 0,
    //       reps: defaults.reps || 0,
    //       distance: defaults.distance || 0,
    //       duration_seconds: defaults.duration_seconds || 0,
    //       completed: false,
    //       created_at: new Date(),
    //       synced: 0
    //   });
  }

  async function toggleSetComplete(set: WorkoutSet, entryId: string, exerciseDefId: string) {
      const newStatus = !set.completed;
      await db.workout_sets.update(set.id, {
          completed: newStatus,
          synced: 0
      });
      
      // Auto-start rest timer
      if (newStatus) {
         startRestTimer(entryId, getRestTime(exerciseDefId));
      }
  }

  async function updateSet(id: string, updates: Partial<WorkoutSet>) {
      await db.workout_sets.update(id, { ...updates, synced: 0 });
  }

  function getHistoryText(exerciseId: string, setNumber: number): string {
      const h = history[exerciseId];
      if (!h || !h.sets) return '-';
      
      // Try exact match first
      const match = h.sets.find(s => s.set_number === setNumber);
      if (match) {
          const def = definitions[exerciseId];
          return formatSet(match, def?.metric_type);
      }
      return '-';
  }
  
  // Calculate Volume (simple weight * reps)
  function calculateTotalVolume() {
      let vol = 0;
      Object.values(sets).flat().forEach(s => {
          if (s.completed) {
              vol += (s.weight || 0) * (s.reps || 0);
          }
      });
      return vol;
  }
  
  function getTotalSets() {
      return Object.values(sets).flat().filter(s => s.completed).length;
  }
</script>

<div class="pb-32 pt-4 px-4 max-w-md mx-auto min-h-screen flex flex-col bg-background">
  <!-- Header -->
  <header class="mb-6 sticky top-0 bg-background z-10 py-2 border-b border-border-subtle shadow-sm -mx-4 px-4">
    <div class="flex justify-between items-center mb-2">
        <h1 class="text-xl font-bold truncate pr-2">{workout?.name || 'Workout'}</h1>
        <button onclick={finishWorkout} class="bg-brand text-white px-5 py-2 rounded-xl text-sm font-bold shadow-md hover:bg-brand-dark transition-colors">
            Finish
        </button>
    </div>
    
    <div class="flex justify-between text-xs font-semibold text-text-muted uppercase tracking-wide">
        <div class="text-center">
            <span class="block text-text-primary text-sm font-bold font-mono">{elapsedTime}</span>
            Duration
        </div>
        <div class="text-center border-l border-border-subtle pl-4">
             <span class="block text-text-primary text-sm font-bold font-mono">{calculateTotalVolume()} kg</span>
             Volume
        </div>
        <div class="text-center border-l border-border-subtle pl-4">
             <span class="block text-text-primary text-sm font-bold font-mono">{getTotalSets()}</span>
             Sets
        </div>
    </div>
  </header>

  <div class="flex-1 space-y-6">
      {#each exercises as exercise (exercise.id)}
        {@const def = definitions[exercise.exercise_id]}
        {@const config = getMetricConfig(def?.metric_type)}
        {@const currentTimer = activeRestTimer?.exerciseId === exercise.id ? activeRestTimer : null}
        
        <div class="bg-card rounded-2xl p-4 shadow-sm border border-border-subtle hover:border-brand-light transition-colors relative overflow-hidden">
            <!-- Header Row -->
            <div class="flex justify-between items-start mb-4">
                <div>
                   <h3 class="font-bold text-lg text-brand-dark leading-tight">
                        {def?.name || 'Unknown Exercise'}
                   </h3>
                   <div class="text-xs text-text-muted mt-1">
                       {def?.muscle_group || 'Other'} • {def?.metric_type ? METRIC_TYPES[def.metric_type] : 'Standard'}
                   </div>
                </div>
                
                <div class="flex items-center gap-2">
                    {#if currentTimer}
                      <button 
                        onclick={skipRestTimer}
                        class="px-2 py-1 bg-brand/10 text-brand rounded-lg text-xs font-bold font-mono animate-pulse flex items-center gap-1"
                      >
                         <Timer size={12} />
                         {Math.floor(currentTimer.seconds / 60)}:{Math.floor(currentTimer.seconds % 60).toString().padStart(2, '0')}
                      </button>
                    {/if}
                    
                    <button class="text-text-muted hover:text-brand" onclick={() => expandedMenuId = expandedMenuId === exercise.id ? null : exercise.id}>
                        <MoreVertical size={20} />
                    </button>
                </div>
            </div>
            
            {#if expandedMenuId === exercise.id}
                <div class="absolute right-4 top-12 bg-surface border border-border-subtle rounded-xl shadow-xl z-20 py-2 w-56 animate-in fade-in slide-in-from-top-2">
                    <div class="px-4 py-2 border-b border-border-subtle bg-surface-secondary/30">
                         <div class="flex items-center justify-between gap-2 mb-1">
                             <span class="text-xs font-bold text-text-muted uppercase flex items-center gap-1">
                                 <Timer size={10} /> Auto Rest (sec)
                             </span>
                         </div>
                         <input 
                            type="number" 
                            class="w-full bg-surface border border-border-subtle text-center rounded focus:border-brand focus:ring-0 outline-none tabular-nums font-bold text-sm py-1" 
                            value={getRestTime(exercise.exercise_id)}
                            onchange={(e) => saveRestTime(exercise.exercise_id, parseInt(e.currentTarget.value) || 60)}
                         />
                    </div>
                    
                    <button class="w-full text-left px-4 py-3 hover:bg-surface-secondary text-sm flex items-center gap-2 text-text-muted transition-colors">
                        <Settings size={14} /> Reorder Exercise
                    </button>
                    <button class="w-full text-left px-4 py-3 hover:bg-red-50 text-sm flex items-center gap-2 text-red-500 transition-colors border-t border-border-subtle"
                        onclick={() => { 
                             if(confirm('Remove exercise?')) {
                                 db.workout_log_entries.delete(exercise.id);
                                 exercises = exercises.filter(e => e.id !== exercise.id);
                             }
                        }}
                    >
                        <Trash size={14} /> Remove
                    </button>
                </div>
            {/if}

            <!-- Previous Workout Summary -->
            {#if history[exercise.exercise_id]}
                {@const lastLog = history[exercise.exercise_id].logEntry}
                <div class="mb-3 text-xs text-text-muted bg-surface-secondary/50 p-2 rounded-lg flex justify-between items-center">
                    <span>Last: {new Date(lastLog.created_at || new Date()).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span>
                    <span class="font-medium">
                        {history[exercise.exercise_id].sets.length} sets • best {formatSet(history[exercise.exercise_id].sets.sort((a,b) => (b.weight||0) - (a.weight||0))[0], def?.metric_type)}
                    </span>
                </div>
            {/if}
            
            <!-- Sets Grid Header -->
            <div class="grid grid-cols-12 gap-2 text-[10px] font-bold text-text-muted uppercase mb-2 px-1 tracking-wider">
                <div class="col-span-1 text-center self-end">Set</div>
                <div class="col-span-3 text-center self-end text-text-tertiary">Previous</div>
                
                {#if config.weight && config.reps}
                    <div class="col-span-3 text-center self-end">kg</div>
                    <div class="col-span-3 text-center self-end">Reps</div>
                {:else if config.duration && config.distance}
                    <div class="col-span-3 text-center self-end">km</div>
                    <div class="col-span-3 text-center self-end">Time</div>
                {:else if config.duration}
                     <div class="col-span-6 text-center self-end">Time (min:sec)</div>
                {:else if config.reps}
                     <div class="col-span-6 text-center self-end">Reps</div>
                {:else}
                    <div class="col-span-3 text-center self-end">Val 1</div>
                    <div class="col-span-3 text-center self-end">Val 2</div>
                {/if}
                
                <div class="col-span-2 text-center self-end">Done</div>
            </div>

            <!-- Sets Rows -->
            <div class="space-y-2">
                {#each sets[exercise.id] || [] as set, i (set.id)}
                    <div 
                        class="grid grid-cols-12 gap-2 items-center bg-surface/50 rounded-lg p-1 border-l-4 transition-all duration-300"
                        class:border-transparent={!set.completed}
                        class:border-green-500={set.completed}
                        class:opacity-60={set.completed}
                    >
                        <!-- Set Number -->
                        <div class="col-span-1 text-center font-bold text-text-muted text-sm">{set.set_number}</div>
                        
                        <!-- Previous History -->
                        <div class="col-span-3 text-center text-xs text-text-tertiary font-mono truncate">
                            {getHistoryText(exercise.exercise_id, set.set_number)}
                        </div>
                        
                        <!-- Inputs -->
                        {#if config.weight && config.reps}
                             <div class="col-span-3">
                                <input type="number" value={set.weight} onchange={(e) => updateSet(set.id, { weight: parseFloat(e.currentTarget.value) })}
                                    class="w-full bg-surface text-center rounded-md py-1.5 px-1 text-sm font-bold tabular-nums focus:ring-1 focus:ring-brand outline-none" placeholder="0" />
                            </div>
                            <div class="col-span-3">
                                <input type="number" value={set.reps} onchange={(e) => updateSet(set.id, { reps: parseFloat(e.currentTarget.value) })}
                                    class="w-full bg-surface text-center rounded-md py-1.5 px-1 text-sm font-bold tabular-nums focus:ring-1 focus:ring-brand outline-none" placeholder="0" />
                            </div>
                        {:else if config.duration && config.distance}
                             <div class="col-span-3">
                                <input type="number" value={set.distance} onchange={(e) => updateSet(set.id, { distance: parseFloat(e.currentTarget.value) })}
                                    class="w-full bg-surface text-center rounded-md py-1.5 px-1 text-sm font-bold tabular-nums" placeholder="km" />
                            </div>
                            <!-- Time Input could be complex, simplifying to minutes input for now or seconds? -->
                            <!-- Let's use total seconds stored, but display min? Or simple text input for simplicity? -->
                            <!-- Implementing simple text-like parser for now or minutes/seconds inputs? -->
                            <!-- Let's do simple minutes input for MVP -->
                             <div class="col-span-3 flex gap-1">
                                <input type="number" value={Math.floor((set.duration_seconds || 0)/60)} 
                                    onchange={(e) => updateSet(set.id, { duration_seconds: (parseFloat(e.currentTarget.value)*60) + ((set.duration_seconds||0)%60) })}
                                    class="w-1/2 bg-surface text-center rounded-md py-1.5 px-0 text-xs font-bold tabular-nums" placeholder="m" />
                                <input type="number" value={(set.duration_seconds || 0)%60} 
                                    onchange={(e) => updateSet(set.id, { duration_seconds: (Math.floor((set.duration_seconds||0)/60)*60) + parseFloat(e.currentTarget.value) })}
                                    class="w-1/2 bg-surface text-center rounded-md py-1.5 px-0 text-xs font-bold tabular-nums" placeholder="s" />
                            </div>
                        {:else if config.duration}
                            <div class="col-span-6 flex gap-1 items-center justify-center">
                                <input type="number" value={Math.floor((set.duration_seconds || 0)/60)} 
                                    onchange={(e) => updateSet(set.id, { duration_seconds: (parseFloat(e.currentTarget.value)*60) + ((set.duration_seconds||0)%60) })}
                                    class="w-16 bg-surface text-center rounded-md py-2 px-1 text-base font-bold tabular-nums" placeholder="min" />
                                <span class="font-bold text-text-muted">:</span>
                                <input type="number" value={(set.duration_seconds || 0)%60} 
                                    onchange={(e) => updateSet(set.id, { duration_seconds: (Math.floor((set.duration_seconds||0)/60)*60) + parseFloat(e.currentTarget.value) })}
                                    class="w-16 bg-surface text-center rounded-md py-2 px-1 text-base font-bold tabular-nums" placeholder="sec" />
                            </div>
                        {:else}
                            <!-- Default fallback to weight/reps style for others -->
                             <div class="col-span-6 text-center text-xs text-text-muted">Unsupported Metric UI</div>
                        {/if}

                        <!-- Done Button -->
                        <div class="col-span-2 flex justify-center">
                            <button 
                                class="w-8 h-8 rounded-lg flex items-center justify-center transition-all bg-surface hover:bg-surface-secondary active:scale-95 shadow-sm"
                                class:bg-green-500={set.completed}
                                class:text-white={set.completed}
                                class:shadow-none={set.completed}
                                onclick={() => toggleSetComplete(set, exercise.id, exercise.exercise_id)}
                            >
                                <Check size={18} strokeWidth={3} />
                            </button>
                        </div>
                    </div>
                {/each}
            </div>

            <button 
                onclick={() => addSet(exercise)}
                class="w-full mt-3 py-2.5 text-center text-sm font-bold text-brand bg-brand/5 hover:bg-brand/10 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
                <Plus size={16} /> Add Set
            </button>
        </div>
      {/each}

      <div class="pt-2">
        <a 
            href="{base}/workouts/exercises?workoutId={workoutId}"
            class="group flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border-subtle p-6 text-center transition-colors hover:border-brand hover:bg-brand/5"
        >
            <div class="rounded-full bg-surface-secondary p-3 transition-colors group-hover:bg-brand group-hover:text-white mb-2 text-text-muted">
                 <Plus size={24} />
            </div>
            <span class="font-bold text-text-primary">Add Exercise</span>
            <span class="text-xs text-text-muted">Search or create new</span>
        </a>
      </div>

       <button onclick={cancelWorkout} class="w-full py-4 text-red-500 text-sm font-medium mt-8 hover:bg-surface-secondary rounded-xl transition-colors">
            Discard Workout
       </button>
  </div>

  {#if activeRestTimer}
      <div 
          class="fixed bottom-[calc(3.2rem+env(safe-area-inset-bottom)+1rem)] left-4 right-4 bg-page text-text-main shadow-2xl z-50 flex flex-col items-stretch slide-in-from-bottom animate-in rounded-2xl overflow-hidden"
      >
          <!-- Progress Bar -->
          <div class="h-1.5 w-full bg-border-subtle absolute top-0 left-0 right-0 z-0">
              <div 
                  class="h-full bg-blue-500 transition-all duration-1000 ease-linear"
                  style="width: {Math.min((activeRestTimer.seconds / activeRestTimer.total) * 100, 100)}%"
              ></div>
          </div>

          <div class="flex items-center justify-between p-4 pt-6 relative z-10 w-full">
              <div class="flex flex-col">
                  <span class="text-xs uppercase font-bold text-text-muted">
                      Resting
                  </span>
                  <span class="text-3xl font-mono font-bold tabular-nums">
                      {Math.floor(activeRestTimer.seconds / 60)}:{Math.floor(activeRestTimer.seconds % 60).toString().padStart(2, '0')}
                  </span>
              </div>

              <div class="flex items-center gap-2">
                   <button onclick={() => adjustRestTimer(-15)} class="p-2 bg-surface hover:bg-surface-secondary text-text-main rounded-lg font-bold text-sm border border-border-subtle">-15</button>
                   <button onclick={() => adjustRestTimer(15)} class="p-2 bg-surface hover:bg-surface-secondary text-text-main rounded-lg font-bold text-sm border border-border-subtle">+15</button>
                   <button onclick={skipRestTimer} class="px-4 py-2 bg-red-500 text-white font-bold rounded-lg ml-2 hover:bg-red-600 shadow-sm">Skip</button>
              </div>
          </div>
      </div>
  {/if}

</div>