-- Track per-user Gemini Edge Function usage for lightweight throttling
create table if not exists public.ai_gemini_request_logs (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (action in ('nutrition_profile', 'recipe_ingredients')),
  created_at timestamptz not null default now()
);

create index if not exists ai_gemini_request_logs_user_action_created_at_idx
  on public.ai_gemini_request_logs (user_id, action, created_at desc);

alter table public.ai_gemini_request_logs enable row level security;
