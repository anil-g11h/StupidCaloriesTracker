import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
// import { Plus, ChevronRight, Calendar } from 'lucide-react';
import { CalendarIcon } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import { db } from '../../lib/db';

type WorkoutSummary = {
  exercises: number;
  sets: number;
  durationMinutes: number;
  exerciseLines: Array<{
    name: string;
    sets: number;
  }>;
};

export default function WorkoutList() {
  // --- Data Fetching ---
  // Replaces the manual subscription and loadWorkouts() function
  const workouts = useLiveQuery(
    () => db.workouts.orderBy('start_time').reverse().toArray(),
    []
  );

  const workoutSummaries = useLiveQuery(async () => {
    if (!workouts?.length) return {} as Record<string, WorkoutSummary>;

    const workoutIds = workouts.map((workout) => workout.id);
    const entries = await db.workout_log_entries.where('workout_id').anyOf(workoutIds).toArray();

    const entryToWorkoutId = new Map<string, string>();
    entries.forEach((entry) => entryToWorkoutId.set(entry.id, entry.workout_id));

    const exerciseIds = [...new Set(entries.map((entry) => entry.exercise_id))];
    const exerciseDefs = exerciseIds.length
      ? await db.workout_exercises_def.where('id').anyOf(exerciseIds).toArray()
      : [];
    const exerciseNameById = new Map(exerciseDefs.map((exerciseDef) => [exerciseDef.id, exerciseDef.name]));

    const entryIds = entries.map((entry) => entry.id);
    const sets = entryIds.length
      ? await db.workout_sets.where('workout_log_entry_id').anyOf(entryIds).toArray()
      : [];

    const setCountByEntryId = new Map<string, number>();
    sets.forEach((set) => {
      setCountByEntryId.set(set.workout_log_entry_id, (setCountByEntryId.get(set.workout_log_entry_id) || 0) + 1);
    });

    const summaries: Record<string, WorkoutSummary> = {};

    workouts.forEach((workout) => {
      const durationMs = workout.end_time
        ? new Date(workout.end_time).getTime() - new Date(workout.start_time).getTime()
        : 0;

      summaries[workout.id] = {
        exercises: 0,
        sets: 0,
        durationMinutes: Math.max(0, Math.round(durationMs / 60000)),
        exerciseLines: []
      };
    });

    const sortedEntries = [...entries].sort((a, b) => a.sort_order - b.sort_order);
    sortedEntries.forEach((entry) => {
      const summary = summaries[entry.workout_id];
      if (!summary) return;

      summary.exercises += 1;
      summary.exerciseLines.push({
        name: exerciseNameById.get(entry.exercise_id) || 'Exercise',
        sets: setCountByEntryId.get(entry.id) || 0,
      });
    });

    sets.forEach((set) => {
      const workoutId = entryToWorkoutId.get(set.workout_log_entry_id);
      if (workoutId && summaries[workoutId]) {
        summaries[workoutId].sets += 1;
      }
    });

    return summaries;
  }, [workouts]);

  // --- Helper Functions ---
  const formatDate = (iso: string) => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString(undefined, { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short' 
    });
  };

  const formatTime = (iso: string) => {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatSummary = (workoutId: string) => {
    const summary = workoutSummaries?.[workoutId];
    if (!summary) return 'No exercises yet';

    const parts = [
      `${summary.exercises} ${summary.exercises === 1 ? 'exercise' : 'exercises'}`,
      `${summary.sets} ${summary.sets === 1 ? 'set' : 'sets'}`
    ];

    if (summary.durationMinutes > 0) {
      parts.push(`${summary.durationMinutes} min`);
    }

    return parts.join(' • ');
  };

  return (
    <div className="pb-24 pt-4 px-4 max-w-md mx-auto">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-text-main">Workouts</h1>
        <Link
          to="/workouts/start"
          className="h-10 w-10 rounded-full bg-brand text-white text-2xl font-semibold leading-none flex items-center justify-center hover:bg-brand-dark transition-colors shadow-sm"
          aria-label="Start workout options"
          title="Start workout options"
        >
          +
        </Link>
      </header>

      {/* Conditional Rendering */}
      {!workouts ? (
        // Loading state
        <div className="text-center py-12 text-text-muted">Loading workouts...</div>
      ) : workouts.length === 0 ? (
        <div className="text-center py-12 text-text-muted">
          <div className="bg-surface-secondary w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <CalendarIcon size={32} />
          </div>
          <p className="font-medium">No workouts logged yet.</p>
          <p className="text-xs mt-1">Start tracking your progress!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {workouts.map((workout) => (
            <Link
              key={workout.id}
              to={`/workouts/${workout.id}`}
              className="block bg-card rounded-2xl p-5 shadow-sm border border-border-subtle hover:border-brand-light transition-all active:scale-[0.98]"
            >
              <div>
                <h3 className="font-semibold text-lg text-text-main">
                  {workout.name || 'Untitled Workout'}
                </h3>
                <div className="text-xs text-text-muted mt-1 flex gap-2">
                  <span>{formatDate(workout.start_time)}</span>
                  <span>•</span>
                  <span>{formatTime(workout.start_time)}</span>
                  {workout.end_time && (
                    <span>- {formatTime(workout.end_time)}</span>
                  )}
                </div>

                <p className="text-xs text-text-muted mt-2">
                  {formatSummary(workout.id)}
                </p>

                {(() => {
                  const lines = workoutSummaries?.[workout.id]?.exerciseLines || [];
                  const visibleLines = lines.slice(0, 3);
                  const remainingCount = Math.max(0, lines.length - visibleLines.length);

                  if (!lines.length) return null;

                  return (
                    <div className="mt-3 rounded-xl border border-border-subtle bg-surface p-3">
                      <div className="space-y-1.5">
                        {visibleLines.map((line, index) => (
                          <p key={`${line.name}-${index}`} className="text-sm text-text-main">
                            <span className="font-semibold">{line.sets} set{line.sets === 1 ? '' : 's'}</span>{' '}
                            {line.name}
                          </p>
                        ))}
                        {remainingCount > 0 && (
                          <p className="text-xs text-text-muted font-medium">
                            See {remainingCount} more exercise{remainingCount === 1 ? '' : 's'}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}