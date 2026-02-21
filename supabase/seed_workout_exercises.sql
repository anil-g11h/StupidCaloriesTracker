begin;

insert into public.workout_exercises_def (
  user_id,
  name,
  muscle_group,
  secondary_muscle_groups,
  equipment,
  metric_type
)
select
  null::uuid as user_id,
  src.name,
  src.muscle_group,
  src.secondary_muscle_groups,
  src.equipment,
  src.metric_type
from (
  values
    ('Back Squat', 'Legs', array['Core']::text[], 'Barbell', 'weight_reps'),
    ('Front Squat', 'Legs', array['Core']::text[], 'Barbell', 'weight_reps'),
    ('Romanian Deadlift', 'Legs', array['Back']::text[], 'Barbell', 'weight_reps'),
    ('Conventional Deadlift', 'Back', array['Legs']::text[], 'Barbell', 'weight_reps'),
    ('Hip Thrust', 'Legs', array['Core']::text[], 'Barbell', 'weight_reps'),
    ('Leg Press', 'Legs', array[]::text[], 'Machine', 'weight_reps'),
    ('Walking Lunge', 'Legs', array['Core']::text[], 'Dumbbell', 'weight_reps'),
    ('Calf Raise', 'Legs', array[]::text[], 'Machine', 'weight_reps'),
    ('Bench Press', 'Chest', array['Shoulders', 'Arms']::text[], 'Barbell', 'weight_reps'),
    ('Incline Dumbbell Press', 'Chest', array['Shoulders', 'Arms']::text[], 'Dumbbell', 'weight_reps'),
    ('Push Up', 'Chest', array['Shoulders', 'Arms', 'Core']::text[], 'Bodyweight', 'reps_only'),
    ('Dumbbell Fly', 'Chest', array['Shoulders']::text[], 'Dumbbell', 'weight_reps'),
    ('Overhead Press', 'Shoulders', array['Arms', 'Core']::text[], 'Barbell', 'weight_reps'),
    ('Lateral Raise', 'Shoulders', array[]::text[], 'Dumbbell', 'weight_reps'),
    ('Rear Delt Fly', 'Shoulders', array['Back']::text[], 'Dumbbell', 'weight_reps'),
    ('Pull Up', 'Back', array['Arms']::text[], 'Bodyweight', 'weighted_bodyweight'),
    ('Chin Up', 'Back', array['Arms']::text[], 'Bodyweight', 'weighted_bodyweight'),
    ('Lat Pulldown', 'Back', array['Arms']::text[], 'Machine', 'weight_reps'),
    ('Barbell Row', 'Back', array['Arms']::text[], 'Barbell', 'weight_reps'),
    ('Seated Cable Row', 'Back', array['Arms']::text[], 'Cable', 'weight_reps'),
    ('Face Pull', 'Back', array['Shoulders']::text[], 'Cable', 'weight_reps'),
    ('Bicep Curl', 'Arms', array[]::text[], 'Dumbbell', 'weight_reps'),
    ('Hammer Curl', 'Arms', array[]::text[], 'Dumbbell', 'weight_reps'),
    ('Tricep Pushdown', 'Arms', array[]::text[], 'Cable', 'weight_reps'),
    ('Skull Crusher', 'Arms', array[]::text[], 'Barbell', 'weight_reps'),
    ('Plank', 'Core', array[]::text[], 'Bodyweight', 'duration'),
    ('Hanging Leg Raise', 'Core', array['Back']::text[], 'Bodyweight', 'reps_only'),
    ('Russian Twist', 'Core', array[]::text[], 'Bodyweight', 'reps_only'),
    ('Mountain Climber', 'Core', array['Cardio']::text[], 'Bodyweight', 'duration'),
    ('Running', 'Cardio', array[]::text[], 'None', 'distance_duration'),
    ('Cycling', 'Cardio', array[]::text[], 'None', 'distance_duration'),
    ('Rowing', 'Cardio', array['Back', 'Legs']::text[], 'Machine', 'distance_duration'),
    ('Jump Rope', 'Cardio', array['Legs']::text[], 'Bodyweight', 'duration'),
    ('Farmer Carry', 'Core', array['Arms', 'Back']::text[], 'Dumbbell', 'distance_weight')
) as src(name, muscle_group, secondary_muscle_groups, equipment, metric_type)
where not exists (
  select 1
  from public.workout_exercises_def e
  where e.user_id is null
    and lower(e.name) = lower(src.name)
);

commit;
