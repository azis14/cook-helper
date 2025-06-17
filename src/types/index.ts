export interface Ingredient {
  id: string;
  name: string;
  nameId: string;
  quantity: number;
  unit: string;
  category: string;
  expiryDate?: string;
}

export interface Recipe {
  id: string;
  name: string;
  nameId: string;
  description: string;
  descriptionId: string;
  ingredients: RecipeIngredient[];
  instructions: string[];
  instructionsId: string[];
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  image?: string;
}

export interface RecipeIngredient {
  ingredientId: string;
  name: string;
  nameId: string;
  quantity: number;
  unit: string;
}

export interface WeeklyPlan {
  id: string;
  week: string;
  meals: DailyMeals[];
}

export interface DailyMeals {
  date: string;
  breakfast?: Recipe;
  lunch?: Recipe;
  dinner?: Recipe;
}

export interface ShoppingItem {
  id: string;
  name: string;
  nameId: string;
  quantity: number;
  unit: string;
  category: string;
  needed: boolean;
}

export type Language = 'en' | 'id';

export interface Translation {
  [key: string]: {
    en: string;
    id: string;
  };
}