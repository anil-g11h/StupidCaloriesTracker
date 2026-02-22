import { db } from './db';

export type WorkoutMediaEntry = {
  sourceId: string;
  videoPath: string;
  thumbnailPath: string | null;
};

const normalizeName = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const mediaNameFromVideoPath = (videoPath: string) => {
  const file = videoPath.split('/').pop() || videoPath;
  const noExt = file.replace(/\.mp4$/i, '');
  const noPrefix = noExt.replace(/^\d+-/, '');
  const noSuffix = noPrefix.replace(/-(chest|back|thighs|shoulders|shoulder|upper-arms|lower-arms|waist|hips|calves|plyometrics)$/i, '');
  const noGender = noSuffix.replace(/-(female|male)$/i, '');
  return normalizeName(noGender.replace(/-/g, ' '));
};

let syncCompleted = false;
let runningSync: Promise<number> | null = null;

export async function syncWorkoutExerciseThumbnailPaths(mediaEntries: WorkoutMediaEntry[]): Promise<number> {
  if (syncCompleted) return 0;
  if (runningSync) return runningSync;

  runningSync = (async () => {
    const entriesWithImages = mediaEntries.filter((entry) => Boolean(entry.thumbnailPath));
    if (!entriesWithImages.length) {
      syncCompleted = true;
      return 0;
    }

    const bySourceId = new Map(entriesWithImages.map((entry) => [entry.sourceId, entry]));
    const byNormalizedName = entriesWithImages.map((entry) => ({
      entry,
      normalizedName: mediaNameFromVideoPath(entry.videoPath),
    }));

    const exercises = await db.workout_exercises_def.toArray();
    const updates: Array<{ id: string; thumbnailPath: string }> = [];

    for (const exercise of exercises) {
      if (exercise.thumbnail_path) continue;

      let matched = exercise.source_id ? bySourceId.get(exercise.source_id) : undefined;
      if (!matched) {
        const normalizedExerciseName = normalizeName(exercise.name || '');
        matched = byNormalizedName.find((item) =>
          item.normalizedName === normalizedExerciseName ||
          item.normalizedName.includes(normalizedExerciseName) ||
          normalizedExerciseName.includes(item.normalizedName)
        )?.entry;
      }

      if (matched?.thumbnailPath) {
        updates.push({
          id: exercise.id,
          thumbnailPath: matched.thumbnailPath,
        });
      }
    }

    if (!updates.length) {
      syncCompleted = true;
      return 0;
    }

    await db.transaction('rw', db.workout_exercises_def, async () => {
      for (const update of updates) {
        await db.workout_exercises_def.update(update.id, {
          thumbnail_path: update.thumbnailPath,
          updated_at: new Date(),
        });
      }
    });

    syncCompleted = true;
    return updates.length;
  })();

  try {
    return await runningSync;
  } finally {
    runningSync = null;
  }
}
