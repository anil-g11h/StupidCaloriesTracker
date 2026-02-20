-- Profiles
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  username text unique,
  full_name text,
  avatar_url text,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Foods (Recursive Structure)
create table if not exists public.foods (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id), -- Null means global/public food
  name text not null,
  brand text,
  calories numeric not null default 0, -- per serving
  protein numeric not null default 0,
  carbs numeric not null default 0,
  fat numeric not null default 0,
  serving_size numeric default 100,
  serving_unit text default 'g',
  is_recipe boolean default false,
  is_public boolean default false,
  micros jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Food Ingredients (Join table for recipes)
create table if not exists public.food_ingredients (
  id uuid default gen_random_uuid() primary key,
  parent_food_id uuid references public.foods(id) on delete cascade not null, -- The Recipe
  child_food_id uuid references public.foods(id) on delete cascade not null, -- The Ingredient
  quantity numeric not null, -- Amount of child food used in parent recipe
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Daily Logs
create table if not exists public.daily_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  date date not null default current_date,
  meal_type text check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack', 'supplement')),
  food_id uuid references public.foods(id),
  amount_consumed numeric not null default 1, -- Multiplier of serving size
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Goals (Versioned)
create table if not exists public.goals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  start_date date not null default current_date,
  calories_target numeric not null,
  protein_target numeric not null,
  carbs_target numeric not null,
  fat_target numeric not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Body Metrics (Flexible)
create table if not exists public.body_metrics (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  date date not null default current_date,
  type text not null, -- 'weight', 'waist', 'chest', 'bicep_left', etc.
  value numeric not null,
  unit text not null, -- 'kg', 'lbs', 'cm', 'in'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies
alter table public.profiles enable row level security;
alter table public.foods enable row level security;
alter table public.food_ingredients enable row level security;
alter table public.daily_logs enable row level security;
alter table public.goals enable row level security;
alter table public.body_metrics enable row level security;

-- Profiles: Users can read/update their own profile
drop policy if exists "Allow users to read own profile" on public.profiles;
create policy "Allow users to read own profile" on public.profiles for select using (auth.uid() = id);

drop policy if exists "Allow users to update own profile" on public.profiles;
create policy "Allow users to update own profile" on public.profiles for update using (auth.uid() = id);

-- Foods: Users can read public foods or their own foods
drop policy if exists "Allow public foods read access" on public.foods;
create policy "Allow public foods read access" on public.foods for select using (is_public = true or auth.uid() = user_id);

drop policy if exists "Allow users to manage own foods" on public.foods;
create policy "Allow users to manage own foods" on public.foods for all using (auth.uid() = user_id);

-- Rest: Private to user
drop policy if exists "Allow users to manage own ingredients" on public.food_ingredients;
create policy "Allow users to manage own ingredients" on public.food_ingredients for all using (
    exists (select 1 from public.foods where id = parent_food_id and user_id = auth.uid())
);

drop policy if exists "Allow users to manage own logs" on public.daily_logs;
create policy "Allow users to manage own logs" on public.daily_logs for all using (auth.uid() = user_id);

drop policy if exists "Allow users to manage own goals" on public.goals;
create policy "Allow users to manage own goals" on public.goals for all using (auth.uid() = user_id);

drop policy if exists "Allow users to manage own metrics" on public.body_metrics;
create policy "Allow users to manage own metrics" on public.body_metrics for all using (auth.uid() = user_id);

-- Activities
create table if not exists public.activities (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id), -- Null means global/public activity
  name text not null,
  calories_per_hour numeric not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Activity Logs
create table if not exists public.activity_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  date date not null default current_date,
  activity_id uuid references public.activities(id),
  start_time timestamp with time zone,
  end_time timestamp with time zone,
  duration_minutes numeric not null default 0,
  calories_burned numeric not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies for Activities
alter table public.activities enable row level security;
alter table public.activity_logs enable row level security;

-- Activities
drop policy if exists "Allow public activities read access" on public.activities;
create policy "Allow public activities read access" on public.activities for select using (user_id is null or auth.uid() = user_id);

drop policy if exists "Allow users to manage own activities" on public.activities;
create policy "Allow users to manage own activities" on public.activities for all using (auth.uid() = user_id);

-- Activity Logs
drop policy if exists "Allow users to manage own activity logs" on public.activity_logs;
create policy "Allow users to manage own activity logs" on public.activity_logs for all using (auth.uid() = user_id);

