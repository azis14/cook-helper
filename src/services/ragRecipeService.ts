import { supabase } from '../lib/supabase';
import { Ingredient, Recipe } from '../types';
import EmbeddingService from './embeddingService';
import GeminiService from './geminiService';

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
  private geminiService: GeminiService | null = null;
  private isInitialized = false;
  private aiAvailable = false;

  constructor() {
    this.embeddingService = new EmbeddingService();
    
    // Initialize Gemini service if API key is available
    const apiKey = import.meta.env.VITE_GOOGLE_AI_API_KEY;
    if (apiKey && apiKey.trim() && apiKey !== 'your_api_key_here') {
      try {
        this.geminiService = new GeminiService(apiKey);
        this.aiAvailable = true;
      } catch (error) {
        console.warn('Failed to initialize Gemini service:', error);
        this.aiAvailable = false;
      }
    } else {
      console.warn('Google AI API key not found or invalid. RAG service will work with limited functionality.');
      this.aiAvailable = false;
    }
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
      minLoves = 10,
      maxResults = 20,
      minSimilarity = 0.3
    } = options;

    try {
      // Create query embedding from user ingredients
      const queryContent = this.embeddingService.createQueryContent(ingredients);
      let queryEmbedding: number[];
      
      try {
        queryEmbedding = await this.embeddingService.generateEmbedding(queryContent);
      } catch (embeddingError) {
        console.warn('Failed to generate embedding, falling back to traditional method:', embeddingError);
        return this.getFallbackRecommendations(ingredients, options);
      }

      // Use Supabase's vector similarity search with increased limit
      const { data: similarRecipes, error } = await supabase.rpc('find_similar_recipes', {
        query_embedding: queryEmbedding,
        min_loves: minLoves,
        similarity_threshold: minSimilarity,
        match_count: Math.max(maxResults * 3, 60) // Get more results to ensure we have enough after processing
      });

      if (error) {
        console.error('Vector search error:', error);
        // Fallback to traditional method if vector search fails
        return this.getFallbackRecommendations(ingredients, options);
      }

      if (!similarRecipes || similarRecipes.length === 0) {
        console.log('No similar recipes found with vector search, trying fallback...');
        return this.getFallbackRecommendations(ingredients, options);
      }

      console.log(`Vector search returned ${similarRecipes.length} recipes`);

      // Process results with AI if available and working, otherwise use traditional conversion
      let recommendations: RAGRecipeRecommendation[];
      
      if (this.aiAvailable && this.geminiService && similarRecipes.length > 0) {
        try {
          recommendations = await this.processWithAI(similarRecipes, ingredients, maxResults);
        } catch (aiError) {
          console.warn('AI processing failed, falling back to traditional method:', aiError);
          this.aiAvailable = false; // Disable AI for subsequent calls
          recommendations = similarRecipes
            .slice(0, maxResults)
            .map((result: any) => this.convertToRecommendation(result, ingredients));
        }
      } else {
        recommendations = similarRecipes
          .slice(0, maxResults)
          .map((result: any) => this.convertToRecommendation(result, ingredients));
      }

      console.log(`Returning ${recommendations.length} RAG recommendations`);
      return recommendations;
    } catch (error) {
      console.error('Error getting RAG recommendations:', error);
      // Fallback to traditional method
      return this.getFallbackRecommendations(ingredients, options);
    }
  }

  /**
   * Process vector search results with AI to ensure proper format and quality
   */
  private async processWithAI(
    vectorResults: any[],
    userIngredients: Ingredient[],
    maxResults: number
  ): Promise<RAGRecipeRecommendation[]> {
    if (!this.geminiService || !this.aiAvailable) {
      throw new Error('AI service not available');
    }

    try {
      const ingredientList = userIngredients.map(ing => 
        `${ing.name} (${ing.quantity} ${ing.unit})`
      ).join(', ');

      // Process in smaller batches to avoid AI token limits
      const batchSize = 8;
      const allRecommendations: RAGRecipeRecommendation[] = [];

      for (let i = 0; i < vectorResults.length && allRecommendations.length < maxResults; i += batchSize) {
        const batch = vectorResults.slice(i, i + batchSize);
        const remainingSlots = maxResults - allRecommendations.length;
        const batchMaxResults = Math.min(remainingSlots, batchSize);

        try {
          // Prepare recipe references for AI
          const recipeReferences = batch.map((result, index) => ({
            index: index + 1,
            title: result.title,
            ingredients: result.ingredients,
            steps: result.steps,
            loves_count: result.loves_count,
            similarity_score: result.similarity_score
          }));

          const prompt = `
Saya memiliki bahan-bahan berikut: ${ingredientList}

Berdasarkan hasil pencarian vektor berikut, tolong pilih dan format ${batchMaxResults} resep terbaik yang paling cocok dengan bahan saya. Berikan respon dalam format JSON yang valid dengan struktur berikut:

REFERENSI RESEP DARI DATABASE:
${recipeReferences.map(ref => `
${ref.index}. ${ref.title} (${ref.loves_count} likes, ${Math.round(ref.similarity_score * 100)}% similarity)
   Bahan: ${ref.ingredients.substring(0, 200)}...
   Langkah: ${ref.steps.substring(0, 200)}...
`).join('\n')}

\`\`\`json
{
  "recipes": [
    {
      "referenceIndex": 1,
      "name": "Nama Resep yang Diperbaiki",
      "description": "Deskripsi singkat yang menarik",
      "ingredients": [
        {
          "name": "nama bahan",
          "quantity": 1,
          "unit": "satuan"
        }
      ],
      "instructions": [
        "Langkah 1 yang jelas",
        "Langkah 2 yang jelas"
      ],
      "prepTime": 15,
      "cookTime": 30,
      "servings": 4,
      "difficulty": "easy",
      "tags": ["tag1", "tag2"],
      "relevanceReasons": [
        "Alasan mengapa resep ini cocok",
        "Alasan kedua"
      ]
    }
  ]
}
\`\`\`

PENTING - ATURAN JSON YANG KETAT:
1. JSON format yang valid tanpa kesalahan sintaks
2. TIDAK ADA komentar dalam output JSON (tidak boleh ada // atau /* */)
3. Semua string dalam tanda kutip ganda
4. Semua angka tanpa tanda kutip
5. Tidak ada koma trailing
6. Tidak ada karakter khusus yang merusak JSON
7. Tidak ada baris kosong atau spasi berlebihan dalam JSON
8. Hanya output JSON murni tanpa teks tambahan
9. Pastikan semua kurung kurawal dan kurung siku tertutup dengan benar
10. Gunakan escape sequence yang benar untuk karakter khusus dalam string

Pastikan:
1. Pilih resep dengan similarity score tertinggi dan paling cocok dengan bahan yang tersedia
2. Perbaiki nama resep agar lebih menarik dan jelas
3. Buat deskripsi yang menarik dan informatif
4. Parsing bahan dengan benar dari teks mentah ke format terstruktur
5. Buat instruksi yang jelas dan mudah diikuti dari langkah mentah
6. Estimasi waktu yang realistis
7. Tentukan tingkat kesulitan yang sesuai
8. Berikan alasan relevansi yang spesifik
9. Urutkan berdasarkan kesesuaian dengan bahan yang tersedia
10. Jika bahan yang diperlukan hanya secukupnya, gunakan "secukupnya" sebagai unit dan 1 untuk quantity
11. Gunakan bahasa Indonesia yang baik dan benar
`;

          const result = await this.geminiService.generateContent(prompt);
          const response = await result.response;
          const text = response.text();

          // Extract JSON from markdown code block
          const jsonMatch = text.match(/```json\s*(\{[\s\S]*?\})\s*```/);
          if (!jsonMatch || !jsonMatch[1]) {
            console.warn('AI response format was unexpected for batch, falling back to traditional method');
            const fallbackBatch = batch
              .slice(0, batchMaxResults)
              .map((result: any) => this.convertToRecommendation(result, userIngredients));
            allRecommendations.push(...fallbackBatch);
            continue;
          }

          try {
            // Enhanced JSON cleaning to remove any potential comments or invalid characters
            let jsonString = jsonMatch[1];
            
            // Remove any line comments (// ...)
            jsonString = jsonString.replace(/\/\/.*$/gm, '');
            
            // Remove any block comments (/* ... */)
            jsonString = jsonString.replace(/\/\*[\s\S]*?\*\//g, '');
            
            // Remove trailing commas before closing brackets/braces
            jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1');
            
            // Remove any HTML-style comments
            jsonString = jsonString.replace(/<!--[\s\S]*?-->/g, '');
            
            // Clean up any malformed strings or extra characters
            jsonString = jsonString.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
            
            // Ensure proper string escaping
            jsonString = jsonString.replace(/\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, '\\\\');
            
            const parsedResponse = JSON.parse(jsonString);
            const batchRecommendations = this.convertAIResponseToRecommendations(parsedResponse, batch, userIngredients);
            allRecommendations.push(...batchRecommendations.slice(0, batchMaxResults));
          } catch (parseError) {
            console.warn('JSON parsing error for batch, using fallback:', parseError);
            const fallbackBatch = batch
              .slice(0, batchMaxResults)
              .map((result: any) => this.convertToRecommendation(result, userIngredients));
            allRecommendations.push(...fallbackBatch);
          }
        } catch (batchError) {
          console.warn('Error processing batch with AI, using fallback:', batchError);
          // Fallback to traditional method for this batch
          const fallbackBatch = batch
            .slice(0, batchMaxResults)
            .map((result: any) => this.convertToRecommendation(result, userIngredients));
          allRecommendations.push(...fallbackBatch);
        }

        // Add small delay between batches to avoid rate limiting
        if (i + batchSize < vectorResults.length && allRecommendations.length < maxResults) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      return allRecommendations.slice(0, maxResults);
    } catch (error) {
      console.error('Error processing with AI:', error);
      // Mark AI as unavailable and throw to trigger fallback
      this.aiAvailable = false;
      throw error;
    }
  }

  /**
   * Convert AI-processed response to our recommendation format
   */
  private convertAIResponseToRecommendations(
    aiResponse: any,
    originalResults: any[],
    userIngredients: Ingredient[]
  ): RAGRecipeRecommendation[] {
    if (!aiResponse.recipes || !Array.isArray(aiResponse.recipes)) {
      throw new Error('Invalid AI response format');
    }

    return aiResponse.recipes.map((aiRecipe: any, index: number) => {
      // Find the original result this AI recipe is based on
      const referenceIndex = aiRecipe.referenceIndex - 1;
      const originalResult = originalResults[referenceIndex] || originalResults[index] || originalResults[0];
      
      if (!originalResult) {
        throw new Error(`No original result found for AI recipe ${index}`);
      }

      // Calculate confidence score based on AI processing and original similarity
      const confidenceScore = this.calculateConfidenceScore(
        originalResult.similarity_score,
        originalResult.loves_count,
        aiRecipe.ingredients?.length || 5,
        aiRecipe.instructions?.length || 5
      );

      return {
        id: originalResult.id,
        name: aiRecipe.name || originalResult.title,
        description: aiRecipe.description || originalResult.title,
        prep_time: aiRecipe.prepTime || 15,
        cook_time: aiRecipe.cookTime || 30,
        servings: aiRecipe.servings || 4,
        difficulty: aiRecipe.difficulty || 'medium',
        instructions: aiRecipe.instructions || this.parseSteps(originalResult.steps),
        tags: aiRecipe.tags || this.extractSemanticTags(originalResult.title, originalResult.ingredients, originalResult.similarity_score),
        user_id: 'dataset-rag-ai',
        recipe_ingredients: (aiRecipe.ingredients || []).map((ing: any, ingIndex: number) => ({
          id: `${originalResult.id}-ai-ing-${ingIndex}`,
          recipe_id: originalResult.id,
          name: ing.name,
          quantity: ing.quantity || 1,
          unit: ing.unit || 'secukupnya',
        })),
        loves_count: originalResult.loves_count,
        similarity_score: originalResult.similarity_score,
        relevance_reasons: aiRecipe.relevanceReasons || this.generateRelevanceReasons(
          { recipe: originalResult, similarity: originalResult.similarity_score },
          userIngredients,
          (aiRecipe.ingredients || []).map((ing: any) => ing.name)
        ),
        source_url: originalResult.url,
        confidence_score: confidenceScore,
      };
    });
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
    
    const { minLoves = 10, maxResults = 20 } = options;

    try {
      // Simple fallback: get popular recipes and do basic ingredient matching
      const { data: recipes, error } = await supabase
        .from('dataset_recipes')
        .select('*')
        .is('user_id', null)
        .gte('loves_count', minLoves)
        .order('loves_count', { ascending: false })
        .limit(maxResults * 3); // Get more to filter

      if (error) throw error;
      if (!recipes) return [];

      console.log(`Fallback method found ${recipes.length} recipes`);

      const userIngredientNames = ingredients.map(ing => ing.name.toLowerCase());
      
      // Simple text-based matching as fallback
      const matchedRecipes = recipes
        .map(recipe => {
          const ingredientsText = recipe.ingredients.toLowerCase();
          const titleText = recipe.title.toLowerCase();
          
          let matchCount = 0;
          userIngredientNames.forEach(userIng => {
            if (ingredientsText.includes(userIng) || titleText.includes(userIng)) {
              matchCount++;
            }
          });
          
          // Also give points for popular recipes
          const popularityScore = Math.min(recipe.loves_count / 1000, 1);
          const totalScore = (matchCount / Math.max(userIngredientNames.length, 1)) * 0.7 + popularityScore * 0.3;
          
          return {
            ...recipe,
            similarity_score: totalScore
          };
        })
        .filter(recipe => recipe.similarity_score > 0.1) // Lower threshold for fallback
        .sort((a, b) => b.similarity_score - a.similarity_score)
        .slice(0, maxResults);

      console.log(`Fallback method returning ${matchedRecipes.length} recipes`);
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

    const { maxResults = 20, minSimilarity = 0.3 } = options;

    try {
      let queryEmbedding: number[];
      
      try {
        queryEmbedding = await this.embeddingService.generateEmbedding(query);
      } catch (embeddingError) {
        console.warn('Failed to generate embedding for semantic search, falling back:', embeddingError);
        return this.getFallbackSemanticSearch(query, options);
      }

      // Use Supabase's vector similarity search
      const { data: similarRecipes, error } = await supabase.rpc('search_recipes_by_text', {
        query_embedding: queryEmbedding,
        similarity_threshold: minSimilarity,
        match_count: maxResults * 2
      });

      if (error) {
        console.error('Semantic search error:', error);
        return this.getFallbackSemanticSearch(query, options);
      }

      if (!similarRecipes) return [];

      // Process with AI if available
      if (this.aiAvailable && this.geminiService && similarRecipes.length > 0) {
        try {
          return await this.processSemanticSearchWithAI(similarRecipes, query, maxResults);
        } catch (aiError) {
          console.warn('AI processing failed for semantic search, using traditional method:', aiError);
          this.aiAvailable = false;
        }
      }

      return similarRecipes
        .slice(0, maxResults)
        .map((result: any) => this.convertToRecommendation(result, []));
    } catch (error) {
      console.error('Error in semantic search:', error);
      return this.getFallbackSemanticSearch(query, options);
    }
  }

  /**
   * Process semantic search results with AI
   */
  private async processSemanticSearchWithAI(
    vectorResults: any[],
    query: string,
    maxResults: number
  ): Promise<RAGRecipeRecommendation[]> {
    if (!this.geminiService || !this.aiAvailable) {
      throw new Error('AI service not available');
    }

    try {
      const recipeReferences = vectorResults.slice(0, Math.min(vectorResults.length, 6)).map((result, index) => ({
        index: index + 1,
        title: result.title,
        ingredients: result.ingredients,
        steps: result.steps,
        loves_count: result.loves_count,
        similarity_score: result.similarity_score
      }));

      const prompt = `
Berdasarkan pencarian "${query}", tolong pilih dan format ${maxResults} resep terbaik dari hasil berikut:

REFERENSI RESEP:
${recipeReferences.map(ref => `
${ref.index}. ${ref.title} (${ref.loves_count} likes, ${Math.round(ref.similarity_score * 100)}% similarity)
   Bahan: ${ref.ingredients.substring(0, 200)}...
   Langkah: ${ref.steps.substring(0, 200)}...
`).join('\n')}

Format dalam JSON yang sama seperti sebelumnya, fokus pada resep yang paling relevan dengan pencarian "${query}".

\`\`\`json
{
  "recipes": [
    {
      "referenceIndex": 1,
      "name": "Nama Resep",
      "description": "Deskripsi menarik",
      "ingredients": [
        {
          "name": "nama bahan",
          "quantity": 1,
          "unit": "satuan"
        }
      ],
      "instructions": [
        "Langkah 1",
        "Langkah 2"
      ],
      "prepTime": 15,
      "cookTime": 30,
      "servings": 4,
      "difficulty": "easy",
      "tags": ["tag1", "tag2"],
      "relevanceReasons": [
        "Relevan dengan pencarian '${query}'",
        "Alasan lainnya"
      ]
    }
  ]
}
\`\`\`

PENTING - ATURAN JSON YANG KETAT:
1. JSON format yang valid tanpa kesalahan sintaks
2. TIDAK ADA komentar dalam output JSON (tidak boleh ada // atau /* */ atau komentar apapun)
3. Semua string dalam tanda kutip ganda
4. Semua angka tanpa tanda kutip
5. Tidak ada koma trailing
6. Tidak ada karakter khusus yang merusak JSON
7. Tidak ada baris kosong atau spasi berlebihan dalam JSON
8. Hanya output JSON murni tanpa teks tambahan
9. Pastikan semua kurung kurawal dan kurung siku tertutup dengan benar
10. Gunakan escape sequence yang benar untuk karakter khusus dalam string
11. Tidak boleh ada kata "Tambahkan" atau komentar lainnya dalam JSON
12. Output harus berupa JSON yang bisa langsung di-parse tanpa error
13. Jika bahan yang diperlukan hanya secukupnya, gunakan "secukupnya" sebagai unit dan 1 untuk quantity
`;

      const result = await this.geminiService.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/```json\s*(\{[\s\S]*?\})\s*```/);
      if (!jsonMatch || !jsonMatch[1]) {
        return vectorResults
          .slice(0, maxResults)
          .map((result: any) => this.convertToRecommendation(result, []));
      }

      try {
        // Enhanced JSON cleaning to remove any potential comments or invalid characters
        let jsonString = jsonMatch[1];
        
        // Remove any line comments (// ...)
        jsonString = jsonString.replace(/\/\/.*$/gm, '');
        
        // Remove any block comments (/* ... */)
        jsonString = jsonString.replace(/\/\*[\s\S]*?\*\//g, '');
        
        // Remove trailing commas before closing brackets/braces
        jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1');
        
        // Remove any HTML-style comments
        jsonString = jsonString.replace(/<!--[\s\S]*?-->/g, '');
        
        // Clean up any malformed strings or extra characters
        jsonString = jsonString.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
        
        // Ensure proper string escaping
        jsonString = jsonString.replace(/\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, '\\\\');
        
        // Remove any Indonesian comments that might appear
        jsonString = jsonString.replace(/\s*\/\/\s*Tambahk.*$/gm, '');
        jsonString = jsonString.replace(/\s*\/\*\s*Tambahk[\s\S]*?\*\//g, '');
        
        const parsedResponse = JSON.parse(jsonString);
        return this.convertAIResponseToRecommendations(parsedResponse, vectorResults, []);
      } catch (parseError) {
        console.error('JSON parsing error in semantic search:', parseError);
        return vectorResults
          .slice(0, maxResults)
          .map((result: any) => this.convertToRecommendation(result, []));
      }
    } catch (error) {
      console.error('Error processing semantic search with AI:', error);
      throw error;
    }
  }

  /**
   * Fallback semantic search method
   */
  private async getFallbackSemanticSearch(
    query: string,
    options: { maxResults?: number; minSimilarity?: number }
  ): Promise<RAGRecipeRecommendation[]> {
    const { maxResults = 20 } = options;

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

  /**
   * Check if AI features are available
   */
  isAIAvailable(): boolean {
    return this.aiAvailable;
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
      description: recipe.title, // Use title as description for cleaner format
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