import { supabase } from '../lib/supabase';
import { Ingredient, Recipe } from '../types';
import { isFeatureEnabledSync } from '../lib/featureFlags';

export interface DatasetRecipe {
  id: string;
  title: string;
  ingredients: string;
  steps: string;
  loves_count: number;
  url?: string;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface RecipeRecommendation extends Recipe {
  loves_count: number;
  match_score: number;
  match_reasons: string[];
  source_url?: string;
}

class SupabaseDatasetService {
  /**
   * Check if dataset feature is enabled before making any requests
   */
  private checkFeatureEnabled(): boolean {
    if (!isFeatureEnabledSync('dataset')) {
      console.warn('Dataset feature is disabled');
      return false;
    }
    return true;
  }

  async getRecommendations(
    availableIngredients: Ingredient[],
    minLoves: number = 50,
    limit: number = 12
  ): Promise<RecipeRecommendation[]> {
    if (!this.checkFeatureEnabled()) {
      return [];
    }

    try {
      // Get all public dataset recipes (where user_id is NULL)
      const { data: datasetRecipes, error } = await supabase
        .from('dataset_recipes')
        .select('*')
        .is('user_id', null)
        .gte('loves_count', minLoves)
        .order('loves_count', { ascending: false })
        .limit(500); // Get more to filter and rank

      if (error) throw error;

      if (!datasetRecipes || datasetRecipes.length === 0) {
        return [];
      }

      const availableIngredientNames = availableIngredients.map(ing => 
        ing.name.toLowerCase().trim()
      );

      // Calculate match scores and convert to recommendations
      const recommendations = datasetRecipes
        .map(recipe => this.calculateRecommendation(recipe, availableIngredientNames))
        .filter(rec => rec.match_score > 0.2) // Only recipes with decent ingredient match
        .sort((a, b) => {
          // Sort by match score first, then by loves count
          if (Math.abs(a.match_score - b.match_score) > 0.1) {
            return b.match_score - a.match_score;
          }
          return b.loves_count - a.loves_count;
        })
        .slice(0, limit);

      return recommendations;
    } catch (error) {
      console.error('Error fetching dataset recommendations:', error);
      throw new Error('Gagal mengambil rekomendasi dari dataset');
    }
  }

  async getPopularRecipes(limit: number = 20): Promise<DatasetRecipe[]> {
    if (!this.checkFeatureEnabled()) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('dataset_recipes')
        .select('*')
        .is('user_id', null)
        .order('loves_count', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching popular recipes:', error);
      throw new Error('Gagal mengambil resep populer');
    }
  }

  async searchRecipes(query: string, limit: number = 20): Promise<DatasetRecipe[]> {
    if (!this.checkFeatureEnabled()) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('dataset_recipes')
        .select('*')
        .is('user_id', null)
        .or(`title.ilike.%${query}%,ingredients.ilike.%${query}%`)
        .order('loves_count', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching recipes:', error);
      throw new Error('Gagal mencari resep');
    }
  }

  async getRecipeStats(): Promise<{
    total: number;
    avgLoves: number;
    topCategories: string[];
  }> {
    if (!this.checkFeatureEnabled()) {
      return { total: 0, avgLoves: 0, topCategories: [] };
    }

    try {
      const { data, error } = await supabase
        .from('dataset_recipes')
        .select('loves_count')
        .is('user_id', null);

      if (error) throw error;

      const total = data?.length || 0;
      const avgLoves = total > 0 
        ? Math.round(data.reduce((sum, recipe) => sum + recipe.loves_count, 0) / total)
        : 0;

      return {
        total,
        avgLoves,
        topCategories: [], // Could be implemented if you have category data
      };
    } catch (error) {
      console.error('Error fetching recipe stats:', error);
      return { total: 0, avgLoves: 0, topCategories: [] };
    }
  }

  private calculateRecommendation(
    datasetRecipe: DatasetRecipe, 
    availableIngredients: string[]
  ): RecipeRecommendation {
    const matchScore = this.calculateMatchScore(datasetRecipe, availableIngredients);
    const matchReasons = this.getMatchReasons(datasetRecipe, availableIngredients);

    // Parse ingredients and steps
    const ingredientsList = this.parseIngredients(datasetRecipe.ingredients);
    const stepsList = this.parseSteps(datasetRecipe.steps);

    // Estimate cooking times based on content
    const estimatedPrepTime = Math.min(Math.max(ingredientsList.length * 2, 10), 30);
    const estimatedCookTime = Math.min(Math.max(stepsList.length * 5, 15), 60);

    // Determine difficulty based on number of steps and ingredients
    const difficulty = this.estimateDifficulty(ingredientsList.length, stepsList.length);

    return {
      id: datasetRecipe.id,
      name: datasetRecipe.title,
      description: `Resep populer dengan ${datasetRecipe.loves_count} likes dari komunitas`,
      prep_time: estimatedPrepTime,
      cook_time: estimatedCookTime,
      servings: 4, // Default serving size
      difficulty,
      instructions: stepsList,
      tags: this.extractTags(datasetRecipe.title, datasetRecipe.ingredients),
      user_id: 'dataset',
      recipe_ingredients: ingredientsList.map((ing, index) => ({
        id: `${datasetRecipe.id}-ing-${index}`,
        recipe_id: datasetRecipe.id,
        name: ing,
        quantity: 1,
        unit: 'secukupnya',
      })),
      loves_count: datasetRecipe.loves_count,
      match_score: matchScore,
      match_reasons: matchReasons,
      source_url: datasetRecipe.url,
    };
  }

  private calculateMatchScore(
    recipe: DatasetRecipe, 
    availableIngredients: string[]
  ): number {
    const recipeIngredients = this.parseIngredients(recipe.ingredients);
    const recipeIngredientNames = recipeIngredients.map(ing => ing.toLowerCase().trim());
    
    let matchCount = 0;
    let partialMatchCount = 0;
    
    recipeIngredientNames.forEach(recipeIng => {
      const exactMatch = availableIngredients.some(available => {
        return available === recipeIng || 
               recipeIng.includes(available) || 
               available.includes(recipeIng) ||
               this.isSimilarIngredient(available, recipeIng);
      });
      
      if (exactMatch) {
        matchCount++;
      } else {
        const partialMatch = availableIngredients.some(available => {
          const words = available.split(' ');
          return words.some(word => word.length > 2 && recipeIng.includes(word));
        });
        
        if (partialMatch) {
          partialMatchCount++;
        }
      }
    });
    
    const totalIngredients = Math.max(recipeIngredientNames.length, 1);
    const score = (matchCount + partialMatchCount * 0.5) / totalIngredients;
    
    return Math.min(score, 1.0);
  }

  private isSimilarIngredient(ingredient1: string, ingredient2: string): boolean {
    const synonyms = {
      'ayam': ['chicken', 'daging ayam'],
      'bawang': ['onion', 'bawang bombay'],
      'tomat': ['tomato'],
      'cabai': ['chili', 'cabe'],
      'garam': ['salt'],
      'gula': ['sugar'],
      'minyak': ['oil', 'olive oil'],
      'beras': ['rice', 'nasi'],
    };

    for (const [key, values] of Object.entries(synonyms)) {
      if ((ingredient1.includes(key) || values.some(v => ingredient1.includes(v))) &&
          (ingredient2.includes(key) || values.some(v => ingredient2.includes(v)))) {
        return true;
      }
    }

    return false;
  }

  private getMatchReasons(
    recipe: DatasetRecipe, 
    availableIngredients: string[]
  ): string[] {
    const reasons = [];
    
    if (recipe.loves_count >= 1000) {
      reasons.push(`Sangat populer: ${recipe.loves_count.toLocaleString()} likes`);
    } else if (recipe.loves_count >= 500) {
      reasons.push(`Populer: ${recipe.loves_count.toLocaleString()} likes`);
    }
    
    const recipeIngredients = this.parseIngredients(recipe.ingredients);
    const matchingIngredients = recipeIngredients.filter(recipeIng => 
      availableIngredients.some(available => 
        available.includes(recipeIng.toLowerCase()) || 
        recipeIng.toLowerCase().includes(available) ||
        this.isSimilarIngredient(available, recipeIng.toLowerCase())
      )
    );
    
    if (matchingIngredients.length > 0) {
      reasons.push(`Cocok dengan bahan: ${matchingIngredients.slice(0, 3).join(', ')}`);
    }

    const stepCount = this.parseSteps(recipe.steps).length;
    if (stepCount <= 5) {
      reasons.push('Mudah dibuat (sedikit langkah)');
    }

    // Check for quick cooking indicators
    if (recipe.title.toLowerCase().includes('cepat') || 
        recipe.title.toLowerCase().includes('praktis') ||
        recipe.title.toLowerCase().includes('simple')) {
      reasons.push('Resep cepat dan praktis');
    }
    
    return reasons;
  }

  private parseIngredients(ingredientsText: string): string[] {
    if (!ingredientsText) return [];
    
    // Split by common separators and clean up
    return ingredientsText
      .split(/[,\n\r•\-\*]/)
      .map(ing => ing.trim())
      .filter(ing => ing.length > 0 && ing.length < 100) // Filter out empty and overly long items
      .slice(0, 20); // Limit to reasonable number of ingredients
  }

  private parseSteps(stepsText: string): string[] {
    if (!stepsText) return [];
    
    // Split by common separators and clean up
    return stepsText
      .split(/[.\n\r]/)
      .map(step => step.trim())
      .filter(step => step.length > 10) // Filter out very short steps
      .slice(0, 15); // Limit to reasonable number of steps
  }

  private estimateDifficulty(
    ingredientCount: number, 
    stepCount: number
  ): 'easy' | 'medium' | 'hard' {
    const complexity = ingredientCount + stepCount * 1.5;
    
    if (complexity <= 10) return 'easy';
    if (complexity <= 20) return 'medium';
    return 'hard';
  }

  private extractTags(title: string, ingredients: string): string[] {
    const tags = [];
    const titleLower = title.toLowerCase();
    const ingredientsLower = ingredients.toLowerCase();
    
    // Cuisine tags
    if (titleLower.includes('nasi') || titleLower.includes('rice')) tags.push('nasi');
    if (titleLower.includes('ayam') || ingredientsLower.includes('ayam')) tags.push('ayam');
    if (titleLower.includes('ikan') || ingredientsLower.includes('ikan')) tags.push('ikan');
    if (titleLower.includes('sayur') || ingredientsLower.includes('sayur')) tags.push('sayuran');
    if (titleLower.includes('sup') || titleLower.includes('soto')) tags.push('berkuah');
    if (titleLower.includes('goreng')) tags.push('goreng');
    if (titleLower.includes('bakar')) tags.push('bakar');
    if (titleLower.includes('tumis')) tags.push('tumis');
    
    // Meal type tags
    if (titleLower.includes('sarapan') || titleLower.includes('breakfast')) tags.push('sarapan');
    if (titleLower.includes('makan siang') || titleLower.includes('lunch')) tags.push('makan-siang');
    if (titleLower.includes('makan malam') || titleLower.includes('dinner')) tags.push('makan-malam');
    
    // Style tags
    if (titleLower.includes('pedas') || ingredientsLower.includes('cabai')) tags.push('pedas');
    if (titleLower.includes('manis')) tags.push('manis');
    if (titleLower.includes('sehat') || titleLower.includes('diet')) tags.push('sehat');
    
    return tags.slice(0, 5); // Limit to 5 tags
  }
}

export default SupabaseDatasetService;