alter table public.ai_gemini_request_logs
  drop constraint if exists ai_gemini_request_logs_action_check;

alter table public.ai_gemini_request_logs
  add constraint ai_gemini_request_logs_action_check
  check (action in ('nutrition_profile', 'recipe_ingredients', 'daily_coach'));
