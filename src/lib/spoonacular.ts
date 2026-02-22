import { supabase } from './supabaseClient';

interface SpoonacularNutrient {
  name?: string;
  amount?: number;
  unit?: string;
}

interface SpoonacularNutrition {
  nutrients?: SpoonacularNutrient[];
}

interface SpoonacularExtendedIngredient {
  id?: number;
  name?: string;
  original?: string;
  amount?: number;
  unit?: string;
  aisle?: string;
}

interface SpoonacularRecipeSearchResult {
  id: number;
  title: string;
  image?: string;
  sourceUrl?: string;
  servings?: number;
  nutrition?: SpoonacularNutrition;
}

interface SpoonacularRecipeInfoResponse {
  id: number;
  title: string;
  image?: string;
  sourceUrl?: string;
  servings?: number;
  nutrition?: SpoonacularNutrition;
  extendedIngredients?: SpoonacularExtendedIngredient[];
}

interface SpoonacularMealPlanMeal {
  id: number;
  title: string;
  readyInMinutes?: number;
  servings?: number;
  sourceUrl?: string;
}

interface SpoonacularMealPlanNutrients {
  calories?: number;
  protein?: number;
  fat?: number;
  carbohydrates?: number;
}

interface SpoonacularMealPlanResponse {
  meals?: SpoonacularMealPlanMeal[];
  nutrients?: SpoonacularMealPlanNutrients;
}

export interface SpoonacularRecipeSummary {
  id: number;
  title: string;
  image?: string;
  sourceUrl?: string;
  servings: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  micros: Record<string, number>;
  ingredients: Array<{
    id?: number;
    name: string;
    amount: number;
    unit: string;
    aisle?: string;
    original?: string;
  }>;
}

export interface SpoonacularMealSuggestion {
  id: number;
  title: string;
  readyInMinutes: number;
  servings: number;
  sourceUrl?: string;
}

export interface SpoonacularDailyMealPlan {
  meals: SpoonacularMealSuggestion[];
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

interface SpoonacularFunctionResponse<T> {
  ok?: boolean;
  message?: string;
  data?: T;
}

const parseNumericAmount = (value: unknown): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return parsed;
};

const toGramsByUnit = (amount: number, unit: string | undefined): number => {
  const normalizedUnit = String(unit || '').trim().toLowerCase();
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  if (normalizedUnit === 'g') return amount;
  if (normalizedUnit === 'mg') return amount / 1000;
  if (normalizedUnit === 'mcg' || normalizedUnit === 'µg') return amount / 1000000;
  return amount;
};

const normalizeNutrientName = (value: string): string => value.trim().toLowerCase();

const extractMacroTotals = (nutrition: SpoonacularNutrition | undefined) => {
  const nutrients = Array.isArray(nutrition?.nutrients) ? nutrition?.nutrients : [];
  const nutrientMap = nutrients.reduce<Record<string, number>>((acc, nutrient) => {
    const key = normalizeNutrientName(String(nutrient?.name || ''));
    if (!key) return acc;
    acc[key] = parseNumericAmount(nutrient?.amount);
    return acc;
  }, {});

  return {
    calories: parseNumericAmount(nutrientMap.calories),
    protein: parseNumericAmount(nutrientMap.protein),
    carbs: parseNumericAmount(nutrientMap.carbohydrates),
    fat: parseNumericAmount(nutrientMap.fat)
  };
};

const extractEaaMicros = (nutrition: SpoonacularNutrition | undefined): Record<string, number> => {
  const nutrients = Array.isArray(nutrition?.nutrients) ? nutrition?.nutrients : [];
  const aliases: Record<string, string> = {
    leucine: 'Leucine',
    lysine: 'Lysine',
    valine: 'Valine',
    isoleucine: 'Isoleucine',
    threonine: 'Threonine',
    phenylalanine: 'Phenylalanine',
    histidine: 'Histidine',
    methionine: 'Methionine',
    tryptophan: 'Tryptophan'
  };

  return nutrients.reduce<Record<string, number>>((acc, nutrient) => {
    const rawName = String(nutrient?.name || '').trim().toLowerCase();
    if (!rawName) return acc;
    const canonical = aliases[rawName];
    if (!canonical) return acc;

    const amount = parseNumericAmount(nutrient?.amount);
    const grams = toGramsByUnit(amount, nutrient?.unit);
    if (grams <= 0) return acc;

    acc[canonical] = grams;
    return acc;
  }, {});
};

const extractIngredients = (
  ingredients: SpoonacularExtendedIngredient[] | undefined
): SpoonacularRecipeSummary['ingredients'] => {
  const rows = Array.isArray(ingredients) ? ingredients : [];

  return rows
    .map((row) => ({
      id: typeof row.id === 'number' ? row.id : undefined,
      name: String(row.name || '').trim(),
      amount: parseNumericAmount(row.amount),
      unit: String(row.unit || '').trim(),
      aisle: row.aisle,
      original: row.original
    }))
    .filter((row) => row.name.length > 0);
};

const invokeSpoonacularFunction = async <T>(payload: Record<string, unknown>): Promise<T> => {
  const { data, error } = await supabase.functions.invoke('spoonacular-recipes', {
    body: payload
  });

  if (error) throw error;

  const response = (data ?? {}) as SpoonacularFunctionResponse<T>;
  if (!response.ok) {
    throw new Error(response.message || 'Spoonacular function request failed');
  }

  if (!response.data) {
    throw new Error('Spoonacular function returned empty payload');
  }

  return response.data;
};

export const searchSpoonacularRecipes = async (
  query: string,
  limit = 8
): Promise<SpoonacularRecipeSummary[]> => {
  const payload = await invokeSpoonacularFunction<{ results?: SpoonacularRecipeSearchResult[] }>({
    action: 'search_recipes',
    query,
    limit
  });
  const rows = Array.isArray(payload.results) ? payload.results : [];

  return rows.map((row) => {
    const totals = extractMacroTotals(row.nutrition);
    return {
      id: row.id,
      title: row.title,
      image: row.image,
      sourceUrl: row.sourceUrl,
      servings: Math.max(1, parseNumericAmount(row.servings) || 1),
      calories: totals.calories,
      protein: totals.protein,
      carbs: totals.carbs,
      fat: totals.fat,
      micros: extractEaaMicros(row.nutrition),
      ingredients: []
    };
  });
};

export const getSpoonacularRecipeSummary = async (
  recipeId: number
): Promise<SpoonacularRecipeSummary> => {
  const row = await invokeSpoonacularFunction<SpoonacularRecipeInfoResponse>({
    action: 'recipe_summary',
    recipeId
  });
  const totals = extractMacroTotals(row.nutrition);

  return {
    id: row.id,
    title: row.title,
    image: row.image,
    sourceUrl: row.sourceUrl,
    servings: Math.max(1, parseNumericAmount(row.servings) || 1),
    calories: totals.calories,
    protein: totals.protein,
    carbs: totals.carbs,
    fat: totals.fat,
    micros: extractEaaMicros(row.nutrition),
    ingredients: extractIngredients(row.extendedIngredients)
  };
};

export const generateSpoonacularDailyMealPlan = async (
  targetCalories: number,
  diet?: string
): Promise<SpoonacularDailyMealPlan> => {
  const payload = await invokeSpoonacularFunction<SpoonacularMealPlanResponse>({
    action: 'daily_meal_plan',
    targetCalories: Math.max(800, Math.round(targetCalories)),
    diet
  });

  return {
    meals: (payload.meals || []).map((meal) => ({
      id: meal.id,
      title: meal.title,
      readyInMinutes: Math.max(0, parseNumericAmount(meal.readyInMinutes)),
      servings: Math.max(1, parseNumericAmount(meal.servings) || 1),
      sourceUrl: meal.sourceUrl
    })),
    totals: {
      calories: parseNumericAmount(payload.nutrients?.calories),
      protein: parseNumericAmount(payload.nutrients?.protein),
      carbs: parseNumericAmount(payload.nutrients?.carbohydrates),
      fat: parseNumericAmount(payload.nutrients?.fat)
    }
  };
};
