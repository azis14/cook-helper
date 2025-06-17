import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';

type Recipe = Database['public']['Tables']['recipes']['Row'] & {
  recipe_ingredients: Database['public']['Tables']['recipe_ingredients']['Row'][];
};
type RecipeInsert = Database['public']['Tables']['recipes']['Insert'];
type RecipeUpdate = Database['public']['Tables']['recipes']['Update'];
type RecipeIngredientInsert = Database['public']['Tables']['recipe_ingredients']['Insert'];

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
    recipe: Omit<RecipeInsert, 'user_id'>,
    ingredients: Omit<RecipeIngredientInsert, 'recipe_id'>[]
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

  const updateRecipe = async (
    id: string,
    updates: RecipeUpdate,
    ingredients?: Omit<RecipeIngredientInsert, 'recipe_id'>[]
  ) => {
    try {
      // Update recipe
      const { data: recipeData, error: recipeError } = await supabase
        .from('recipes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (recipeError) throw recipeError;

      // Update ingredients if provided
      if (ingredients) {
        // Delete existing ingredients
        await supabase
          .from('recipe_ingredients')
          .delete()
          .eq('recipe_id', id);

        // Insert new ingredients
        if (ingredients.length > 0) {
          const { error: ingredientsError } = await supabase
            .from('recipe_ingredients')
            .insert(
              ingredients.map(ing => ({
                ...ing,
                recipe_id: id,
              }))
            );

          if (ingredientsError) throw ingredientsError;
        }
      }

      // Fetch the complete updated recipe
      const { data: completeRecipe, error: fetchError } = await supabase
        .from('recipes')
        .select(`
          *,
          recipe_ingredients (*)
        `)
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      setRecipes(prev => 
        prev.map(recipe => recipe.id === id ? completeRecipe : recipe)
      );
      return completeRecipe;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update recipe');
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
    updateRecipe,
    deleteRecipe,
    refetch: fetchRecipes,
  };
}