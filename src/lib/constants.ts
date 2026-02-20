// Global app constants
export const BASE_URL = 'StupidCaloriesTracker';
export const ESSENTIAL_AMINO_ACIDS = [
	'Histidine',
	'Isoleucine',
	'Leucine',
	'Lysine',
	'Methionine',
	'Phenylalanine',
	'Threonine',
	'Tryptophan',
	'Valine'
];

export const AMINO_ACIDS = [
	...ESSENTIAL_AMINO_ACIDS,
	'Alanine',
	'Arginine',
	'Aspartic acid',
	'Cystine',
	'Glutamic acid',
	'Glycine',
	'Proline',
	'Serine',
	'Tyrosine'
];

export const VITAMINS = [
	{ name: 'Vitamin A', unit: 'mcg', key: 'vitamin_a' },
	{ name: 'Vitamin B1', unit: 'mg', key: 'vitamin_b1' },
	{ name: 'Vitamin B2', unit: 'mg', key: 'vitamin_b2' },
	{ name: 'Vitamin B3', unit: 'mg', key: 'vitamin_b3' },
	{ name: 'Vitamin B5', unit: 'mg', key: 'vitamin_b5' },
	{ name: 'Vitamin B6', unit: 'mg', key: 'vitamin_b6' },
	{ name: 'Vitamin B7', unit: 'mcg', key: 'vitamin_b7' },
	{ name: 'Vitamin B9', unit: 'mcg', key: 'vitamin_b9' },
	{ name: 'Vitamin B12', unit: 'mcg', key: 'vitamin_b12' },
	{ name: 'Vitamin C', unit: 'mg', key: 'vitamin_c' },
	{ name: 'Vitamin D', unit: 'mcg', key: 'vitamin_d' },
	{ name: 'Vitamin E', unit: 'mg', key: 'vitamin_e' },
	{ name: 'Vitamin K', unit: 'mcg', key: 'vitamin_k' }
];

export const MINERALS = [
	{ name: 'Calcium', unit: 'mg', key: 'calcium' },
	{ name: 'Iron', unit: 'mg', key: 'iron' },
	{ name: 'Magnesium', unit: 'mg', key: 'magnesium' },
	{ name: 'Potassium', unit: 'mg', key: 'potassium' },
	{ name: 'Sodium', unit: 'mg', key: 'sodium' },
	{ name: 'Zinc', unit: 'mg', key: 'zinc' }
];

export const MACRO_DETAILS = [
	{ name: 'Sugar', unit: 'g', key: 'sugar', parent: 'carbs' },
	{ name: 'Fiber', unit: 'g', key: 'fiber', parent: 'carbs' },
	{ name: 'Cholesterol', unit: 'mg', key: 'cholesterol', parent: 'fat' }
];

export const MICRO_NUTRIENTS = [
	...MACRO_DETAILS.map(m => ({ key: m.key, label: m.name, unit: m.unit })),
	...MINERALS.map(m => ({ key: m.key, label: m.name, unit: m.unit })),
	...VITAMINS.map(m => ({ key: m.key, label: m.name, unit: m.unit }))
];

