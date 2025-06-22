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
    if (!userId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('weekly_plans')
        .select(`
          *,
          daily_meals (
            *
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform the data to match our WeeklyPlan type
      const transformedPlans: WeeklyPlan[] = (data || []).map(plan => ({
        ...plan,
        daily_meals: plan.daily_meals?.map((meal: any) => ({
          date: meal.date,
          breakfast_recipe_id: meal.breakfast_recipe_id,
          lunch_recipe_id: meal.lunch_recipe_id,
          dinner_recipe_id: meal.dinner_recipe_id,
        })) || []
      }));

      setWeeklyPlans(transformedPlans);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
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

      // Save daily meals
      const dailyMealsToInsert: DailyMealInsert[] = dailyMeals.map(meal => ({
        weekly_plan_id: planData.id,
        date: meal.date,
        breakfast_recipe_id: meal.breakfast?.id || null,
        lunch_recipe_id: meal.lunch?.id || null,
        dinner_recipe_id: meal.dinner?.id || null,
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
      
      return savedPlan;
    } catch (err) {
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
            *
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

        // Find and attach actual recipe objects
        if (meal.breakfast_recipe_id) {
          dailyMeal.breakfast = recipes.find(r => r.id === meal.breakfast_recipe_id) || null;
        }
        if (meal.lunch_recipe_id) {
          dailyMeal.lunch = recipes.find(r => r.id === meal.lunch_recipe_id) || null;
        }
        if (meal.dinner_recipe_id) {
          dailyMeal.dinner = recipes.find(r => r.id === meal.dinner_recipe_id) || null;
        }

        return dailyMeal;
      });

      return {
        ...data,
        daily_meals: dailyMeals,
      };
    } catch (err) {
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

    return weeklyPlans.find(plan => plan.week_start === weekStart) || null;
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