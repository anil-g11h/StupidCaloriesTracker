import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

type SpoonacularAction = 'search_recipes' | 'recipe_summary' | 'daily_meal_plan';

const SPOONACULAR_BASE_URL = 'https://api.spoonacular.com';

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}

function getEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
}

function parsePositiveInt(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function parseAction(value: unknown): SpoonacularAction | null {
  if (value === 'search_recipes') return value;
  if (value === 'recipe_summary') return value;
  if (value === 'daily_meal_plan') return value;
  return null;
}

function buildUrl(path: string, apiKey: string, params: Record<string, string | number | undefined>) {
  const url = new URL(`${SPOONACULAR_BASE_URL}${path}`);
  url.searchParams.set('apiKey', apiKey);

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === '') return;
    url.searchParams.set(key, String(value));
  });

  return url;
}

async function ensureSuccess(response: Response): Promise<Response> {
  if (response.ok) return response;

  let message = `Spoonacular request failed (${response.status})`;
  try {
    const body = (await response.json()) as { message?: string };
    if (body?.message) {
      message = body.message;
    }
  } catch {
    // no-op
  }

  throw new Error(message);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json(405, { ok: false, message: 'Method not allowed' });
  }

  try {
    const supabaseUrl = getEnv('SUPABASE_URL');
    const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY');

    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : '';
    if (!jwt) {
      return json(401, { ok: false, message: 'Missing auth token. Please sign in.' });
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${jwt}`
        }
      }
    });

    const {
      data: { user },
      error: userError
    } = await authClient.auth.getUser();

    if (userError || !user) {
      return json(401, { ok: false, message: 'Invalid auth session' });
    }

    const body = await req.json().catch(() => ({}));
    const action = parseAction(body?.action);
    if (!action) {
      return json(400, { ok: false, message: 'Invalid action' });
    }

    const spoonacularApiKey = getEnv('SPOONACULAR_API_KEY');

    if (action === 'search_recipes') {
      const query = String(body?.query || '').trim();
      const limit = Math.min(20, parsePositiveInt(body?.limit, 8));
      if (!query) return json(400, { ok: false, message: 'Missing query' });

      const url = buildUrl('/recipes/complexSearch', spoonacularApiKey, {
        query,
        number: limit,
        addRecipeNutrition: 'true'
      });

      const response = await ensureSuccess(await fetch(url));
      const payload = await response.json();
      return json(200, { ok: true, action, data: payload });
    }

    if (action === 'recipe_summary') {
      const recipeId = parsePositiveInt(body?.recipeId, 0);
      if (!recipeId) return json(400, { ok: false, message: 'Invalid recipeId' });

      const url = buildUrl(`/recipes/${recipeId}/information`, spoonacularApiKey, {
        includeNutrition: 'true'
      });

      const response = await ensureSuccess(await fetch(url));
      const payload = await response.json();
      return json(200, { ok: true, action, data: payload });
    }

    const targetCalories = Math.max(800, Math.round(Number(body?.targetCalories) || 2000));
    const diet = String(body?.diet || '').trim() || undefined;

    const url = buildUrl('/mealplanner/generate', spoonacularApiKey, {
      timeFrame: 'day',
      targetCalories,
      diet
    });

    const response = await ensureSuccess(await fetch(url));
    const payload = await response.json();
    return json(200, { ok: true, action, data: payload });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error ?? 'Unknown error');
    return json(500, { ok: false, message });
  }
});
