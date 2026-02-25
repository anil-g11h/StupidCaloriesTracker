alter table public.daily_logs
  add column if not exists meal_time text;

alter table public.daily_logs
  drop constraint if exists daily_logs_meal_time_check;

alter table public.daily_logs
  add constraint daily_logs_meal_time_check
  check (
    meal_time is null
    or meal_time ~ '^([01]?[0-9]|2[0-3]):[0-5][0-9]$'
  );
