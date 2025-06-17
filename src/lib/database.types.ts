export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      ingredients: {
        Row: {
          id: string
          name: string
          quantity: number
          unit: string
          category: string
          expiry_date: string | null
          user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          quantity: number
          unit: string
          category: string
          expiry_date?: string | null
          user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          quantity?: number
          unit?: string
          category?: string
          expiry_date?: string | null
          user_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      recipes: {
        Row: {
          id: string
          name: string
          description: string
          prep_time: number
          cook_time: number
          servings: number
          difficulty: 'easy' | 'medium' | 'hard'
          instructions: string[]
          tags: string[]
          user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string
          prep_time?: number
          cook_time?: number
          servings?: number
          difficulty?: 'easy' | 'medium' | 'hard'
          instructions?: string[]
          tags?: string[]
          user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          prep_time?: number
          cook_time?: number
          servings?: number
          difficulty?: 'easy' | 'medium' | 'hard'
          instructions?: string[]
          tags?: string[]
          user_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      recipe_ingredients: {
        Row: {
          id: string
          recipe_id: string
          name: string
          quantity: number
          unit: string
          created_at: string
        }
        Insert: {
          id?: string
          recipe_id: string
          name: string
          quantity: number
          unit: string
          created_at?: string
        }
        Update: {
          id?: string
          recipe_id?: string
          name?: string
          quantity?: number
          unit?: string
          created_at?: string
        }
      }
      weekly_plans: {
        Row: {
          id: string
          week_start: string
          user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          week_start: string
          user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          week_start?: string
          user_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      daily_meals: {
        Row: {
          id: string
          weekly_plan_id: string
          date: string
          breakfast_recipe_id: string | null
          lunch_recipe_id: string | null
          dinner_recipe_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          weekly_plan_id: string
          date: string
          breakfast_recipe_id?: string | null
          lunch_recipe_id?: string | null
          dinner_recipe_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          weekly_plan_id?: string
          date?: string
          breakfast_recipe_id?: string | null
          lunch_recipe_id?: string | null
          dinner_recipe_id?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}