import { supabase } from './supabaseClient';

export interface GeminiNutritionPayload {
  protein?: number;
  fat?: number;
  carbs?: number;
  calories?: number;
  micros?: Record<string, unknown>;
  diet_tags?: unknown;
  allergen_tags?: unknown;
  ai_notes?: unknown;
}

export interface GeminiRecipeIngredientsPayload {
  recipe_name?: string;
  ingredients?: Array<{
    name?: unknown;
    amount?: unknown;
    unit?: unknown;
  }>;
}

interface GeminiFunctionResponse<T> {
  ok?: boolean;
  message?: string;
  data?: T;
}

async function invokeGeminiFunction<T>(payload: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('gemini-food-nutrition', {
    body: payload
  });

  if (error) {
    throw error;
  }

  const response = (data ?? {}) as GeminiFunctionResponse<T>;
  if (!response.ok) {
    throw new Error(response.message || 'Gemini edge function request failed');
  }

  if (!response.data) {
    throw new Error('Gemini edge function returned empty payload');
  }

  return response.data;
}

export async function fetchGeminiNutritionProfile(input: {
  name: string;
  servingSize: number;
  servingUnit: string;
}): Promise<GeminiNutritionPayload> {
  return invokeGeminiFunction<GeminiNutritionPayload>({
    action: 'nutrition_profile',
    name: input.name,
    servingSize: input.servingSize,
    servingUnit: input.servingUnit
  });
}

export async function fetchGeminiRecipeIngredients(input: {
  recipeName: string;
}): Promise<GeminiRecipeIngredientsPayload> {
  return invokeGeminiFunction<GeminiRecipeIngredientsPayload>({
    action: 'recipe_ingredients',
    recipeName: input.recipeName
  });
}
