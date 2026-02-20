import { db, type WorkoutLogEntry, type WorkoutSet, type Workout } from '$lib/db';

export type MetricType = 
  | 'weight_reps' 
  | 'reps_only' 
  | 'weighted_bodyweight' 
  | 'duration' 
  | 'duration_weight' 
  | 'distance_duration' 
  | 'distance_weight';

export const METRIC_TYPES: Record<MetricType, string> = {
  weight_reps: 'Weight & Reps',
  reps_only: 'Reps Only',
  weighted_bodyweight: 'Weighted Bodyweight',
  duration: 'Duration',
  duration_weight: 'Duration & Weight',
  distance_duration: 'Distance & Duration',
  distance_weight: 'Distance & Weight'
};

export interface MetricInputConfig {
  weight: boolean;
  reps: boolean;
  distance: boolean;
  duration: boolean;
  bodyweight: boolean;
}

export function getMetricConfig(type: string = 'weight_reps'): MetricInputConfig {
  switch (type) {
    case 'reps_only':
      return { weight: false, reps: true, distance: false, duration: false, bodyweight: false };
    case 'weighted_bodyweight':
      return { weight: true, reps: true, distance: false, duration: false, bodyweight: true }; // Treat as weight added
    case 'duration':
      return { weight: false, reps: false, distance: false, duration: true, bodyweight: false };
    case 'duration_weight':
      return { weight: true, reps: false, distance: false, duration: true, bodyweight: false };
    case 'distance_duration':
      return { weight: false, reps: false, distance: true, duration: true, bodyweight: false };
    case 'distance_weight':
      return { weight: true, reps: false, distance: true, duration: false, bodyweight: false };
    case 'weight_reps':
    default:
      return { weight: true, reps: true, distance: false, duration: false, bodyweight: false };
  }
}

export function formatSet(set: any, type: string = 'weight_reps'): string {
  if (!set) return '-';
  
  const config = getMetricConfig(type);
  const parts = [];

  if (config.weight) parts.push(`${set.weight || 0}kg`);
  if (config.reps) parts.push(`${set.reps || 0}reps`);
  if (config.distance) parts.push(`${set.distance || 0}km`); // Or m, need handling
  if (config.duration) {
      // Format seconds to mm:ss or similar
      const mins = Math.floor((set.duration_seconds || 0) / 60);
      const secs = (set.duration_seconds || 0) % 60;
      parts.push(`${mins}:${secs.toString().padStart(2, '0')}`);
  }
  
  return parts.join(' x ');
}

export async function getPreviousWorkoutSets(exerciseIds: string[], currentWorkoutDate: string): Promise<Record<string, { logEntry: WorkoutLogEntry, sets: WorkoutSet[] }>> {
  // 1. Fetch all log entries for the exercise IDs
  const logs = await db.workout_log_entries
    .where('exercise_id')
    .anyOf(exerciseIds)
    .toArray();

  if (logs.length === 0) return {};

  // 2. Fetch all related workouts to get dates
  const workoutIds = [...new Set(logs.map(l => l.workout_id))];
  const workouts = await db.workouts
    .where('id')
    .anyOf(workoutIds)
    .toArray();

  // Create lookup for workout dates
  const workoutMap = new Map<string, Workout>();
  workouts.forEach(w => workoutMap.set(w.id, w));

  // 3. Filter for workouts BEFORE currentWorkoutDate
  // and Sort by date descending
  // We want to find the MOST RECENT workout that happened BEFORE the current one
  // for EACH exercise.

  const result: Record<string, { logEntry: WorkoutLogEntry, sets: WorkoutSet[] }> = {};

  // Group logs by exerciseId
  const logsByExercise: Record<string, WorkoutLogEntry[]> = {};
  logs.forEach(log => {
      if (!logsByExercise[log.exercise_id]) {
          logsByExercise[log.exercise_id] = [];
      }
      logsByExercise[log.exercise_id].push(log);
  });

  // For each exercise, find the best log entry
  const logEntriesToFetchSetsFor: string[] = [];

  for (const exerciseId of exerciseIds) {
    const exerciseLogs = logsByExercise[exerciseId];
    if (!exerciseLogs) continue;

    // Sort logs by workout date descending
    exerciseLogs.sort((a, b) => {
      const workoutA = workoutMap.get(a.workout_id);
      const workoutB = workoutMap.get(b.workout_id);
      
      const dateA = workoutA?.start_time || '';
      const dateB = workoutB?.start_time || '';
      
      // We want descending order (latest first)
      if (dateA > dateB) return -1;
      if (dateA < dateB) return 1;
      return 0;
    });

    // Find the first log entry where workout date < currentWorkoutDate
    const previousLog = exerciseLogs.find(log => {
      const workout = workoutMap.get(log.workout_id);
      if (!workout) return false;
      return workout.start_time < currentWorkoutDate;
    });

    if (previousLog) {
      logEntriesToFetchSetsFor.push(previousLog.id);
      // Storing the log entry for now, will add sets later
      result[exerciseId] = {
         logEntry: previousLog, 
         sets: [] 
      };
    }
  }

  if (logEntriesToFetchSetsFor.length === 0) return {};

  // 4. Fetch sets for those entries
  const sets = await db.workout_sets
    .where('workout_log_entry_id')
    .anyOf(logEntriesToFetchSetsFor)
    .toArray();

  // 5. Return the map
  // Group sets by log entry id
  const setsByLogId: Record<string, WorkoutSet[]> = {};
  sets.forEach(set => {
    if (!setsByLogId[set.workout_log_entry_id]) {
      setsByLogId[set.workout_log_entry_id] = [];
    }
    setsByLogId[set.workout_log_entry_id].push(set);
  });

  // Assign sets to result
  for (const exerciseId in result) {
    const logId = result[exerciseId].logEntry.id;
    if (setsByLogId[logId]) {
      // Sort sets by set_number
      setsByLogId[logId].sort((a, b) => a.set_number - b.set_number);
      result[exerciseId].sets = setsByLogId[logId];
    }
  }

  return result;
}
