import { Recipe, Ingredient } from '../types';

export interface DatasetRecipe {
  id: string;
  name: string;
  description: string;
  ingredients: string[] | string; // Could be array or comma-separated string
  instructions: string[] | string;
  prep_time: number;
  cook_time: number;
  total_time?: number;
  servings: number;
  difficulty: 'easy' | 'medium' | 'hard';
  rating: number;
  rating_count: number;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  tags: string[] | string;
  cuisine?: string;
  meal_type?: string;
  dietary_restrictions?: string[];
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

export interface RecipeRecommendation extends Recipe {
  rating: number;
  rating_count: number;
  nutrition?: NutritionInfo;
  match_score: number;
  match_reasons: string[];
}

class DatasetService {
  private recipes: DatasetRecipe[] = [];
  private isLoaded = false;

  async loadDataset(csvData: string): Promise<void> {
    try {
      // Parse CSV data (you can also use a CSV parsing library)
      const lines = csvData.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      
      this.recipes = lines.slice(1)
        .filter(line => line.trim())
        .map((line, index) => {
          const values = this.parseCSVLine(line);
          return this.mapToDatasetRecipe(headers, values, index);
        })
        .filter(recipe => recipe.rating >= 4.0); // Only high-rated recipes

      this.isLoaded = true;
      console.log(`Loaded ${this.recipes.length} high-rated recipes from dataset`);
    } catch (error) {
      console.error('Error loading dataset:', error);
      throw new Error('Failed to load recipe dataset');
    }
  }

  private parseCSVLine(line: string): string[] {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  private mapToDatasetRecipe(headers: string[], values: string[], index: number): DatasetRecipe {
    const recipe: any = { id: `dataset-${index}` };
    
    headers.forEach((header, i) => {
      const value = values[i]?.replace(/"/g, '') || '';
      
      switch (header.toLowerCase()) {
        case 'name':
        case 'title':
        case 'recipe_name':
          recipe.name = value;
          break;
        case 'description':
        case 'summary':
          recipe.description = value;
          break;
        case 'ingredients':
          recipe.ingredients = value.includes(',') ? value.split(',').map(s => s.trim()) : [value];
          break;
        case 'instructions':
        case 'directions':
          recipe.instructions = value.includes('.') ? value.split('.').filter(s => s.trim()) : [value];
          break;
        case 'prep_time':
        case 'preparation_time':
          recipe.prep_time = parseInt(value) || 0;
          break;
        case 'cook_time':
        case 'cooking_time':
          recipe.cook_time = parseInt(value) || 0;
          break;
        case 'total_time':
          recipe.total_time = parseInt(value) || 0;
          break;
        case 'servings':
        case 'serves':
          recipe.servings = parseInt(value) || 4;
          break;
        case 'difficulty':
        case 'skill_level':
          recipe.difficulty = this.mapDifficulty(value);
          break;
        case 'rating':
        case 'average_rating':
          recipe.rating = parseFloat(value) || 0;
          break;
        case 'rating_count':
        case 'review_count':
          recipe.rating_count = parseInt(value) || 0;
          break;
        case 'calories':
          recipe.calories = parseInt(value) || 0;
          break;
        case 'protein':
          recipe.protein = parseFloat(value) || 0;
          break;
        case 'carbs':
        case 'carbohydrates':
          recipe.carbs = parseFloat(value) || 0;
          break;
        case 'fat':
          recipe.fat = parseFloat(value) || 0;
          break;
        case 'fiber':
          recipe.fiber = parseFloat(value) || 0;
          break;
        case 'sugar':
          recipe.sugar = parseFloat(value) || 0;
          break;
        case 'sodium':
          recipe.sodium = parseFloat(value) || 0;
          break;
        case 'tags':
        case 'categories':
          recipe.tags = value.includes(',') ? value.split(',').map(s => s.trim()) : [value];
          break;
        case 'cuisine':
          recipe.cuisine = value;
          break;
        case 'meal_type':
          recipe.meal_type = value;
          break;
      }
    });

    // Set defaults
    recipe.description = recipe.description || 'Resep lezat dari dataset';
    recipe.ingredients = recipe.ingredients || [];
    recipe.instructions = recipe.instructions || [];
    recipe.prep_time = recipe.prep_time || 15;
    recipe.cook_time = recipe.cook_time || 30;
    recipe.servings = recipe.servings || 4;
    recipe.difficulty = recipe.difficulty || 'medium';
    recipe.rating = recipe.rating || 4.0;
    recipe.rating_count = recipe.rating_count || 10;
    recipe.tags = recipe.tags || [];

    return recipe as DatasetRecipe;
  }

  private mapDifficulty(value: string): 'easy' | 'medium' | 'hard' {
    const lower = value.toLowerCase();
    if (lower.includes('easy') || lower.includes('beginner') || lower.includes('simple')) {
      return 'easy';
    } else if (lower.includes('hard') || lower.includes('difficult') || lower.includes('advanced')) {
      return 'hard';
    }
    return 'medium';
  }

  getRecommendations(
    availableIngredients: Ingredient[],
    minRating: number = 4.0,
    maxCookTime?: number,
    difficulty?: 'easy' | 'medium' | 'hard',
    cuisine?: string
  ): RecipeRecommendation[] {
    if (!this.isLoaded) {
      throw new Error('Dataset not loaded. Please load dataset first.');
    }

    const availableIngredientNames = availableIngredients.map(ing => 
      ing.name.toLowerCase()
    );

    return this.recipes
      .filter(recipe => {
        // Filter by rating
        if (recipe.rating < minRating) return false;
        
        // Filter by cook time
        if (maxCookTime && recipe.cook_time > maxCookTime) return false;
        
        // Filter by difficulty
        if (difficulty && recipe.difficulty !== difficulty) return false;
        
        // Filter by cuisine
        if (cuisine && recipe.cuisine && !recipe.cuisine.toLowerCase().includes(cuisine.toLowerCase())) {
          return false;
        }

        return true;
      })
      .map(recipe => {
        const matchScore = this.calculateMatchScore(recipe, availableIngredientNames);
        const matchReasons = this.getMatchReasons(recipe, availableIngredientNames);
        
        return {
          ...this.convertToRecipe(recipe),
          rating: recipe.rating,
          rating_count: recipe.rating_count,
          nutrition: this.extractNutrition(recipe),
          match_score: matchScore,
          match_reasons: matchReasons,
        };
      })
      .filter(recipe => recipe.match_score > 0.3) // Only recipes with decent ingredient match
      .sort((a, b) => {
        // Sort by match score first, then by rating
        if (Math.abs(a.match_score - b.match_score) > 0.1) {
          return b.match_score - a.match_score;
        }
        return b.rating - a.rating;
      })
      .slice(0, 10); // Return top 10 recommendations
  }

  private calculateMatchScore(recipe: DatasetRecipe, availableIngredients: string[]): number {
    const recipeIngredients = Array.isArray(recipe.ingredients) 
      ? recipe.ingredients 
      : recipe.ingredients.split(',');
    
    const recipeIngredientNames = recipeIngredients.map(ing => ing.toLowerCase().trim());
    
    let matchCount = 0;
    let partialMatchCount = 0;
    
    recipeIngredientNames.forEach(recipeIng => {
      const exactMatch = availableIngredients.some(available => 
        available === recipeIng || recipeIng.includes(available) || available.includes(recipeIng)
      );
      
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
    
    const totalIngredients = recipeIngredientNames.length;
    const score = (matchCount + partialMatchCount * 0.5) / totalIngredients;
    
    return Math.min(score, 1.0);
  }

  private getMatchReasons(recipe: DatasetRecipe, availableIngredients: string[]): string[] {
    const reasons = [];
    
    if (recipe.rating >= 4.5) {
      reasons.push(`Rating tinggi: ${recipe.rating}/5 (${recipe.rating_count} ulasan)`);
    }
    
    if (recipe.cook_time <= 30) {
      reasons.push('Cepat dibuat (≤30 menit)');
    }
    
    if (recipe.difficulty === 'easy') {
      reasons.push('Mudah dibuat');
    }
    
    const recipeIngredients = Array.isArray(recipe.ingredients) 
      ? recipe.ingredients 
      : recipe.ingredients.split(',');
    
    const matchingIngredients = recipeIngredients.filter(recipeIng => 
      availableIngredients.some(available => 
        available.includes(recipeIng.toLowerCase()) || recipeIng.toLowerCase().includes(available)
      )
    );
    
    if (matchingIngredients.length > 0) {
      reasons.push(`Cocok dengan bahan: ${matchingIngredients.slice(0, 3).join(', ')}`);
    }
    
    return reasons;
  }

  private convertToRecipe(datasetRecipe: DatasetRecipe): Recipe {
    const instructions = Array.isArray(datasetRecipe.instructions) 
      ? datasetRecipe.instructions 
      : datasetRecipe.instructions.split('.').filter(s => s.trim());
    
    const tags = Array.isArray(datasetRecipe.tags) 
      ? datasetRecipe.tags 
      : datasetRecipe.tags.split(',').map(s => s.trim());

    const ingredients = Array.isArray(datasetRecipe.ingredients) 
      ? datasetRecipe.ingredients 
      : datasetRecipe.ingredients.split(',').map(s => s.trim());

    return {
      id: datasetRecipe.id,
      name: datasetRecipe.name,
      description: datasetRecipe.description,
      prep_time: datasetRecipe.prep_time,
      cook_time: datasetRecipe.cook_time,
      servings: datasetRecipe.servings,
      difficulty: datasetRecipe.difficulty,
      instructions: instructions,
      tags: tags,
      user_id: 'dataset',
      recipe_ingredients: ingredients.map((ing, index) => ({
        id: `${datasetRecipe.id}-ing-${index}`,
        recipe_id: datasetRecipe.id,
        name: ing,
        quantity: 1,
        unit: 'piece',
      })),
    };
  }

  private extractNutrition(recipe: DatasetRecipe): NutritionInfo | undefined {
    if (!recipe.calories) return undefined;
    
    return {
      calories: recipe.calories || 0,
      protein: recipe.protein || 0,
      carbs: recipe.carbs || 0,
      fat: recipe.fat || 0,
      fiber: recipe.fiber || 0,
      sugar: recipe.sugar || 0,
      sodium: recipe.sodium || 0,
    };
  }

  getTopRatedRecipes(limit: number = 20): DatasetRecipe[] {
    return this.recipes
      .sort((a, b) => b.rating - a.rating)
      .slice(0, limit);
  }

  getRecipesByDifficulty(difficulty: 'easy' | 'medium' | 'hard'): DatasetRecipe[] {
    return this.recipes.filter(recipe => recipe.difficulty === difficulty);
  }

  getRecipesByCuisine(cuisine: string): DatasetRecipe[] {
    return this.recipes.filter(recipe => 
      recipe.cuisine && recipe.cuisine.toLowerCase().includes(cuisine.toLowerCase())
    );
  }

  searchRecipes(query: string): DatasetRecipe[] {
    const searchTerm = query.toLowerCase();
    return this.recipes.filter(recipe => 
      recipe.name.toLowerCase().includes(searchTerm) ||
      recipe.description.toLowerCase().includes(searchTerm) ||
      (Array.isArray(recipe.tags) ? recipe.tags : [recipe.tags])
        .some(tag => tag.toLowerCase().includes(searchTerm))
    );
  }
}

export default DatasetService;