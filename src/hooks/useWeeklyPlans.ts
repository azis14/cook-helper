import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import { WeeklyPlan, DailyMeals, Recipe } from '../types';

type WeeklyPlanRow = Database['public']['Tables']['weekly_plans']['Row'];
type WeeklyPlanInsert = Database['public']['Tables']['weekly_plans']['Insert'];
type DailyMealRow = Database['public']['Tables']['daily_meals']['Row'];
type DailyMealInsert = Database['public']['Tables']['daily_meals']['Insert'];

export function useWeeklyPlans(userId: string | undefined) {
  const [weeklyPlans, setWeeklyPlans] = useState<WeeklyPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWeeklyPlans = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      
      // Fetch weekly plans with daily meals and recipe details
      const { data, error } = await supabase
        .from('weekly_plans')
        .select(`
          *,
          daily_meals (
            *,
            breakfast_recipe:recipes!breakfast_recipe_id (*,
              recipe_ingredients (*)
            ),
            lunch_recipe:recipes!lunch_recipe_id (*,
              recipe_ingredients (*)
            ),
            dinner_recipe:recipes!dinner_recipe_id (*,
              recipe_ingredients (*)
            )
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform the data to match our WeeklyPlan type
      const transformedPlans: WeeklyPlan[] = (data || []).map(plan => ({
        ...plan,
        daily_meals: plan.daily_meals?.map((meal: any) => {
          const dailyMeal: DailyMeals = {
            date: meal.date,
          };

          // Attach full recipe objects if they exist
          if (meal.breakfast_recipe) {
            dailyMeal.breakfast = meal.breakfast_recipe;
          }
          if (meal.lunch_recipe) {
            dailyMeal.lunch = meal.lunch_recipe;
          }
          if (meal.dinner_recipe) {
            dailyMeal.dinner = meal.dinner_recipe;
          }

          return dailyMeal;
        }) || []
      }));

      setWeeklyPlans(transformedPlans);
      console.log('Loaded weekly plans:', transformedPlans);
    } catch (err) {
      console.error('Error fetching weekly plans:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to check if a recipe should be saved to database
  const isUserRecipe = (recipe: Recipe | null): boolean => {
    if (!recipe) return false;
    // Only save recipes that belong to the current user (have valid UUIDs and user_id matches)
    return recipe.user_id === userId && 
           typeof recipe.id === 'string' && 
           recipe.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i) !== null;
  };

  const saveWeeklyPlan = async (
    weekStart: string,
    dailyMeals: DailyMeals[],
    peopleCount: number
  ): Promise<WeeklyPlan> => {
    if (!userId) throw new Error('User not authenticated');

    try {
      // First, delete any existing plan for this week
      await supabase
        .from('weekly_plans')
        .delete()
        .eq('user_id', userId)
        .eq('week_start', weekStart);

      // Create new weekly plan
      const { data: planData, error: planError } = await supabase
        .from('weekly_plans')
        .insert({
          week_start: weekStart,
          user_id: userId,
        })
        .select()
        .single();

      if (planError) throw planError;

      // Save daily meals - only include recipe IDs for user-owned recipes
      const dailyMealsToInsert: DailyMealInsert[] = dailyMeals.map(meal => ({
        weekly_plan_id: planData.id,
        date: meal.date,
        breakfast_recipe_id: isUserRecipe(meal.breakfast) ? meal.breakfast!.id : null,
        lunch_recipe_id: isUserRecipe(meal.lunch) ? meal.lunch!.id : null,
        dinner_recipe_id: isUserRecipe(meal.dinner) ? meal.dinner!.id : null,
      }));

      const { error: mealsError } = await supabase
        .from('daily_meals')
        .insert(dailyMealsToInsert);

      if (mealsError) throw mealsError;

      const savedPlan: WeeklyPlan = {
        ...planData,
        daily_meals: dailyMeals,
      };

      // Update local state
      setWeeklyPlans(prev => [savedPlan, ...prev.filter(p => p.week_start !== weekStart)]);
      
      console.log('Weekly plan saved successfully:', savedPlan);
      return savedPlan;
    } catch (err) {
      console.error('Error saving weekly plan:', err);
      setError(err instanceof Error ? err.message : 'Failed to save weekly plan');
      throw err;
    }
  };

  const loadWeeklyPlan = async (planId: string, recipes: Recipe[]): Promise<WeeklyPlan | null> => {
    try {
      const { data, error } = await supabase
        .from('weekly_plans')
        .select(`
          *,
          daily_meals (
            *,
            breakfast_recipe:recipes!breakfast_recipe_id (*,
              recipe_ingredients (*)
            ),
            lunch_recipe:recipes!lunch_recipe_id (*,
              recipe_ingredients (*)
            ),
            dinner_recipe:recipes!dinner_recipe_id (*,
              recipe_ingredients (*)
            )
          )
        `)
        .eq('id', planId)
        .single();

      if (error) throw error;
      if (!data) return null;

      // Transform daily meals and populate with actual recipe objects
      const dailyMeals: DailyMeals[] = (data.daily_meals || []).map((meal: any) => {
        const dailyMeal: DailyMeals = {
          date: meal.date,
        };

        // Use the fetched recipe objects directly
        if (meal.breakfast_recipe) {
          dailyMeal.breakfast = meal.breakfast_recipe;
        }
        if (meal.lunch_recipe) {
          dailyMeal.lunch = meal.lunch_recipe;
        }
        if (meal.dinner_recipe) {
          dailyMeal.dinner = meal.dinner_recipe;
        }

        return dailyMeal;
      });

      return {
        ...data,
        daily_meals: dailyMeals,
      };
    } catch (err) {
      console.error('Error loading weekly plan:', err);
      setError(err instanceof Error ? err.message : 'Failed to load weekly plan');
      throw err;
    }
  };

  const deleteWeeklyPlan = async (planId: string) => {
    try {
      const { error } = await supabase
        .from('weekly_plans')
        .delete()
        .eq('id', planId);

      if (error) throw error;
      
      setWeeklyPlans(prev => prev.filter(plan => plan.id !== planId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete weekly plan');
      throw err;
    }
  };

  const getCurrentWeekPlan = (): WeeklyPlan | null => {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1); // Get Monday of current week
    const weekStart = monday.toISOString().slice(0, 10);

    const currentPlan = weeklyPlans.find(plan => plan.week_start === weekStart) || null;
    console.log('Current week plan:', currentPlan);
    return currentPlan;
  };

  useEffect(() => {
    fetchWeeklyPlans();
  }, [userId]);

  return {
    weeklyPlans,
    loading,
    error,
    saveWeeklyPlan,
    loadWeeklyPlan,
    deleteWeeklyPlan,
    getCurrentWeekPlan,
    refetch: fetchWeeklyPlans,
  };
}