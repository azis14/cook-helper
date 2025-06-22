import React, { useState } from 'react';
import { Calendar, ShoppingCart, Clock, Users, Plus, Trash2, RefreshCw, ChefHat, Sparkles, Database, CheckCircle, Eye, Save } from 'lucide-react';
import { Recipe, WeeklyPlan, DailyMeals, ShoppingItem, Ingredient } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useRecipes } from '../hooks/useRecipes';
import { supabase } from '../lib/supabase';
import GeminiService from '../services/geminiService';
import SupabaseDatasetService from '../services/supabaseDatasetService';
import { isFeatureEnabledSync } from '../lib/featureFlags';
import { RecipeDetailModal } from './RecipeDetailModal';

interface WeeklyPlannerProps {
  recipes: Recipe[];
  ingredients: Ingredient[];
}

interface PeopleCountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (count: number) => void;
}

const PeopleCountModal: React.FC<PeopleCountModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [peopleCount, setPeopleCount] = useState(4);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(peopleCount);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Berapa Orang yang Akan Makan?
          </h3>
          <p className="text-gray-600 mb-6">
            Tentukan jumlah orang untuk menyesuaikan porsi dan perencanaan belanja.
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Jumlah Orang
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPeopleCount(Math.max(1, peopleCount - 1))}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  -
                </button>
                <div className="flex-1 text-center">
                  <input
                    type="number"
                    value={peopleCount}
                    onChange={(e) => setPeopleCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full text-center text-2xl font-bold py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="1"
                    max="20"
                  />
                  <p className="text-sm text-gray-500 mt-1">orang</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPeopleCount(Math.min(20, peopleCount + 1))}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Buat Rencana
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export const WeeklyPlanner: React.FC<WeeklyPlannerProps> = ({
  recipes,
  ingredients,
}) => {
  const { user } = useAuth();
  const { addRecipe } = useRecipes(user?.id);
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [showPeopleModal, setShowPeopleModal] = useState(false);
  const [peopleCount, setPeopleCount] = useState(4);
  const [generationProgress, setGenerationProgress] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [savingRecipeId, setSavingRecipeId] = useState<string | null>(null);

  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
  const meals = ['breakfast', 'lunch', 'dinner'];
  const mealLabels = {
    breakfast: 'Sarapan',
    lunch: 'Makan Siang',
    dinner: 'Makan Malam',
  };

  // Helper function to check ingredient similarity
  const isSimilarIngredient = (ingredient1: string, ingredient2: string): boolean => {
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
  };

  // Helper function to calculate ingredient match score for a recipe
  const calculateIngredientMatch = (recipe: Recipe, availableIngredients: string[]): number => {
    if (!recipe.recipe_ingredients || recipe.recipe_ingredients.length === 0) return 0;
    
    const recipeIngredients = recipe.recipe_ingredients.map(ing => ing.name.toLowerCase());
    const matches = recipeIngredients.filter(recipeIng => 
      availableIngredients.some(available => 
        available.includes(recipeIng) || recipeIng.includes(available) ||
        isSimilarIngredient(available, recipeIng)
      )
    );
    
    return matches.length / recipeIngredients.length;
  };

  // Helper function to create AI recipes for empty slots
  const generateAIRecipesForEmptySlots = async (
    emptySlots: Array<{day: number, meal: string}>,
    geminiService: GeminiService,
    usedIngredients: Set<string>
  ): Promise<Recipe[]> => {
    if (emptySlots.length === 0) return [];

    try {
      // Create a prompt that considers used ingredients and meal types
      const mealTypes = emptySlots.map(slot => `${slot.meal} untuk hari ke-${slot.day + 1}`);
      const availableIngredientNames = ingredients
        .filter(ing => !usedIngredients.has(ing.name.toLowerCase()))
        .map(ing => `${ing.name} (${ing.quantity} ${ing.unit})`);

      const prompt = `
Saya memiliki bahan-bahan berikut: ${availableIngredientNames.join(', ')}

Tolong buatkan ${emptySlots.length} resep masakan Indonesia yang berbeda untuk:
${mealTypes.join(', ')}

Pastikan setiap resep:
1. Menggunakan bahan yang tersedia
2. Sesuai dengan waktu makan (sarapan lebih ringan, makan siang/malam lebih lengkap)
3. Mudah dibuat dan praktis
4. Bervariasi (tidak ada yang sama)

Berikan respon dalam format JSON yang valid dengan struktur berikut:

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

PENTING: JSON harus valid tanpa komentar atau karakter khusus.
`;

      const result = await geminiService.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/```json\s*(\{[\s\S]*?\})\s*```/);
      if (!jsonMatch || !jsonMatch[1]) {
        throw new Error('Invalid AI response format');
      }

      const parsedResponse = JSON.parse(jsonMatch[1]);
      
      return parsedResponse.recipes.map((recipe: any, index: number) => ({
        id: `ai-weekly-${Date.now()}-${index}`,
        name: recipe.name,
        description: recipe.description,
        prep_time: recipe.prepTime || 15,
        cook_time: recipe.cookTime || 30,
        servings: recipe.servings || 4,
        difficulty: recipe.difficulty || 'easy',
        instructions: recipe.instructions || [],
        tags: recipe.tags || [],
        user_id: 'ai-generated',
        recipe_ingredients: (recipe.ingredients || []).map((ing: any, ingIndex: number) => ({
          id: `ai-weekly-${Date.now()}-${index}-ing-${ingIndex}`,
          recipe_id: `ai-weekly-${Date.now()}-${index}`,
          name: ing.name,
          quantity: ing.quantity || 1,
          unit: ing.unit || 'secukupnya',
        })),
      }));
    } catch (error) {
      console.error('Error generating AI recipes for empty slots:', error);
      return [];
    }
  };

  const generateWeeklyPlan = async (targetPeopleCount: number) => {
    setIsGenerating(true);
    setPeopleCount(targetPeopleCount);
    setGenerationProgress('Memulai perencanaan menu...');
    
    try {
      const currentWeek = new Date().toISOString().slice(0, 10);
      const dailyMeals: DailyMeals[] = [];
      
      // Initialize services
      const datasetService = new SupabaseDatasetService();
      let geminiService: GeminiService | null = null;
      
      const apiKey = import.meta.env.VITE_GOOGLE_AI_API_KEY;
      if (apiKey && apiKey.trim() && apiKey !== 'your_api_key_here') {
        geminiService = new GeminiService(apiKey);
      }

      // Create ingredient optimization tracking
      const availableIngredientNames = ingredients.map(ing => ing.name.toLowerCase());
      const usedIngredients = new Set<string>();

      setGenerationProgress('Mengoptimalkan penggunaan bahan...');
      
      // Sort saved recipes by ingredient match score (PRIORITIZE SAVED RECIPES)
      let availableRecipes = [...recipes];
      availableRecipes = availableRecipes
        .map(recipe => ({
          ...recipe,
          matchScore: calculateIngredientMatch(recipe, availableIngredientNames)
        }))
        .sort((a, b) => {
          // First sort by match score, then by creation date (newer first)
          if (Math.abs(a.matchScore - b.matchScore) > 0.1) {
            return b.matchScore - a.matchScore;
          }
          return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
        });

      console.log('Sorted saved recipes by ingredient match:', availableRecipes.map(r => ({ name: r.name, score: r.matchScore })));

      // Get dataset recipes if feature is enabled
      let datasetRecipes: any[] = [];
      if (isFeatureEnabledSync('dataset')) {
        setGenerationProgress('Mengambil resep dari dataset...');
        try {
          datasetRecipes = await datasetService.getRecommendations(ingredients, 30, 50);
          datasetRecipes.sort((a, b) => b.match_score - a.match_score);
        } catch (error) {
          console.warn('Failed to get dataset recipes:', error);
        }
      }

      setGenerationProgress('Menyusun menu untuk 7 hari...');

      // Initialize daily meals structure
      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        
        dailyMeals.push({
          date: date.toISOString().slice(0, 10),
        });
      }

      // Phase 1: PRIORITIZE SAVED RECIPES - Fill as many slots as possible with saved recipes
      let recipeIndex = 0;
      let totalSlots = 21; // 7 days × 3 meals
      let slotsFilledWithSaved = 0;

      // First pass: Fill with saved recipes that have good ingredient matches
      for (let dayIndex = 0; dayIndex < 7 && recipeIndex < availableRecipes.length; dayIndex++) {
        for (const mealType of meals) {
          if (recipeIndex >= availableRecipes.length) break;
          
          const recipe = availableRecipes[recipeIndex];
          
          // Only use saved recipes with decent ingredient match (>= 0.2) or if we have many saved recipes
          if (recipe.matchScore >= 0.2 || availableRecipes.length >= 10) {
            dailyMeals[dayIndex][mealType as keyof DailyMeals] = recipe;
            
            // Track used ingredients
            if (recipe.recipe_ingredients) {
              recipe.recipe_ingredients.forEach(ing => {
                usedIngredients.add(ing.name.toLowerCase());
              });
            }
            
            slotsFilledWithSaved++;
            console.log(`Filled ${mealType} on day ${dayIndex + 1} with saved recipe: ${recipe.name} (score: ${recipe.matchScore})`);
          }
          
          recipeIndex++;
        }
      }

      console.log(`Phase 1 complete: ${slotsFilledWithSaved}/${totalSlots} slots filled with saved recipes`);

      // Phase 2: Fill remaining slots with dataset recipes
      if (datasetRecipes.length > 0) {
        setGenerationProgress('Menambahkan resep dari dataset...');
        let datasetIndex = 0;
        let slotsFilledWithDataset = 0;
        
        for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
          for (const mealType of meals) {
            if (!dailyMeals[dayIndex][mealType as keyof DailyMeals] && datasetIndex < datasetRecipes.length) {
              const recipe = datasetRecipes[datasetIndex];
              dailyMeals[dayIndex][mealType as keyof DailyMeals] = recipe;
              
              // Track used ingredients
              if (recipe.recipe_ingredients) {
                recipe.recipe_ingredients.forEach((ing: any) => {
                  usedIngredients.add(ing.name.toLowerCase());
                });
              }
              
              slotsFilledWithDataset++;
              console.log(`Filled ${mealType} on day ${dayIndex + 1} with dataset recipe: ${recipe.name}`);
              datasetIndex++;
            }
          }
        }
        
        console.log(`Phase 2 complete: ${slotsFilledWithDataset} additional slots filled with dataset recipes`);
      }

      // Phase 3: Fill remaining empty slots with AI-generated recipes
      if (geminiService && isFeatureEnabledSync('suggestions')) {
        setGenerationProgress('Mengisi slot kosong dengan saran AI...');
        
        // Find empty slots
        const emptySlots: Array<{day: number, meal: string}> = [];
        for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
          for (const mealType of meals) {
            if (!dailyMeals[dayIndex][mealType as keyof DailyMeals]) {
              emptySlots.push({ day: dayIndex, meal: mealType });
            }
          }
        }

        console.log(`Phase 3: Found ${emptySlots.length} empty slots for AI generation`);

        if (emptySlots.length > 0) {
          try {
            const aiRecipes = await generateAIRecipesForEmptySlots(emptySlots, geminiService, usedIngredients);
            
            // Assign AI recipes to empty slots
            let aiIndex = 0;
            for (const slot of emptySlots) {
              if (aiIndex < aiRecipes.length) {
                dailyMeals[slot.day][slot.meal as keyof DailyMeals] = aiRecipes[aiIndex];
                console.log(`Filled ${slot.meal} on day ${slot.day + 1} with AI recipe: ${aiRecipes[aiIndex].name}`);
                aiIndex++;
              }
            }
          } catch (error) {
            console.warn('Failed to generate AI recipes for empty slots:', error);
          }
        }
      }

      // Phase 4: Final fallback - create simple placeholder recipes for any remaining empty slots
      setGenerationProgress('Menyelesaikan rencana menu...');
      
      const fallbackRecipes = [
        { name: 'Nasi Putih + Telur Dadar', meal: 'breakfast' },
        { name: 'Mie Instan + Telur', meal: 'breakfast' },
        { name: 'Roti Bakar + Selai', meal: 'breakfast' },
        { name: 'Nasi + Ayam Goreng', meal: 'lunch' },
        { name: 'Nasi + Ikan Bakar', meal: 'lunch' },
        { name: 'Nasi + Sayur Sop', meal: 'lunch' },
        { name: 'Nasi + Rendang', meal: 'dinner' },
        { name: 'Nasi + Gudeg', meal: 'dinner' },
        { name: 'Nasi + Soto Ayam', meal: 'dinner' },
      ];

      let fallbackIndex = 0;
      let slotsFilledWithFallback = 0;
      
      for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        for (const mealType of meals) {
          if (!dailyMeals[dayIndex][mealType as keyof DailyMeals]) {
            const fallback = fallbackRecipes[fallbackIndex % fallbackRecipes.length];
            
            dailyMeals[dayIndex][mealType as keyof DailyMeals] = {
              id: `fallback-${dayIndex}-${mealType}`,
              name: fallback.name,
              description: 'Resep sederhana untuk melengkapi rencana menu',
              prep_time: 10,
              cook_time: 15,
              servings: targetPeopleCount,
              difficulty: 'easy' as const,
              instructions: ['Siapkan bahan-bahan', 'Masak sesuai cara biasa', 'Sajikan hangat'],
              tags: ['sederhana', 'cepat'],
              user_id: 'fallback',
              recipe_ingredients: [
                {
                  id: `fallback-${dayIndex}-${mealType}-ing-1`,
                  recipe_id: `fallback-${dayIndex}-${mealType}`,
                  name: 'Bahan utama',
                  quantity: 1,
                  unit: 'porsi',
                }
              ],
            };
            
            slotsFilledWithFallback++;
            console.log(`Filled ${mealType} on day ${dayIndex + 1} with fallback recipe: ${fallback.name}`);
            fallbackIndex++;
          }
        }
      }

      console.log(`Phase 4 complete: ${slotsFilledWithFallback} slots filled with fallback recipes`);
      console.log(`Final summary: ${slotsFilledWithSaved} saved + ${datasetRecipes.length > 0 ? 'dataset' : '0'} + AI + ${slotsFilledWithFallback} fallback = ${totalSlots} total slots`);
      
      const newPlan: WeeklyPlan = {
        id: 'plan-' + Date.now(),
        week_start: currentWeek,
        user_id: user?.id || 'current-user',
        daily_meals: dailyMeals,
      };
      
      setWeeklyPlan(newPlan);
      generateShoppingList(newPlan, targetPeopleCount);
      
    } catch (error) {
      console.error('Error generating weekly plan:', error);
      setGenerationProgress('Terjadi kesalahan saat membuat rencana menu');
    } finally {
      setIsGenerating(false);
      setGenerationProgress('');
    }
  };

  const generateShoppingList = (plan: WeeklyPlan, targetPeopleCount: number) => {
    const neededIngredients: Record<string, ShoppingItem> = {};
    
    // Collect all ingredients needed for the week
    (plan.daily_meals || []).forEach(day => {
      [day.breakfast, day.lunch, day.dinner].forEach(recipe => {
        if (recipe && recipe.recipe_ingredients) {
          recipe.recipe_ingredients.forEach(ingredient => {
            const key = ingredient.name.toLowerCase();
            // Adjust quantity based on people count vs recipe servings
            const adjustedQuantity = (ingredient.quantity * targetPeopleCount) / (recipe.servings || 4);
            
            if (neededIngredients[key]) {
              neededIngredients[key].quantity += adjustedQuantity;
            } else {
              neededIngredients[key] = {
                id: 'shopping-' + Date.now() + Math.random(),
                name: ingredient.name,
                quantity: adjustedQuantity,
                unit: ingredient.unit,
                category: 'general',
                needed: true,
              };
            }
          });
        }
      });
    });

    // Check what we already have and optimize usage
    const availableIngredients = ingredients.reduce((acc, ing) => {
      acc[ing.name.toLowerCase()] = ing.quantity;
      return acc;
    }, {} as Record<string, number>);

    // Mark items as needed or not, prioritizing existing ingredients
    Object.values(neededIngredients).forEach(item => {
      const available = availableIngredients[item.name.toLowerCase()] || 0;
      if (available >= item.quantity) {
        item.needed = false;
        item.quantity = 0; // We have enough
      } else {
        item.quantity = Math.max(0, item.quantity - available);
        item.needed = item.quantity > 0;
      }
    });

    // Filter out items with 0 quantity
    const filteredList = Object.values(neededIngredients).filter(item => 
      item.needed || item.quantity > 0
    );

    setShoppingList(filteredList);
  };

  const assignMealToDay = (dayIndex: number, mealType: keyof DailyMeals, recipe: Recipe | null) => {
    if (!weeklyPlan || !weeklyPlan.daily_meals) return;
    
    const updatedMeals = [...weeklyPlan.daily_meals];
    updatedMeals[dayIndex] = {
      ...updatedMeals[dayIndex],
      [mealType]: recipe,
    };
    
    const updatedPlan = {
      ...weeklyPlan,
      daily_meals: updatedMeals,
    };
    
    setWeeklyPlan(updatedPlan);
    generateShoppingList(updatedPlan, peopleCount);
  };

  const handleRecipeClick = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setShowRecipeModal(true);
  };

  const saveRecipeToCollection = async (recipe: Recipe) => {
    if (!user?.id) return;

    setSavingRecipeId(recipe.id);
    
    try {
      const recipeData = {
        name: recipe.name,
        description: recipe.description,
        prep_time: recipe.prep_time,
        cook_time: recipe.cook_time,
        servings: recipe.servings,
        difficulty: recipe.difficulty,
        instructions: recipe.instructions,
        tags: recipe.tags,
      };

      const ingredients = recipe.recipe_ingredients?.map(ing => ({
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
      })) || [];

      await addRecipe(recipeData, ingredients);
      
      // Show success message (you might want to add a toast system)
      console.log('Recipe saved successfully!');
    } catch (err) {
      console.error('Error saving recipe:', err);
    } finally {
      setSavingRecipeId(null);
    }
  };

  const getRecipeSource = (recipe: Recipe) => {
    if (recipe.user_id === 'ai-generated' || recipe.id.startsWith('gemini-') || recipe.id.startsWith('ai-weekly-')) {
      return { type: 'ai', icon: Sparkles, color: 'text-purple-500', label: 'AI' };
    } else if (recipe.user_id === 'dataset') {
      return { type: 'dataset', icon: Database, color: 'text-blue-500', label: 'Dataset' };
    } else if (recipe.user_id === 'fallback') {
      return { type: 'fallback', icon: ChefHat, color: 'text-gray-500', label: 'Sederhana' };
    } else {
      return { type: 'saved', icon: ChefHat, color: 'text-green-500', label: 'Tersimpan' };
    }
  };

  const isRecipeFromExternalSource = (recipe: Recipe) => {
    return recipe.user_id === 'ai-generated' || 
           recipe.user_id === 'dataset' || 
           recipe.id.startsWith('gemini-') || 
           recipe.id.startsWith('ai-weekly-');
  };

  const unitTranslations: Record<string, string> = {
    kg: 'kg',
    gram: 'gram',
    liter: 'liter',
    ml: 'ml',
    piece: 'buah',
    clove: 'siung',
    piring: 'piring',
    butir: 'butir',
    porsi: 'porsi',
    secukupnya: 'secukupnya',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Rencana Menu Mingguan</h2>
          <p className="text-gray-600 mt-1">Rencanakan menu makan untuk seminggu dengan optimasi bahan</p>
        </div>
        <button
          onClick={() => setShowPeopleModal(true)}
          disabled={isGenerating}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <Calendar size={18} />
          {isGenerating ? 'Sedang membuat...' : 'Buat Rencana Menu'}
        </button>
      </div>

      {/* People Count Display */}
      {weeklyPlan && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="text-blue-600" size={20} />
              <span className="font-medium text-blue-900">
                Rencana untuk {peopleCount} orang
              </span>
            </div>
            <button
              onClick={() => setShowPeopleModal(true)}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Ubah jumlah
            </button>
          </div>
        </div>
      )}

      {isGenerating && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 mb-2">Sedang membuat rencana menu mingguan yang optimal...</p>
          {generationProgress && (
            <p className="text-sm text-blue-600">{generationProgress}</p>
          )}
        </div>
      )}

      {weeklyPlan && weeklyPlan.daily_meals && !isGenerating && (
        <div className="space-y-6">
          {/* Recipe Source Legend */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-3">Sumber Resep:</h3>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <ChefHat className="text-green-500" size={16} />
                <span>Resep Tersimpan (Prioritas Utama)</span>
              </div>
              <div className="flex items-center gap-2">
                <Database className="text-blue-500" size={16} />
                <span>Dataset Komunitas</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="text-purple-500" size={16} />
                <span>Saran AI</span>
              </div>
              <div className="flex items-center gap-2">
                <ChefHat className="text-gray-500" size={16} />
                <span>Resep Sederhana</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
            {weeklyPlan.daily_meals.map((day, dayIndex) => (
              <div key={dayIndex} className="bg-white rounded-lg shadow-md border border-blue-100 p-4">
                <h3 className="font-semibold text-gray-900 mb-3 text-center">
                  {days[dayIndex]}
                </h3>
                <div className="space-y-3">
                  {meals.map((mealType) => (
                    <div key={mealType} className="border border-gray-200 rounded-lg p-2">
                      <div className="text-xs font-medium text-gray-600 mb-1">
                        {mealLabels[mealType as keyof typeof mealLabels]}
                      </div>
                      {day[mealType as keyof DailyMeals] ? (
                        <div className="text-sm">
                          <div className="flex items-start justify-between mb-1">
                            <div 
                              className="font-medium text-gray-900 line-clamp-2 flex-1 cursor-pointer hover:text-blue-600 transition-colors"
                              onClick={() => handleRecipeClick(day[mealType as keyof DailyMeals] as Recipe)}
                            >
                              {(day[mealType as keyof DailyMeals] as Recipe)?.name}
                            </div>
                            <div className="ml-1 flex-shrink-0 flex items-center gap-1">
                              {(() => {
                                const source = getRecipeSource(day[mealType as keyof DailyMeals] as Recipe);
                                const SourceIcon = source.icon;
                                return <SourceIcon className={source.color} size={14} title={source.label} />;
                              })()}
                              <Eye 
                                className="text-gray-400 hover:text-blue-500 cursor-pointer" 
                                size={12}
                                onClick={() => handleRecipeClick(day[mealType as keyof DailyMeals] as Recipe)}
                                title="Lihat detail"
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                            <Clock size={10} />
                            <span>
                              {((day[mealType as keyof DailyMeals] as Recipe)?.prep_time || 0) + 
                               ((day[mealType as keyof DailyMeals] as Recipe)?.cook_time || 0)} menit
                            </span>
                            <Users size={10} />
                            <span>{peopleCount} porsi</span>
                          </div>
                          
                          {/* Save button for external recipes */}
                          {isRecipeFromExternalSource(day[mealType as keyof DailyMeals] as Recipe) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                saveRecipeToCollection(day[mealType as keyof DailyMeals] as Recipe);
                              }}
                              disabled={savingRecipeId === (day[mealType as keyof DailyMeals] as Recipe).id}
                              className="text-xs text-green-600 hover:text-green-800 mb-1 flex items-center gap-1 disabled:text-gray-400"
                            >
                              <Save size={10} />
                              {savingRecipeId === (day[mealType as keyof DailyMeals] as Recipe).id ? 'Menyimpan...' : 'Simpan'}
                            </button>
                          )}
                          
                          <button
                            onClick={() => assignMealToDay(dayIndex, mealType as keyof DailyMeals, null)}
                            className="text-xs text-red-600 hover:text-red-800"
                          >
                            Hapus
                          </button>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400">
                          <select
                            onChange={(e) => {
                              const recipe = recipes.find(r => r.id === e.target.value);
                              if (recipe) {
                                assignMealToDay(dayIndex, mealType as keyof DailyMeals, recipe);
                              }
                            }}
                            className="w-full text-xs border border-gray-300 rounded px-1 py-1"
                          >
                            <option value="">Pilih resep</option>
                            {recipes.map(recipe => (
                              <option key={recipe.id} value={recipe.id}>
                                {recipe.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!weeklyPlan && !isGenerating && (
        <div className="text-center py-12">
          <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
          <div className="space-y-2">
            <p className="text-gray-500 font-medium">Buat rencana menu mingguan yang optimal!</p>
            <p className="text-gray-400 text-sm">
              Sistem akan mengoptimalkan penggunaan bahan yang ada, lalu melengkapi dengan resep dataset dan saran AI
            </p>
          </div>
        </div>
      )}

      {/* People Count Modal */}
      <PeopleCountModal
        isOpen={showPeopleModal}
        onClose={() => setShowPeopleModal(false)}
        onConfirm={generateWeeklyPlan}
      />

      {/* Recipe Detail Modal */}
      {selectedRecipe && (
        <RecipeDetailModal
          recipe={selectedRecipe}
          isOpen={showRecipeModal}
          onClose={() => {
            setShowRecipeModal(false);
            setSelectedRecipe(null);
          }}
        />
      )}
    </div>
  );
};