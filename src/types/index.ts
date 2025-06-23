export interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  expiry_date?: string;
  user_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  prep_time: number;
  cook_time: number;
  servings: number;
  difficulty: 'easy' | 'medium' | 'hard';
  instructions: string[];
  tags: string[];
  user_id: string;
  created_at?: string;
  updated_at?: string;
  recipe_ingredients?: RecipeIngredient[];
}

export interface RecipeIngredient {
  id: string;
  recipe_id: string;
  name: string;
  quantity: number;
  unit: string;
  created_at?: string;
}

export interface WeeklyPlan {
  id: string;
  week_start: string;
  user_id: string;
  created_at?: string;
  updated_at?: string;
  daily_meals?: DailyMeal[];
}

export interface DailyMeal {
  id: string;
  weekly_plan_id: string;
  date: string;
  breakfast_recipe_id?: string;
  lunch_recipe_id?: string;
  dinner_recipe_id?: string;
  created_at?: string;
  breakfast?: Recipe;
  lunch?: Recipe;
  dinner?: Recipe;
}

export interface DailyMeals {
  date: string;
  breakfast?: Recipe;
  lunch?: Recipe;
  dinner?: Recipe;
  recipes?: Recipe[]; // New flexible approach - array of recipes
}

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  needed: boolean;
}

export interface NutritionInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
}

export interface DatasetRecipe extends Recipe {
  rating: number;
  rating_count: number;
  nutrition?: NutritionInfo;
  cuisine?: string;
  meal_type?: string;
}

export type Language = 'en' | 'id';

export interface Translation {
  [key: string]: {
    en: string;
    id: string;
  };
}