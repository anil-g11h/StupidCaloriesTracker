import { db } from './db';
import { generateId } from './index';

export async function startRoutineAsWorkout(routineId: string): Promise<string> {
  const routine = await db.workout_routines.get(routineId);
  if (!routine) {
    throw new Error('Routine not found');
  }

  const routineEntries = await db.workout_routine_entries
    .where('routine_id')
    .equals(routineId)
    .sortBy('sort_order');

  const routineEntryIds = routineEntries.map((entry) => entry.id);
  const routineSets = routineEntryIds.length
    ? await db.workout_routine_sets.where('routine_entry_id').anyOf(routineEntryIds).toArray()
    : [];

  const setsByEntryId = routineSets.reduce<Record<string, typeof routineSets>>((acc, set) => {
    if (!acc[set.routine_entry_id]) acc[set.routine_entry_id] = [];
    acc[set.routine_entry_id].push(set);
    return acc;
  }, {});

  Object.values(setsByEntryId).forEach((entrySets) => {
    entrySets.sort((a, b) => a.set_number - b.set_number);
  });

  const newWorkoutId = generateId();
  const now = new Date();

  await db.transaction('rw', [db.workouts, db.workout_log_entries, db.workout_sets], async () => {
    await db.workouts.add({
      id: newWorkoutId,
      user_id: routine.user_id || 'local-user',
      name: routine.name || 'Workout',
      start_time: now.toISOString(),
      created_at: now,
      synced: 0,
    });

    for (const entry of routineEntries) {
      const newEntryId = generateId();

      await db.workout_log_entries.add({
        id: newEntryId,
        workout_id: newWorkoutId,
        exercise_id: entry.exercise_id,
        sort_order: entry.sort_order,
        notes: entry.notes,
        created_at: now,
        synced: 0,
      });

      const templateSets = setsByEntryId[entry.id] || [];
      for (const templateSet of templateSets) {
        await db.workout_sets.add({
          id: generateId(),
          workout_log_entry_id: newEntryId,
          set_number: templateSet.set_number,
          weight: templateSet.weight,
          reps: templateSet.reps_max ?? templateSet.reps_min,
          reps_min: templateSet.reps_min,
          reps_max: templateSet.reps_max,
          distance: templateSet.distance,
          duration_seconds: templateSet.duration_seconds,
          completed: false,
          created_at: now,
          synced: 0,
        });
      }
    }
  });

  return newWorkoutId;
}
