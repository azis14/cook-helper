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
  private embeddingCache: Map<string, number[]> = new Map();

  constructor() {
    this.embeddingService = new EmbeddingService();
  }

  /**
   * Initialize the service by ensuring all recipes have embeddings in the database
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('Initializing RAG Recipe Service with Supabase vector storage...');
      
      // Load existing embeddings from database into cache
      await this.loadEmbeddingsFromDatabase();
      
      // Check for recipes without embeddings and generate them
      await this.generateMissingEmbeddings();

      this.isInitialized = true;
      console.log(`RAG Recipe Service initialized with ${this.embeddingCache.size} cached embeddings`);
    } catch (error) {
      console.error('Error initializing RAG Recipe Service:', error);
      // Continue with limited functionality
      this.isInitialized = true;
    }
  }

  /**
   * Load existing embeddings from Supabase into local cache
   */
  private async loadEmbeddingsFromDatabase(): Promise<void> {
    try {
      const { data: embeddings, error } = await supabase
        .from('recipe_embeddings')
        .select('recipe_id, embedding');

      if (error) throw error;

      if (embeddings) {
        embeddings.forEach(embedding => {
          this.embeddingCache.set(embedding.recipe_id, embedding.embedding);
        });
        console.log(`Loaded ${embeddings.length} embeddings from database`);
      }
    } catch (error) {
      console.error('Error loading embeddings from database:', error);
    }
  }

  /**
   * Generate embeddings for recipes that don't have them yet
   */
  private async generateMissingEmbeddings(): Promise<void> {
    try {
      // Get recipes that don't have embeddings yet
      const { data: recipesWithoutEmbeddings, error } = await supabase
        .from('dataset_recipes')
        .select('id, title, ingredients, steps')
        .is('user_id', null)
        .gte('loves_count', 50)
        .not('id', 'in', `(${Array.from(this.embeddingCache.keys()).map(id => `'${id}'`).join(',') || "''"})`)
        .limit(100); // Process in batches

      if (error) throw error;

      if (!recipesWithoutEmbeddings || recipesWithoutEmbeddings.length === 0) {
        console.log('All recipes already have embeddings');
        return;
      }

      console.log(`Generating embeddings for ${recipesWithoutEmbeddings.length} recipes...`);

      // Process recipes in smaller batches to avoid overwhelming the system
      const batchSize = 10;
      for (let i = 0; i < recipesWithoutEmbeddings.length; i += batchSize) {
        const batch = recipesWithoutEmbeddings.slice(i, i + batchSize);
        await this.processBatchWithDatabase(batch);
        
        // Add delay between batches
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } catch (error) {
      console.error('Error generating missing embeddings:', error);
    }
  }

  /**
   * Process a batch of recipes and store embeddings in database
   */
  private async processBatchWithDatabase(recipes: any[]): Promise<void> {
    const embeddingsToInsert = [];

    for (const recipe of recipes) {
      try {
        const content = this.embeddingService.createRecipeContent(recipe);
        const embedding = await this.embeddingService.generateEmbedding(content);
        
        // Add to cache
        this.embeddingCache.set(recipe.id, embedding);
        
        // Prepare for database insertion
        embeddingsToInsert.push({
          recipe_id: recipe.id,
          embedding: embedding,
          content: content
        });
      } catch (error) {
        console.error(`Error processing recipe ${recipe.id}:`, error);
      }
    }

    // Insert embeddings into database
    if (embeddingsToInsert.length > 0) {
      const { error } = await supabase
        .from('recipe_embeddings')
        .upsert(embeddingsToInsert, { 
          onConflict: 'recipe_id',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error('Error inserting embeddings:', error);
      } else {
        console.log(`Inserted ${embeddingsToInsert.length} embeddings into database`);
      }
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
        // Fallback to traditional method
        return this.getFallbackRecommendations(ingredients, options);
      }

      if (!similarRecipes || similarRecipes.length === 0) {
        return [];
      }

      // Convert to recommendations
      const recommendations = similarRecipes.map((result: any) => 
        this.convertToRecommendation(result, ingredients)
      );

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
    const { minLoves = 50, maxResults = 12, minSimilarity = 0.3 } = options;

    try {
      const queryContent = this.embeddingService.createQueryContent(ingredients);
      const queryEmbedding = await this.embeddingService.generateEmbedding(queryContent);

      const { data: recipes, error } = await supabase
        .from('dataset_recipes')
        .select('*')
        .is('user_id', null)
        .gte('loves_count', minLoves)
        .order('loves_count', { ascending: false })
        .limit(200);

      if (error) throw error;
      if (!recipes) return [];

      const contexts: RecipeContext[] = [];

      for (const recipe of recipes) {
        let recipeEmbedding = this.embeddingCache.get(recipe.id);
        
        if (!recipeEmbedding) {
          const content = this.embeddingService.createRecipeContent(recipe);
          recipeEmbedding = await this.embeddingService.generateEmbedding(content);
          this.embeddingCache.set(recipe.id, recipeEmbedding);
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
        .map(context => this.convertToRecommendation(context, ingredients));
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
        // Fallback to traditional search
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
    const { maxResults = 10, minSimilarity = 0.4 } = options;

    try {
      const queryEmbedding = await this.embeddingService.generateEmbedding(query);

      const { data: recipes, error } = await supabase
        .from('dataset_recipes')
        .select('*')
        .is('user_id', null)
        .order('loves_count', { ascending: false })
        .limit(200);

      if (error) throw error;
      if (!recipes) return [];

      const contexts: RecipeContext[] = [];

      for (const recipe of recipes) {
        let recipeEmbedding = this.embeddingCache.get(recipe.id);
        
        if (!recipeEmbedding) {
          const content = this.embeddingService.createRecipeContent(recipe);
          recipeEmbedding = await this.embeddingService.generateEmbedding(content);
          this.embeddingCache.set(recipe.id, recipeEmbedding);
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
      console.error('Error in fallback semantic search:', error);
      return [];
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