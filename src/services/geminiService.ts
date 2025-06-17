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
    this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  }

  async generateRecipeSuggestions(ingredients: Ingredient[]): Promise<Recipe[]> {
    try {
      const ingredientList = ingredients.map(ing => 
        `${ing.name} (${ing.quantity} ${ing.unit})`
      ).join(', ');

      const prompt = `
Saya memiliki bahan-bahan berikut di dapur: ${ingredientList}

Tolong buatkan 3 resep masakan Indonesia yang bisa dibuat dengan bahan-bahan tersebut. 
Berikan respon dalam format JSON yang valid dengan struktur berikut, dan pastikan untuk membungkus JSON dalam markdown code block:

\`\`\`json
{
  "recipes": [
    {
      "name": "Nama Resep",
      "description": "Deskripsi singkat resep",
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
      "tags": ["tag1", "tag2"]
    }
  ]
}
\`\`\`

Pastikan:
1. Resep menggunakan bahan yang tersedia
2. Instruksi jelas dan mudah diikuti
3. Waktu realistis
4. Sesuai dengan selera Indonesia
5. JSON format yang valid tanpa komentar
6. Semua string dalam tanda kutip ganda
7. Semua angka tanpa tanda kutip
8. Tidak ada koma trailing
`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Extract JSON from markdown code block
      const jsonMatch = text.match(/```json\s*(\{[\s\S]*?\})\s*```/);
      if (!jsonMatch || !jsonMatch[1]) {
        // Fallback to original regex if markdown format not found
        const fallbackMatch = text.match(/\{[\s\S]*\}/);
        if (!fallbackMatch) {
          throw new Error('Invalid JSON response from Gemini');
        }
        
        const parsedResponse = JSON.parse(fallbackMatch[0]);
        return this.convertToRecipeFormat(parsedResponse);
      }

      const parsedResponse = JSON.parse(jsonMatch[1]);
      return this.convertToRecipeFormat(parsedResponse);
    } catch (error) {
      console.error('Error generating recipe suggestions:', error);
      throw new Error('Gagal membuat saran resep dengan AI. Silakan coba lagi.');
    }
  }

  private convertToRecipeFormat(parsedResponse: any): Recipe[] {
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
  }

  async generateShoppingList(recipes: Recipe[]): Promise<string[]> {
    try {
      const recipeNames = recipes.map(r => r.name).join(', ');
      
      const prompt = `
Berdasarkan resep-resep berikut: ${recipeNames}

Buatkan daftar belanja yang efisien untuk membeli bahan-bahan yang diperlukan.
Kelompokkan berdasarkan kategori (sayuran, daging, bumbu, dll) dan berikan dalam format JSON yang dibungkus dalam markdown code block:

\`\`\`json
{
  "shoppingList": [
    {
      "category": "Kategori",
      "items": ["item1", "item2"]
    }
  ]
}
\`\`\`
`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/```json\s*(\{[\s\S]*?\})\s*```/);
      if (!jsonMatch || !jsonMatch[1]) {
        // Fallback to original regex
        const fallbackMatch = text.match(/\{[\s\S]*\}/);
        if (!fallbackMatch) {
          return [];
        }
        const parsedResponse = JSON.parse(fallbackMatch[0]);
        return parsedResponse.shoppingList || [];
      }

      const parsedResponse = JSON.parse(jsonMatch[1]);
      return parsedResponse.shoppingList || [];
    } catch (error) {
      console.error('Error generating shopping list:', error);
      return [];
    }
  }

  async getCookingTips(recipeName: string): Promise<string[]> {
    try {
      const prompt = `
Berikan 3-5 tips memasak untuk resep "${recipeName}" dalam format JSON yang dibungkus dalam markdown code block:

\`\`\`json
{
  "tips": [
    "Tip 1",
    "Tip 2",
    "Tip 3"
  ]
}
\`\`\`
`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/```json\s*(\{[\s\S]*?\})\s*```/);
      if (!jsonMatch || !jsonMatch[1]) {
        // Fallback to original regex
        const fallbackMatch = text.match(/\{[\s\S]*\}/);
        if (!fallbackMatch) {
          return [];
        }
        const parsedResponse = JSON.parse(fallbackMatch[0]);
        return parsedResponse.tips || [];
      }

      const parsedResponse = JSON.parse(jsonMatch[1]);
      return parsedResponse.tips || [];
    } catch (error) {
      console.error('Error getting cooking tips:', error);
      return [];
    }
  }
}

export default GeminiService;