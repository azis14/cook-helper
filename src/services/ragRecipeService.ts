import { supabase } from '../lib/supabase';
import { Ingredient, Recipe } from '../types';
import EmbeddingService from './embeddingService';

export interface RAGRecipeRecommendation extends Recipe {
  loves_count: number;
  similarity_score: number;
  relevance_reasons: string[];
  source_url?: string;
  confidence_score: number;
}

export interface RecipeContext {
  recipe: any;
  content: string;
  embedding: number[];
  similarity: number;
}

export interface RecipeEmbedding {
  id: string;
  recipe_id: string;
  embedding: number[];
  content: string;
  created_at: string;
}

class RAGRecipeService {
  private embeddingService: EmbeddingService;
  private isInitialized = false;

  constructor() {
    this.embeddingService = new EmbeddingService();
  }

  /**
   * Initialize the service - now just checks if embeddings exist
   * Background sync handles the heavy lifting
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('Initializing RAG Recipe Service...');
      
      // Just check if we have embeddings available
      const { data: embeddingCount, error } = await supabase
        .from('recipe_embeddings')
        .select('id', { count: 'exact', head: true });

      if (error) {
        console.warn('Could not check embedding count:', error);
      } else {
        console.log(`Found ${embeddingCount?.length || 0} embeddings in database`);
      }

      this.isInitialized = true;
      console.log('RAG Recipe Service initialized successfully');
    } catch (error) {
      console.error('Error initializing RAG Recipe Service:', error);
      this.isInitialized = true; // Continue with limited functionality
    }
  }

  /**
   * Get RAG-based recipe recommendations using vector similarity search
   */
  async getRecommendations(
    ingredients: Ingredient[],
    options: {
      minLoves?: number;
      maxResults?: number;
      minSimilarity?: number;
    } = {}
  ): Promise<RAGRecipeRecommendation[]> {
    await this.initialize();

    const {
      minLoves = 50,
      maxResults = 12,
      minSimilarity = 0.3
    } = options;

    try {
      // Create query embedding from user ingredients
      const queryContent = this.embeddingService.createQueryContent(ingredients);
      const queryEmbedding = await this.embeddingService.generateEmbedding(queryContent);

      // Use Supabase's vector similarity search
      const { data: similarRecipes, error } = await supabase.rpc('find_similar_recipes', {
        query_embedding: queryEmbedding,
        min_loves: minLoves,
        similarity_threshold: minSimilarity,
        match_count: maxResults
      });

      if (error) {
        console.error('Vector search error:', error);
        // Fallback to traditional method if vector search fails
        return this.getFallbackRecommendations(ingredients, options);
      }

      if (!similarRecipes || similarRecipes.length === 0) {
        console.log('No similar recipes found with vector search');
        return [];
      }

      // Convert to recommendations
      const recommendations = similarRecipes.map((result: any) => 
        this.convertToRecommendation(result, ingredients)
      );

      console.log(`Found ${recommendations.length} RAG recommendations`);
      return recommendations;
    } catch (error) {
      console.error('Error getting RAG recommendations:', error);
      // Fallback to traditional method
      return this.getFallbackRecommendations(ingredients, options);
    }
  }

  /**
   * Fallback method using traditional similarity calculation
   */
  private async getFallbackRecommendations(
    ingredients: Ingredient[],
    options: {
      minLoves?: number;
      maxResults?: number;
      minSimilarity?: number;
    }
  ): Promise<RAGRecipeRecommendation[]> {
    console.log('Using fallback recommendation method');
    
    const { minLoves = 50, maxResults = 12 } = options;

    try {
      // Simple fallback: get popular recipes and do basic ingredient matching
      const { data: recipes, error } = await supabase
        .from('dataset_recipes')
        .select('*')
        .is('user_id', null)
        .gte('loves_count', minLoves)
        .order('loves_count', { ascending: false })
        .limit(maxResults * 2); // Get more to filter

      if (error) throw error;
      if (!recipes) return [];

      const userIngredientNames = ingredients.map(ing => ing.name.toLowerCase());
      
      // Simple text-based matching as fallback
      const matchedRecipes = recipes
        .map(recipe => {
          const ingredientsText = recipe.ingredients.toLowerCase();
          const matchCount = userIngredientNames.filter(userIng => 
            ingredientsText.includes(userIng)
          ).length;
          
          return {
            ...recipe,
            similarity_score: matchCount / Math.max(userIngredientNames.length, 1)
          };
        })
        .filter(recipe => recipe.similarity_score > 0)
        .sort((a, b) => b.similarity_score - a.similarity_score)
        .slice(0, maxResults);

      return matchedRecipes.map(recipe => this.convertToRecommendation(recipe, ingredients));
    } catch (error) {
      console.error('Error in fallback recommendations:', error);
      return [];
    }
  }

  /**
   * Search recipes using semantic similarity
   */
  async semanticSearch(
    query: string,
    options: {
      maxResults?: number;
      minSimilarity?: number;
    } = {}
  ): Promise<RAGRecipeRecommendation[]> {
    await this.initialize();

    const { maxResults = 10, minSimilarity = 0.4 } = options;

    try {
      const queryEmbedding = await this.embeddingService.generateEmbedding(query);

      // Use Supabase's vector similarity search
      const { data: similarRecipes, error } = await supabase.rpc('search_recipes_by_text', {
        query_embedding: queryEmbedding,
        similarity_threshold: minSimilarity,
        match_count: maxResults
      });

      if (error) {
        console.error('Semantic search error:', error);
        return this.getFallbackSemanticSearch(query, options);
      }

      if (!similarRecipes) return [];

      return similarRecipes.map((result: any) => 
        this.convertToRecommendation(result, [])
      );
    } catch (error) {
      console.error('Error in semantic search:', error);
      return this.getFallbackSemanticSearch(query, options);
    }
  }

  /**
   * Fallback semantic search method
   */
  private async getFallbackSemanticSearch(
    query: string,
    options: { maxResults?: number; minSimilarity?: number }
  ): Promise<RAGRecipeRecommendation[]> {
    const { maxResults = 10 } = options;

    try {
      // Simple text search as fallback
      const { data: recipes, error } = await supabase
        .from('dataset_recipes')
        .select('*')
        .is('user_id', null)
        .or(`title.ilike.%${query}%,ingredients.ilike.%${query}%`)
        .order('loves_count', { ascending: false })
        .limit(maxResults);

      if (error) throw error;
      if (!recipes) return [];

      return recipes.map(recipe => this.convertToRecommendation({
        ...recipe,
        similarity_score: 0.5 // Default similarity for text search
      }, []));
    } catch (error) {
      console.error('Error in fallback semantic search:', error);
      return [];
    }
  }

  /**
   * Trigger background embedding sync manually (for testing)
   */
  async triggerBackgroundSync(): Promise<{ success: boolean; message: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('sync-embeddings');
      
      if (error) {
        console.error('Background sync error:', error);
        return { success: false, message: error.message };
      }

      console.log('Background sync result:', data);
      return { success: true, message: 'Background sync completed successfully' };
    } catch (error) {
      console.error('Error triggering background sync:', error);
      return { success: false, message: 'Failed to trigger background sync' };
    }
  }

  private convertToRecommendation(
    result: any,
    userIngredients: Ingredient[]
  ): RAGRecipeRecommendation {
    // Handle both direct recipe objects and search results
    const recipe = result.recipe || result;
    const similarity = result.similarity || result.similarity_score || 0;
    
    // Parse recipe data
    const ingredientsList = this.parseIngredients(recipe.ingredients);
    const stepsList = this.parseSteps(recipe.steps);
    
    // Generate relevance reasons
    const relevanceReasons = this.generateRelevanceReasons(
      { recipe, similarity },
      userIngredients,
      ingredientsList
    );

    // Estimate cooking parameters
    const estimatedPrepTime = Math.min(Math.max(ingredientsList.length * 2, 10), 30);
    const estimatedCookTime = Math.min(Math.max(stepsList.length * 4, 15), 60);
    const difficulty = this.estimateDifficulty(ingredientsList.length, stepsList.length);

    // Calculate confidence score
    const confidenceScore = this.calculateConfidenceScore(
      similarity,
      recipe.loves_count,
      ingredientsList.length,
      stepsList.length
    );

    return {
      id: recipe.id,
      name: recipe.title,
      description: `Resep dengan ${recipe.loves_count} likes - Tingkat kemiripan: ${Math.round(similarity * 100)}%`,
      prep_time: estimatedPrepTime,
      cook_time: estimatedCookTime,
      servings: 4,
      difficulty,
      instructions: stepsList,
      tags: this.extractSemanticTags(recipe.title, recipe.ingredients, similarity),
      user_id: 'dataset-rag',
      recipe_ingredients: ingredientsList.map((ing, index) => ({
        id: `${recipe.id}-ing-${index}`,
        recipe_id: recipe.id,
        name: ing,
        quantity: 1,
        unit: 'secukupnya',
      })),
      loves_count: recipe.loves_count,
      similarity_score: similarity,
      relevance_reasons: relevanceReasons,
      source_url: recipe.url,
      confidence_score: confidenceScore,
    };
  }

  private generateRelevanceReasons(
    context: { recipe: any; similarity: number },
    userIngredients: Ingredient[],
    recipeIngredients: string[]
  ): string[] {
    const reasons = [];
    const recipe = context.recipe;

    // Semantic similarity reason
    const similarityPercent = Math.round(context.similarity * 100);
    if (similarityPercent >= 70) {
      reasons.push(`Sangat cocok dengan bahan Anda (${similarityPercent}% kemiripan)`);
    } else if (similarityPercent >= 50) {
      reasons.push(`Cocok dengan bahan Anda (${similarityPercent}% kemiripan)`);
    } else if (similarityPercent > 0) {
      reasons.push(`Relevan dengan bahan Anda (${similarityPercent}% kemiripan)`);
    }

    // Popularity reason
    if (recipe.loves_count >= 1000) {
      reasons.push(`Sangat populer: ${recipe.loves_count.toLocaleString()} likes`);
    } else if (recipe.loves_count >= 500) {
      reasons.push(`Populer: ${recipe.loves_count.toLocaleString()} likes`);
    }

    // Ingredient matching (traditional approach as backup)
    if (userIngredients.length > 0) {
      const userIngredientNames = userIngredients.map(ing => ing.name.toLowerCase());
      const matchingIngredients = recipeIngredients.filter(recipeIng =>
        userIngredientNames.some(userIng =>
          recipeIng.toLowerCase().includes(userIng) || userIng.includes(recipeIng.toLowerCase())
        )
      );

      if (matchingIngredients.length > 0) {
        reasons.push(`Menggunakan bahan yang Anda miliki: ${matchingIngredients.slice(0, 3).join(', ')}`);
      }
    }

    // Complexity reason
    const stepCount = this.parseSteps(recipe.steps).length;
    if (stepCount <= 5) {
      reasons.push('Mudah dibuat (sedikit langkah)');
    }

    return reasons.slice(0, 4);
  }

  private calculateConfidenceScore(
    similarity: number,
    lovesCount: number,
    ingredientCount: number,
    stepCount: number
  ): number {
    const normalizedSimilarity = similarity;
    const normalizedPopularity = Math.min(lovesCount / 1000, 1);
    const normalizedComplexity = Math.max(0, 1 - (ingredientCount + stepCount) / 20);

    const confidence = (
      normalizedSimilarity * 0.5 +
      normalizedPopularity * 0.3 +
      normalizedComplexity * 0.2
    );

    return Math.round(confidence * 100) / 100;
  }

  private extractSemanticTags(title: string, ingredients: string, similarity: number): string[] {
    const tags = [];
    const titleLower = title.toLowerCase();
    const ingredientsLower = ingredients.toLowerCase();

    if (similarity >= 0.7) {
      tags.push('sangat-relevan');
    } else if (similarity >= 0.5) {
      tags.push('relevan');
    }

    const cuisineKeywords = {
      'indonesia': ['nasi', 'ayam', 'sambal', 'rendang', 'gudeg', 'soto'],
      'asia': ['mie', 'tahu', 'tempe', 'kecap'],
      'western': ['pasta', 'cheese', 'bread', 'butter'],
      'healthy': ['sayur', 'buah', 'diet', 'sehat', 'rendah'],
    };

    for (const [cuisine, keywords] of Object.entries(cuisineKeywords)) {
      if (keywords.some(keyword => titleLower.includes(keyword) || ingredientsLower.includes(keyword))) {
        tags.push(cuisine);
      }
    }

    const methods = ['goreng', 'bakar', 'rebus', 'tumis', 'kukus', 'panggang'];
    methods.forEach(method => {
      if (titleLower.includes(method)) {
        tags.push(method);
      }
    });

    return tags.slice(0, 5);
  }

  private parseIngredients(ingredientsText: string): string[] {
    if (!ingredientsText) return [];
    
    return ingredientsText
      .split(/[,\n\r•\-\*]/)
      .map(ing => ing.trim())
      .filter(ing => ing.length > 0 && ing.length < 100)
      .slice(0, 20);
  }

  private parseSteps(stepsText: string): string[] {
    if (!stepsText) return [];
    
    return stepsText
      .split(/[.\n\r]/)
      .map(step => step.trim())
      .filter(step => step.length > 10)
      .slice(0, 15);
  }

  private estimateDifficulty(ingredientCount: number, stepCount: number): 'easy' | 'medium' | 'hard' {
    const complexity = ingredientCount + stepCount * 1.5;
    
    if (complexity <= 10) return 'easy';
    if (complexity <= 20) return 'medium';
    return 'hard';
  }
}

export default RAGRecipeService;