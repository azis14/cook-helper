import { GoogleGenerativeAI } from '@google/generative-ai';
import { Ingredient, Recipe } from '../types';

interface GeminiRecipeSuggestion {
  name: string;
  description: string;
  ingredients: Array<{
    name: string;
    quantity: number;
    unit: string;
  }>;
  instructions: string[];
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
}

class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
  }

  async generateRecipeSuggestions(ingredients: Ingredient[]): Promise<Recipe[]> {
    try {
      const ingredientList = ingredients.map(ing => 
        `${ing.name} (${ing.quantity} ${ing.unit})`
      ).join(', ');

      const prompt = `
Saya memiliki bahan-bahan berikut di dapur: ${ingredientList}

Tolong buatkan 3 resep masakan Indonesia yang bisa dibuat dengan bahan-bahan tersebut. 
Berikan respon dalam format JSON yang valid dengan struktur berikut:

{
  "recipes": [
    {
      "name": "Nama Resep",
      "description": "Deskripsi singkat resep",
      "ingredients": [
        {
          "name": "nama bahan",
          "quantity": jumlah,
          "unit": "satuan"
        }
      ],
      "instructions": [
        "Langkah 1",
        "Langkah 2",
        "dst..."
      ],
      "prepTime": waktu_persiapan_dalam_menit,
      "cookTime": waktu_memasak_dalam_menit,
      "servings": jumlah_porsi,
      "difficulty": "easy/medium/hard",
      "tags": ["tag1", "tag2"]
    }
  ]
}

Pastikan:
1. Resep menggunakan bahan yang tersedia
2. Instruksi jelas dan mudah diikuti
3. Waktu realistis
4. Sesuai dengan selera Indonesia
5. JSON format yang valid tanpa komentar
`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid JSON response from Gemini');
      }

      const parsedResponse = JSON.parse(jsonMatch[0]);
      
      // Convert to Recipe format
      const recipes: Recipe[] = parsedResponse.recipes.map((recipe: GeminiRecipeSuggestion, index: number) => ({
        id: `gemini-${Date.now()}-${index}`,
        name: recipe.name,
        description: recipe.description,
        prep_time: recipe.prepTime,
        cook_time: recipe.cookTime,
        servings: recipe.servings,
        difficulty: recipe.difficulty,
        instructions: recipe.instructions,
        tags: recipe.tags,
        user_id: 'ai-generated',
        recipe_ingredients: recipe.ingredients.map((ing, ingIndex) => ({
          id: `ing-${Date.now()}-${index}-${ingIndex}`,
          recipe_id: `gemini-${Date.now()}-${index}`,
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
        })),
      }));

      return recipes;
    } catch (error) {
      console.error('Error generating recipe suggestions:', error);
      throw new Error('Gagal membuat saran resep dengan AI. Silakan coba lagi.');
    }
  }

  async generateShoppingList(recipes: Recipe[]): Promise<string[]> {
    try {
      const recipeNames = recipes.map(r => r.name).join(', ');
      
      const prompt = `
Berdasarkan resep-resep berikut: ${recipeNames}

Buatkan daftar belanja yang efisien untuk membeli bahan-bahan yang diperlukan.
Kelompokkan berdasarkan kategori (sayuran, daging, bumbu, dll) dan berikan dalam format JSON:

{
  "shoppingList": [
    {
      "category": "Kategori",
      "items": ["item1", "item2"]
    }
  ]
}
`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return [];
      }

      const parsedResponse = JSON.parse(jsonMatch[0]);
      return parsedResponse.shoppingList || [];
    } catch (error) {
      console.error('Error generating shopping list:', error);
      return [];
    }
  }

  async getCookingTips(recipeName: string): Promise<string[]> {
    try {
      const prompt = `
Berikan 3-5 tips memasak untuk resep "${recipeName}" dalam format JSON:

{
  "tips": [
    "Tip 1",
    "Tip 2",
    "Tip 3"
  ]
}
`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return [];
      }

      const parsedResponse = JSON.parse(jsonMatch[0]);
      return parsedResponse.tips || [];
    } catch (error) {
      console.error('Error getting cooking tips:', error);
      return [];
    }
  }
}

export default GeminiService;