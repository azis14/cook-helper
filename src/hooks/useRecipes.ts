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
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  
  const ITEMS_PER_PAGE = 8;

  const fetchRecipes = async (page: number = 0, append: boolean = false) => {
    if (!userId) return;
    
    try {
      if (page === 0) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const { data, error } = await supabase
        .from('recipes')
        .select(`
          *,
          recipe_ingredients (*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1);

      if (error) throw error;

      // Ensure no duplicates by using a Map to deduplicate by ID
      const newRecipes = data || [];
      
      if (append) {
        setRecipes(prev => {
          const existingIds = new Set(prev.map(r => r.id));
          const uniqueNewRecipes = newRecipes.filter(recipe => !existingIds.has(recipe.id));
          return [...prev, ...uniqueNewRecipes];
        });
      } else {
        const uniqueRecipes = new Map();
        newRecipes.forEach(recipe => {
          if (!uniqueRecipes.has(recipe.id)) {
            uniqueRecipes.set(recipe.id, recipe);
          }
        });
        setRecipes(Array.from(uniqueRecipes.values()));
      }

      // Check if there are more items to load
      setHasMore(newRecipes.length === ITEMS_PER_PAGE);
      setCurrentPage(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = async () => {
    if (!hasMore || loadingMore) return;
    await fetchRecipes(currentPage + 1, true);
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

      // Add to state at the beginning, ensuring no duplicates
      setRecipes(prev => {
        const filtered = prev.filter(r => r.id !== completeRecipe.id);
        return [completeRecipe, ...filtered];
      });
      
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

      // Update state, ensuring no duplicates
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
      
      // Remove from state
      setRecipes(prev => prev.filter(recipe => recipe.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete recipe');
      throw err;
    }
  };

  useEffect(() => {
    fetchRecipes(0, false);
  }, [userId]);

  return {
    recipes,
    loading,
    loadingMore,
    error,
    hasMore,
    addRecipe,
    updateRecipe,
    deleteRecipe,
    loadMore,
    refetch: () => fetchRecipes(0, false),
  };
}