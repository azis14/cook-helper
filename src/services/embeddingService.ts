import { supabase } from '../lib/supabase';

export interface RecipeEmbedding {
  id: string;
  recipe_id: string;
  content: string;
  embedding: number[];
  created_at?: string;
}

class EmbeddingService {
  private readonly EMBEDDING_DIMENSION = 384; // Using a smaller model for efficiency

  /**
   * Generate embeddings using Supabase Edge Functions with a local embedding model
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      // Clean and prepare text
      const cleanText = this.preprocessText(text);
      
      // Call Supabase Edge Function for embedding generation
      const { data, error } = await supabase.functions.invoke('generate-embedding', {
        body: { text: cleanText }
      });

      if (error) {
        console.error('Embedding generation error:', error);
        // Fallback to simple text-based embedding
        return this.generateSimpleEmbedding(cleanText);
      }

      return data.embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      // Fallback to simple text-based embedding
      return this.generateSimpleEmbedding(text);
    }
  }

  /**
   * Fallback method: Generate simple embeddings based on text features
   */
  private generateSimpleEmbedding(text: string): number[] {
    const words = text.toLowerCase().split(/\s+/);
    const embedding = new Array(this.EMBEDDING_DIMENSION).fill(0);
    
    // Create a simple hash-based embedding
    words.forEach((word, index) => {
      if (word.length > 2) {
        const hash = this.simpleHash(word);
        const position = Math.abs(hash) % this.EMBEDDING_DIMENSION;
        embedding[position] += 1 / (index + 1); // Weight by position
      }
    });

    // Normalize the embedding
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      return embedding.map(val => val / magnitude);
    }
    
    return embedding;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      return 0;
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  /**
   * Preprocess text for better embedding quality
   */
  private preprocessText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .substring(0, 1000); // Limit length
  }

  /**
   * Create searchable content from recipe data
   */
  createRecipeContent(recipe: any): string {
    const parts = [
      recipe.title || '',
      recipe.ingredients || '',
      recipe.steps || '',
    ];
    
    return parts
      .filter(part => part && part.length > 0)
      .join(' ')
      .substring(0, 2000); // Limit total content length
  }

  /**
   * Create query content from user ingredients
   */
  createQueryContent(ingredients: Array<{name: string, category?: string}>): string {
    const ingredientNames = ingredients.map(ing => ing.name).join(' ');
    const categories = ingredients
      .map(ing => ing.category)
      .filter(cat => cat)
      .join(' ');
    
    return `${ingredientNames} ${categories}`.trim();
  }
}

export default EmbeddingService;