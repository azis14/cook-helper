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

class RAGRecipeService {
  private embeddingService: EmbeddingService;
  private recipeEmbeddings: Map<string, number[]> = new Map();
  private isInitialized = false;

  constructor() {
    this.embeddingService = new EmbeddingService();
  }

  /**
   * Initialize the service by loading and processing recipe embeddings
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('Initializing RAG Recipe Service...');
      
      // Load popular recipes from dataset
      const { data: recipes, error } = await supabase
        .from('dataset_recipes')
        .select('*')
        .is('user_id', null)
        .gte('loves_count', 50)
        .order('loves_count', { ascending: false })
        .limit(1000); // Process top 1000 recipes

      if (error) throw error;

      if (!recipes || recipes.length === 0) {
        console.warn('No recipes found in dataset');
        return;
      }

      console.log(`Processing ${recipes.length} recipes for embeddings...`);

      // Process recipes in batches to avoid overwhelming the system
      const batchSize = 50;
      for (let i = 0; i < recipes.length; i += batchSize) {
        const batch = recipes.slice(i, i + batchSize);
        await this.processBatch(batch);
        
        // Add small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      this.isInitialized = true;
      console.log(`RAG Recipe Service initialized with ${this.recipeEmbeddings.size} recipe embeddings`);
    } catch (error) {
      console.error('Error initializing RAG Recipe Service:', error);
      // Continue with limited functionality
      this.isInitialized = true;
    }
  }

  private async processBatch(recipes: any[]): Promise<void> {
    const promises = recipes.map(async (recipe) => {
      try {
        const content = this.embeddingService.createRecipeContent(recipe);
        const embedding = await this.embeddingService.generateEmbedding(content);
        this.recipeEmbeddings.set(recipe.id, embedding);
      } catch (error) {
        console.error(`Error processing recipe ${recipe.id}:`, error);
      }
    });

    await Promise.all(promises);
  }

  /**
   * Get RAG-based recipe recommendations
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

      // Get recipes from database
      const { data: recipes, error } = await supabase
        .from('dataset_recipes')
        .select('*')
        .is('user_id', null)
        .gte('loves_count', minLoves)
        .order('loves_count', { ascending: false })
        .limit(500);

      if (error) throw error;
      if (!recipes || recipes.length === 0) return [];

      // Calculate similarities and rank recipes
      const rankedRecipes = await this.rankRecipesBySimilarity(
        recipes,
        queryEmbedding,
        ingredients,
        minSimilarity
      );

      // Convert to recommendations
      const recommendations = rankedRecipes
        .slice(0, maxResults)
        .map(context => this.convertToRecommendation(context, ingredients));

      return recommendations;
    } catch (error) {
      console.error('Error getting RAG recommendations:', error);
      throw new Error('Gagal mendapatkan rekomendasi resep');
    }
  }

  private async rankRecipesBySimilarity(
    recipes: any[],
    queryEmbedding: number[],
    ingredients: Ingredient[],
    minSimilarity: number
  ): Promise<RecipeContext[]> {
    const contexts: RecipeContext[] = [];

    for (const recipe of recipes) {
      try {
        let recipeEmbedding = this.recipeEmbeddings.get(recipe.id);
        
        if (!recipeEmbedding) {
          // Generate embedding on-the-fly if not cached
          const content = this.embeddingService.createRecipeContent(recipe);
          recipeEmbedding = await this.embeddingService.generateEmbedding(content);
          this.recipeEmbeddings.set(recipe.id, recipeEmbedding);
        }

        const similarity = this.embeddingService.calculateSimilarity(
          queryEmbedding,
          recipeEmbedding
        );

        if (similarity >= minSimilarity) {
          contexts.push({
            recipe,
            content: this.embeddingService.createRecipeContent(recipe),
            embedding: recipeEmbedding,
            similarity
          });
        }
      } catch (error) {
        console.error(`Error processing recipe ${recipe.id}:`, error);
      }
    }

    // Sort by similarity score combined with popularity
    return contexts.sort((a, b) => {
      const scoreA = a.similarity * 0.7 + (a.recipe.loves_count / 10000) * 0.3;
      const scoreB = b.similarity * 0.7 + (b.recipe.loves_count / 10000) * 0.3;
      return scoreB - scoreA;
    });
  }

  private convertToRecommendation(
    context: RecipeContext,
    userIngredients: Ingredient[]
  ): RAGRecipeRecommendation {
    const recipe = context.recipe;
    
    // Parse recipe data
    const ingredientsList = this.parseIngredients(recipe.ingredients);
    const stepsList = this.parseSteps(recipe.steps);
    
    // Generate relevance reasons based on semantic similarity
    const relevanceReasons = this.generateRelevanceReasons(
      context,
      userIngredients,
      ingredientsList
    );

    // Estimate cooking parameters
    const estimatedPrepTime = Math.min(Math.max(ingredientsList.length * 2, 10), 30);
    const estimatedCookTime = Math.min(Math.max(stepsList.length * 4, 15), 60);
    const difficulty = this.estimateDifficulty(ingredientsList.length, stepsList.length);

    // Calculate confidence score
    const confidenceScore = this.calculateConfidenceScore(
      context.similarity,
      recipe.loves_count,
      ingredientsList.length,
      stepsList.length
    );

    return {
      id: recipe.id,
      name: recipe.title,
      description: `Resep dengan ${recipe.loves_count} likes - Tingkat kemiripan: ${Math.round(context.similarity * 100)}%`,
      prep_time: estimatedPrepTime,
      cook_time: estimatedCookTime,
      servings: 4,
      difficulty,
      instructions: stepsList,
      tags: this.extractSemanticTags(recipe.title, recipe.ingredients, context.similarity),
      user_id: 'dataset-rag',
      recipe_ingredients: ingredientsList.map((ing, index) => ({
        id: `${recipe.id}-ing-${index}`,
        recipe_id: recipe.id,
        name: ing,
        quantity: 1,
        unit: 'secukupnya',
      })),
      loves_count: recipe.loves_count,
      similarity_score: context.similarity,
      relevance_reasons: relevanceReasons,
      source_url: recipe.url,
      confidence_score: confidenceScore,
    };
  }

  private generateRelevanceReasons(
    context: RecipeContext,
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
    } else {
      reasons.push(`Relevan dengan bahan Anda (${similarityPercent}% kemiripan)`);
    }

    // Popularity reason
    if (recipe.loves_count >= 1000) {
      reasons.push(`Sangat populer: ${recipe.loves_count.toLocaleString()} likes`);
    } else if (recipe.loves_count >= 500) {
      reasons.push(`Populer: ${recipe.loves_count.toLocaleString()} likes`);
    }

    // Ingredient matching (traditional approach as backup)
    const userIngredientNames = userIngredients.map(ing => ing.name.toLowerCase());
    const matchingIngredients = recipeIngredients.filter(recipeIng =>
      userIngredientNames.some(userIng =>
        recipeIng.toLowerCase().includes(userIng) || userIng.includes(recipeIng.toLowerCase())
      )
    );

    if (matchingIngredients.length > 0) {
      reasons.push(`Menggunakan bahan yang Anda miliki: ${matchingIngredients.slice(0, 3).join(', ')}`);
    }

    // Complexity reason
    const stepCount = this.parseSteps(recipe.steps).length;
    if (stepCount <= 5) {
      reasons.push('Mudah dibuat (sedikit langkah)');
    }

    return reasons.slice(0, 4); // Limit to 4 reasons
  }

  private calculateConfidenceScore(
    similarity: number,
    lovesCount: number,
    ingredientCount: number,
    stepCount: number
  ): number {
    // Normalize factors
    const normalizedSimilarity = similarity; // Already 0-1
    const normalizedPopularity = Math.min(lovesCount / 1000, 1); // Cap at 1000 likes
    const normalizedComplexity = Math.max(0, 1 - (ingredientCount + stepCount) / 20); // Simpler = higher confidence

    // Weighted combination
    const confidence = (
      normalizedSimilarity * 0.5 +
      normalizedPopularity * 0.3 +
      normalizedComplexity * 0.2
    );

    return Math.round(confidence * 100) / 100; // Round to 2 decimal places
  }

  private extractSemanticTags(title: string, ingredients: string, similarity: number): string[] {
    const tags = [];
    const titleLower = title.toLowerCase();
    const ingredientsLower = ingredients.toLowerCase();

    // High confidence tags based on similarity
    if (similarity >= 0.7) {
      tags.push('sangat-relevan');
    } else if (similarity >= 0.5) {
      tags.push('relevan');
    }

    // Semantic cuisine detection
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

    // Cooking method detection
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

      const { data: recipes, error } = await supabase
        .from('dataset_recipes')
        .select('*')
        .is('user_id', null)
        .order('loves_count', { ascending: false })
        .limit(500);

      if (error) throw error;
      if (!recipes) return [];

      const contexts: RecipeContext[] = [];

      for (const recipe of recipes) {
        let recipeEmbedding = this.recipeEmbeddings.get(recipe.id);
        
        if (!recipeEmbedding) {
          const content = this.embeddingService.createRecipeContent(recipe);
          recipeEmbedding = await this.embeddingService.generateEmbedding(content);
          this.recipeEmbeddings.set(recipe.id, recipeEmbedding);
        }

        const similarity = this.embeddingService.calculateSimilarity(
          queryEmbedding,
          recipeEmbedding
        );

        if (similarity >= minSimilarity) {
          contexts.push({
            recipe,
            content: this.embeddingService.createRecipeContent(recipe),
            embedding: recipeEmbedding,
            similarity
          });
        }
      }

      return contexts
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, maxResults)
        .map(context => this.convertToRecommendation(context, []));
    } catch (error) {
      console.error('Error in semantic search:', error);
      throw new Error('Gagal melakukan pencarian semantik');
    }
  }
}

export default RAGRecipeService;