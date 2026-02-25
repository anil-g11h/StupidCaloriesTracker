alter table public.daily_logs
  drop constraint if exists daily_logs_meal_type_check;

alter table public.daily_logs
  add constraint daily_logs_meal_type_check
  check (length(trim(coalesce(meal_type, ''))) > 0);
