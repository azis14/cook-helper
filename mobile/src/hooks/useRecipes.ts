import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

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

export function useRecipes(userId: string | undefined) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecipes = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('recipes')
        .select(`
          *,
          recipe_ingredients (*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecipes(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const addRecipe = async (
    recipe: Omit<Recipe, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'recipe_ingredients'>,
    ingredients: Omit<RecipeIngredient, 'id' | 'recipe_id' | 'created_at'>[]
  ) => {
    if (!userId) return;

    try {
      // Insert recipe
      const { data: recipeData, error: recipeError } = await supabase
        .from('recipes')
        .insert({ ...recipe, user_id: userId })
        .select()
        .single();

      if (recipeError) throw recipeError;

      // Insert recipe ingredients
      if (ingredients.length > 0) {
        const { error: ingredientsError } = await supabase
          .from('recipe_ingredients')
          .insert(
            ingredients.map(ing => ({
              ...ing,
              recipe_id: recipeData.id,
            }))
          );

        if (ingredientsError) throw ingredientsError;
      }

      // Fetch the complete recipe with ingredients
      const { data: completeRecipe, error: fetchError } = await supabase
        .from('recipes')
        .select(`
          *,
          recipe_ingredients (*)
        `)
        .eq('id', recipeData.id)
        .single();

      if (fetchError) throw fetchError;

      setRecipes(prev => [completeRecipe, ...prev]);
      return completeRecipe;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add recipe');
      throw err;
    }
  };

  const deleteRecipe = async (id: string) => {
    try {
      const { error } = await supabase
        .from('recipes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setRecipes(prev => prev.filter(recipe => recipe.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete recipe');
      throw err;
    }
  };

  useEffect(() => {
    fetchRecipes();
  }, [userId]);

  return {
    recipes,
    loading,
    error,
    addRecipe,
    deleteRecipe,
    refetch: fetchRecipes,
  };
}