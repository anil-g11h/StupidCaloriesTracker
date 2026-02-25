-- Prevent deleting foods that are referenced by daily_logs (soft delete instead)
-- 1. Add a deleted_at column to foods
alter table public.foods add column if not exists deleted_at timestamp with time zone;

-- 2. Create a trigger to prevent hard delete if referenced in daily_logs
create or replace function prevent_food_delete_if_logged()
returns trigger as $$
begin
  if exists (select 1 from public.daily_logs where food_id = old.id) then
    raise exception 'Cannot delete food: it is referenced by daily_logs.';
  end if;
  return old;
end;
$$ language plpgsql;

drop trigger if exists trg_prevent_food_delete_if_logged on public.foods;
create trigger trg_prevent_food_delete_if_logged
  before delete on public.foods
  for each row execute function prevent_food_delete_if_logged();

-- 3. (Optional) Update app logic to use deleted_at for soft delete instead of hard delete.
