import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';

type Ingredient = Database['public']['Tables']['ingredients']['Row'];
type IngredientInsert = Database['public']['Tables']['ingredients']['Insert'];
type IngredientUpdate = Database['public']['Tables']['ingredients']['Update'];

export function useIngredients(userId: string | undefined) {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIngredients = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ingredients')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIngredients(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const addIngredient = async (ingredient: Omit<IngredientInsert, 'user_id'>) => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('ingredients')
        .insert({ ...ingredient, user_id: userId })
        .select()
        .single();

      if (error) throw error;
      setIngredients(prev => [data, ...prev]);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add ingredient');
      throw err;
    }
  };

  const updateIngredient = async (id: string, updates: IngredientUpdate) => {
    try {
      const { data, error } = await supabase
        .from('ingredients')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setIngredients(prev => 
        prev.map(ing => ing.id === id ? data : ing)
      );
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update ingredient');
      throw err;
    }
  };

  const deleteIngredient = async (id: string) => {
    try {
      const { error } = await supabase
        .from('ingredients')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setIngredients(prev => prev.filter(ing => ing.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete ingredient');
      throw err;
    }
  };

  useEffect(() => {
    fetchIngredients();
  }, [userId]);

  return {
    ingredients,
    loading,
    error,
    addIngredient,
    updateIngredient,
    deleteIngredient,
    refetch: fetchIngredients,
  };
}