import { type Food, type Profile } from './db';

export interface DietaryPreferences {
  dietTags: string[];
  allergies: string[];
  customAllergies: string[];
  goalFocus: string;
  activityLevel: string;
  medicalConstraints: string[];
  mealPattern: string;
}

export const DIET_TAG_OPTIONS = [
  { id: 'veg', label: 'Vegetarian' },
  { id: 'non_veg', label: 'Non-Veg' },
  { id: 'eggetarian', label: 'Egg + Veg' },
  { id: 'vegan', label: 'Vegan' },
  { id: 'pescatarian', label: 'Pescatarian' },
  { id: 'jain', label: 'Jain' }
] as const;

export const ALLERGY_OPTIONS = [
  { id: 'milk', label: 'Milk / Dairy' },
  { id: 'soy', label: 'Soy' },
  { id: 'egg', label: 'Egg' },
  { id: 'peanut', label: 'Peanut' },
  { id: 'tree_nut', label: 'Tree Nut' },
  { id: 'wheat_gluten', label: 'Wheat / Gluten' },
  { id: 'sesame', label: 'Sesame' },
  { id: 'shellfish', label: 'Shellfish' }
] as const;

export const GOAL_FOCUS_OPTIONS = [
  { id: 'fat_loss', label: 'Fat Loss' },
  { id: 'muscle_gain', label: 'Muscle Gain' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'recomp', label: 'Recomposition' }
] as const;

export const ACTIVITY_LEVEL_OPTIONS = [
  { id: 'sedentary', label: 'Sedentary' },
  { id: 'light', label: 'Lightly Active' },
  { id: 'moderate', label: 'Moderately Active' },
  { id: 'active', label: 'Very Active' }
] as const;

export const MEDICAL_CONSTRAINT_OPTIONS = [
  { id: 'low_sodium', label: 'Low Sodium' },
  { id: 'diabetes_friendly', label: 'Diabetes-Friendly' },
  { id: 'heart_healthy', label: 'Heart-Healthy' },
  { id: 'low_cholesterol', label: 'Low Cholesterol' }
] as const;

export const MEAL_PATTERN_OPTIONS = [
  { id: 'three_meals', label: '3 Meals' },
  { id: 'three_plus_snacks', label: '3 Meals + Snacks' },
  { id: 'if_16_8', label: 'Intermittent Fasting 16:8' },
  { id: 'small_frequent', label: 'Small Frequent Meals' }
] as const;

const DEFAULT_PREFERENCES: DietaryPreferences = {
  dietTags: [],
  allergies: [],
  customAllergies: [],
  goalFocus: '',
  activityLevel: '',
  medicalConstraints: [],
  mealPattern: ''
};

const normalizeList = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => String(item || '').trim()).filter(Boolean))];
};

export const normalizeDietaryPreferences = (profile: Profile | null | undefined): DietaryPreferences => ({
  dietTags: normalizeList(profile?.diet_tags),
  allergies: normalizeList(profile?.allergies),
  customAllergies: normalizeList(profile?.custom_allergies),
  goalFocus: String(profile?.goal_focus || '').trim(),
  activityLevel: String(profile?.activity_level || '').trim(),
  medicalConstraints: normalizeList(profile?.medical_constraints),
  mealPattern: String(profile?.meal_pattern || '').trim()
});

export const hasDietaryPreferences = (prefs: DietaryPreferences): boolean =>
  prefs.dietTags.length > 0 ||
  prefs.allergies.length > 0 ||
  prefs.customAllergies.length > 0 ||
  prefs.goalFocus.length > 0 ||
  prefs.activityLevel.length > 0 ||
  prefs.medicalConstraints.length > 0 ||
  prefs.mealPattern.length > 0;

const normalizeToken = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const includesAny = (text: string, keywords: string[]) => keywords.some((keyword) => text.includes(keyword));

const ALLERGEN_KEYWORDS: Record<string, string[]> = {
  soy: ['soy', 'soya', 'tofu', 'soybean', 'edamame'],
  milk: ['milk', 'dairy', 'cheese', 'paneer', 'curd', 'yogurt', 'butter', 'ghee', 'whey', 'casein'],
  egg: ['egg', 'eggs', 'albumin', 'mayonnaise'],
  peanut: ['peanut', 'groundnut'],
  tree_nut: ['almond', 'cashew', 'walnut', 'pistachio', 'hazelnut', 'nut'],
  wheat_gluten: ['wheat', 'gluten', 'maida', 'semolina', 'barley', 'rye'],
  sesame: ['sesame', 'til', 'tahini'],
  shellfish: ['shrimp', 'prawn', 'crab', 'lobster', 'shellfish']
};

const NON_VEG_KEYWORDS = [
  'chicken',
  'mutton',
  'beef',
  'pork',
  'fish',
  'seafood',
  'shrimp',
  'prawn',
  'crab',
  'meat',
  'gelatin'
];

const EGG_KEYWORDS = ['egg', 'eggs', 'omelette', 'mayonnaise', 'albumin'];
const JAIN_RESTRICTED_KEYWORDS = ['onion', 'garlic', 'potato', 'ginger', 'beetroot', 'carrot', 'radish'];

export function getDietaryConflictWarnings(
  prefs: DietaryPreferences,
  food: Food,
  ingredientNames: string[] = []
): string[] {
  const combined = normalizeToken([food.name, food.brand || '', food.ai_notes || '', ...ingredientNames].join(' '));
  const warnings: string[] = [];

  const dietTags = new Set(prefs.dietTags);
  const foodDietTags = new Set(normalizeList(food.diet_tags));
  const foodAllergenTags = new Set(normalizeList(food.allergen_tags));

  const foodMarkedNonVeg =
    foodDietTags.has('non_veg') ||
    foodDietTags.has('contains_meat') ||
    foodDietTags.has('contains_seafood');

  const foodMarkedEgg =
    foodDietTags.has('contains_egg') ||
    foodAllergenTags.has('egg');

  const foodMarkedDairy =
    foodDietTags.has('contains_dairy') ||
    foodAllergenTags.has('milk');

  const foodMarkedJainRestricted = foodDietTags.has('contains_root_vegetables') || foodDietTags.has('contains_onion_garlic');

  if (
    (dietTags.has('veg') || dietTags.has('vegan') || dietTags.has('eggetarian') || dietTags.has('jain')) &&
    (foodMarkedNonVeg || includesAny(combined, NON_VEG_KEYWORDS))
  ) {
    warnings.push('Contains non-vegetarian ingredients');
  }

  if ((dietTags.has('veg') || dietTags.has('jain')) && (foodMarkedEgg || includesAny(combined, EGG_KEYWORDS))) {
    warnings.push('Contains egg');
  }

  if (
    dietTags.has('vegan') &&
    (foodMarkedEgg || foodMarkedDairy || includesAny(combined, [...EGG_KEYWORDS, ...ALLERGEN_KEYWORDS.milk]))
  ) {
    warnings.push('Contains animal-based ingredients (egg/dairy)');
  }

  if (dietTags.has('jain') && (foodMarkedJainRestricted || includesAny(combined, JAIN_RESTRICTED_KEYWORDS))) {
    warnings.push('Contains common Jain-restricted ingredients');
  }

  for (const allergy of prefs.allergies) {
    const keywords = ALLERGEN_KEYWORDS[allergy];
    if (!keywords?.length) continue;
    if (foodAllergenTags.has(allergy) || includesAny(combined, keywords)) {
      const option = ALLERGY_OPTIONS.find((item) => item.id === allergy);
      warnings.push(`Allergy alert: ${option?.label || allergy}`);
    }
  }

  for (const custom of prefs.customAllergies) {
    const tokens = normalizeToken(custom).split(' ').filter((token) => token.length > 2);
    if (!tokens.length) continue;
    if (tokens.some((token) => combined.includes(token))) {
      warnings.push(`Custom allergy alert: ${custom}`);
    }
  }

  return [...new Set(warnings)];
}

export const buildProfilePatchFromPreferences = (prefs: DietaryPreferences) => ({
  diet_tags: [...prefs.dietTags],
  allergies: [...prefs.allergies],
  custom_allergies: [...prefs.customAllergies],
  goal_focus: prefs.goalFocus || null,
  activity_level: prefs.activityLevel || null,
  medical_constraints: [...prefs.medicalConstraints],
  meal_pattern: prefs.mealPattern || null,
  updated_at: new Date()
});

export const createDefaultDietaryPreferences = (): DietaryPreferences => ({ ...DEFAULT_PREFERENCES });
