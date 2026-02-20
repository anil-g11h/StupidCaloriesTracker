import { type Food } from './db';

export interface CalculatedNutrition {
	calories: number;
	protein: number;
	carbs: number;
	fat: number;
	micros: Record<string, number>;
	weight: number;
}

export function calculateRecipeNutrition(ingredients: { food: Food; quantity: number }[]): CalculatedNutrition {
	let totalCalories = 0;
	let totalProtein = 0;
	let totalCarbs = 0;
	let totalFat = 0;
	let totalWeight = 0;
	const totalMicros: Record<string, number> = {};

	for (const { food, quantity } of ingredients) {
		// quantity is number of servings
		// serving_size defaults to 100 if missing
		const servingSize = food.serving_size || 100;
		
		totalCalories += food.calories * quantity;
		totalProtein += food.protein * quantity;
		totalCarbs += food.carbs * quantity;
		totalFat += food.fat * quantity;
		totalWeight += servingSize * quantity;

		if (food.micros) {
			for (const [key, value] of Object.entries(food.micros)) {
				// We need to parse jsonb if it is a string. In JS runtime supabase might return object.
				// Assuming standard JSON object handling here.
				// However, TypeScript definition says Record<string, number>.
				// If value is null or undefined we skip.
				if (typeof value === 'number') {
					totalMicros[key] = (totalMicros[key] || 0) + (value * quantity);
				}
			}
		}
	}

	return {
		calories: totalCalories,
		protein: totalProtein,
		carbs: totalCarbs,
		fat: totalFat,
		micros: totalMicros,
		weight: totalWeight
	};
}
