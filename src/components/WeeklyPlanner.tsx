import React, { useState, useEffect } from 'react';
import { Calendar, ShoppingCart, Clock, Users, Plus, Trash2, RefreshCw, ChefHat, Sparkles, Database, CheckCircle, Eye, Save, Archive, Edit3, Search, X } from 'lucide-react';
import { Recipe, WeeklyPlan, DailyMeals, ShoppingItem, Ingredient } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useRecipes } from '../hooks/useRecipes';
import { useWeeklyPlans } from '../hooks/useWeeklyPlans';
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

interface DailyRecipes {
  date: string;
  recipes: (Recipe | null)[];
}

interface RecipeSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRecipe: (recipe: Recipe) => void;
  savedRecipes: Recipe[];
  ingredients: Ingredient[];
  dayName: string;
  slotNumber: number;
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

const RecipeSelectionModal: React.FC<RecipeSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectRecipe,
  savedRecipes,
  ingredients,
  dayName,
  slotNumber,
}) => {
  const [activeTab, setActiveTab] = useState<'saved' | 'dataset'>('saved');
  const [datasetRecipes, setDatasetRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredSavedRecipes, setFilteredSavedRecipes] = useState<Recipe[]>([]);

  // Filter saved recipes based on search
  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = savedRecipes.filter(recipe =>
        recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recipe.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recipe.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredSavedRecipes(filtered);
    } else {
      setFilteredSavedRecipes(savedRecipes);
    }
  }, [searchQuery, savedRecipes]);

  // Load dataset recipes when tab is switched
  useEffect(() => {
    if (activeTab === 'dataset' && isFeatureEnabledSync('dataset')) {
      loadDatasetRecipes();
    }
  }, [activeTab]);

  const loadDatasetRecipes = async () => {
    setLoading(true);
    try {
      const datasetService = new SupabaseDatasetService();
      const recommendations = await datasetService.getRecommendations(ingredients, 30, 20);
      setDatasetRecipes(recommendations);
    } catch (error) {
      console.error('Error loading dataset recipes:', error);
      setDatasetRecipes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRecipeSelect = (recipe: Recipe) => {
    onSelectRecipe(recipe);
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Pilih Resep untuk {dayName} - Slot {slotNumber}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Pilih dari resep tersimpan atau jelajahi dataset komunitas
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('saved')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === 'saved'
                ? 'text-green-600 border-b-2 border-green-600 bg-green-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <ChefHat size={16} />
              Resep Tersimpan ({savedRecipes.length})
            </div>
          </button>
          {isFeatureEnabledSync('dataset') && (
            <button
              onClick={() => setActiveTab('dataset')}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                activeTab === 'dataset'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Database size={16} />
                Dataset Komunitas
              </div>
            </button>
          )}
        </div>

        {/* Search Bar */}
        {activeTab === 'saved' && (
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari resep tersimpan..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'saved' && (
            <div>
              {filteredSavedRecipes.length === 0 ? (
                <div className="text-center py-12">
                  <ChefHat size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">
                    {searchQuery ? 'Tidak ada resep yang cocok dengan pencarian' : 'Belum ada resep tersimpan'}
                  </p>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="mt-2 text-green-600 hover:text-green-800 text-sm"
                    >
                      Hapus pencarian
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredSavedRecipes.map((recipe) => (
                    <div
                      key={recipe.id}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handleRecipeSelect(recipe)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-gray-900 line-clamp-2 flex-1">
                          {recipe.name}
                        </h4>
                        <ChefHat className="text-green-500 ml-2" size={16} />
                      </div>
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {recipe.description}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock size={12} />
                          <span>{recipe.prep_time + recipe.cook_time} menit</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users size={12} />
                          <span>{recipe.servings} porsi</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'dataset' && (
            <div>
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <p className="text-gray-600">Memuat resep dari dataset...</p>
                </div>
              ) : datasetRecipes.length === 0 ? (
                <div className="text-center py-12">
                  <Database size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">
                    Tidak ada resep dataset yang cocok dengan bahan Anda
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {datasetRecipes.map((recipe) => (
                    <div
                      key={recipe.id}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handleRecipeSelect(recipe)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-gray-900 line-clamp-2 flex-1">
                          {recipe.name}
                        </h4>
                        <div className="flex items-center gap-1 ml-2">
                          <Database className="text-blue-500" size={16} />
                          {(recipe as any).loves_count && (
                            <span className="text-xs text-gray-500">
                              {(recipe as any).loves_count} ❤️
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {recipe.description}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                        <div className="flex items-center gap-1">
                          <Clock size={12} />
                          <span>{recipe.prep_time + recipe.cook_time} menit</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users size={12} />
                          <span>{recipe.servings} porsi</span>
                        </div>
                      </div>
                      {(recipe as any).match_score && (
                        <div className="text-xs text-blue-600">
                          {Math.round((recipe as any).match_score * 100)}% cocok dengan bahan Anda
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              {activeTab === 'saved' ? (
                <span>Pilih dari {filteredSavedRecipes.length} resep tersimpan</span>
              ) : (
                <span>Pilih dari {datasetRecipes.length} resep dataset</span>
              )}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Tutup
            </button>
          </div>
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
  const { 
    weeklyPlans, 
    loading: plansLoading, 
    saveWeeklyPlan, 
    deleteWeeklyPlan, 
    getCurrentWeekPlan 
  } = useWeeklyPlans(user?.id);
  
  const [weeklyPlan, setWeeklyPlan] = useState<{ id: string; week_start: string; user_id: string; daily_recipes: DailyRecipes[] } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [showPeopleModal, setShowPeopleModal] = useState(false);
  const [peopleCount, setPeopleCount] = useState(4);
  const [generationProgress, setGenerationProgress] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [savingRecipeId, setSavingRecipeId] = useState<string | null>(null);
  const [planSaved, setPlanSaved] = useState(false);
  const [showRecipeSelection, setShowRecipeSelection] = useState(false);
  const [selectionContext, setSelectionContext] = useState<{
    dayIndex: number;
    slotIndex: number;
    dayName: string;
  } | null>(null);

  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

  // Load current week plan on component mount
  useEffect(() => {
    if (!plansLoading && user?.id) {
      const currentPlan = getCurrentWeekPlan();
      console.log('Loading current week plan:', currentPlan);
      
      if (currentPlan && currentPlan.daily_meals) {
        // Convert saved plan format to new format
        const dailyRecipes: DailyRecipes[] = [];
        
        // Create 7 days starting from Monday of current week
        const today = new Date();
        const monday = new Date(today);
        monday.setDate(today.getDate() - today.getDay() + 1);
        
        for (let i = 0; i < 7; i++) {
          const date = new Date(monday);
          date.setDate(monday.getDate() + i);
          const dateString = date.toISOString().slice(0, 10);
          
          // Find corresponding daily meal from saved plan
          const dayMeal = currentPlan.daily_meals.find(meal => meal.date === dateString);
          const recipes: (Recipe | null)[] = [];
          
          if (dayMeal) {
            // Add recipes in order: breakfast, lunch, dinner (only if they exist)
            if (dayMeal.breakfast) recipes.push(dayMeal.breakfast);
            if (dayMeal.lunch) recipes.push(dayMeal.lunch);
            if (dayMeal.dinner) recipes.push(dayMeal.dinner);
          }
          
          dailyRecipes.push({
            date: dateString,
            recipes: recipes // Keep actual count, don't pad to 3
          });
        }
        
        const convertedPlan = {
          id: currentPlan.id,
          week_start: currentPlan.week_start,
          user_id: currentPlan.user_id,
          daily_recipes: dailyRecipes
        };
        
        console.log('Converted plan to new format:', convertedPlan);
        setWeeklyPlan(convertedPlan);
        setPlanSaved(true);
        generateShoppingList({ daily_recipes: dailyRecipes }, peopleCount);
      } else {
        console.log('No current week plan found');
      }
    }
  }, [plansLoading, weeklyPlans, user?.id]);

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
    emptySlots: Array<{day: number, slot: number}>,
    geminiService: GeminiService,
    usedIngredients: Set<string>
  ): Promise<Recipe[]> => {
    if (emptySlots.length === 0) return [];

    try {
      const availableIngredientNames = ingredients
        .filter(ing => !usedIngredients.has(ing.name.toLowerCase()))
        .map(ing => `${ing.name} (${ing.quantity} ${ing.unit})`);

      const prompt = `
Saya memiliki bahan-bahan berikut: ${availableIngredientNames.join(', ')}

Tolong buatkan ${emptySlots.length} resep masakan Indonesia yang berbeda dan bervariasi.

Pastikan setiap resep:
1. Menggunakan bahan yang tersedia
2. Mudah dibuat dan praktis
3. Bervariasi (tidak ada yang sama)
4. Cocok untuk keluarga Indonesia
5. TIDAK ada resep sederhana atau fallback

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
    setPlanSaved(false);
    
    try {
      const currentWeek = new Date().toISOString().slice(0, 10);
      const dailyRecipes: DailyRecipes[] = [];
      
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
          console.log('Dataset recipes loaded:', datasetRecipes.length);
        } catch (error) {
          console.warn('Failed to get dataset recipes:', error);
        }
      }

      setGenerationProgress('Menyusun menu untuk 7 hari...');

      // Initialize daily recipes structure (start with empty arrays)
      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        
        dailyRecipes.push({
          date: date.toISOString().slice(0, 10),
          recipes: [] // Start with empty array
        });
      }

      // Phase 1: PRIORITIZE SAVED RECIPES - Distribute across days ensuring each day gets at least 1
      let recipeIndex = 0;
      let slotsFilledWithSaved = 0;

      // First pass: Give each day at least 1 saved recipe if available
      for (let dayIndex = 0; dayIndex < 7 && recipeIndex < availableRecipes.length; dayIndex++) {
        const recipe = availableRecipes[recipeIndex];
        
        // Only use saved recipes with decent ingredient match (>= 0.2) or if we have many saved recipes
        if (recipe.matchScore >= 0.2 || availableRecipes.length >= 10) {
          dailyRecipes[dayIndex].recipes.push(recipe);
          
          // Track used ingredients
          if (recipe.recipe_ingredients) {
            recipe.recipe_ingredients.forEach(ing => {
              usedIngredients.add(ing.name.toLowerCase());
            });
          }
          
          slotsFilledWithSaved++;
          console.log(`Filled day ${dayIndex + 1} with saved recipe: ${recipe.name} (score: ${recipe.matchScore})`);
        }
        
        recipeIndex++;
      }

      // Second pass: Add more saved recipes to days that can accommodate them (max 3 per day)
      for (let dayIndex = 0; dayIndex < 7 && recipeIndex < availableRecipes.length; dayIndex++) {
        while (dailyRecipes[dayIndex].recipes.length < 3 && recipeIndex < availableRecipes.length) {
          const recipe = availableRecipes[recipeIndex];
          
          if (recipe.matchScore >= 0.2 || availableRecipes.length >= 10) {
            dailyRecipes[dayIndex].recipes.push(recipe);
            
            // Track used ingredients
            if (recipe.recipe_ingredients) {
              recipe.recipe_ingredients.forEach(ing => {
                usedIngredients.add(ing.name.toLowerCase());
              });
            }
            
            slotsFilledWithSaved++;
            console.log(`Added additional saved recipe to day ${dayIndex + 1}: ${recipe.name}`);
          }
          
          recipeIndex++;
        }
      }

      console.log(`Phase 1 complete: ${slotsFilledWithSaved} slots filled with saved recipes`);

      // Phase 2: Fill days that still have no recipes with dataset recipes
      if (datasetRecipes.length > 0) {
        setGenerationProgress('Menambahkan resep dari dataset...');
        let datasetIndex = 0;
        let slotsFilledWithDataset = 0;
        
        for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
          // Ensure each day has at least 1 recipe
          if (dailyRecipes[dayIndex].recipes.length === 0 && datasetIndex < datasetRecipes.length) {
            const recipe = datasetRecipes[datasetIndex];
            dailyRecipes[dayIndex].recipes.push(recipe);
            
            // Track used ingredients
            if (recipe.recipe_ingredients) {
              recipe.recipe_ingredients.forEach((ing: any) => {
                usedIngredients.add(ing.name.toLowerCase());
              });
            }
            
            slotsFilledWithDataset++;
            console.log(`Filled empty day ${dayIndex + 1} with dataset recipe: ${recipe.name}`);
            datasetIndex++;
          }
          
          // Add more dataset recipes if there's room (max 3 per day)
          while (dailyRecipes[dayIndex].recipes.length < 3 && datasetIndex < datasetRecipes.length) {
            const recipe = datasetRecipes[datasetIndex];
            dailyRecipes[dayIndex].recipes.push(recipe);
            
            // Track used ingredients
            if (recipe.recipe_ingredients) {
              recipe.recipe_ingredients.forEach((ing: any) => {
                usedIngredients.add(ing.name.toLowerCase());
              });
            }
            
            slotsFilledWithDataset++;
            console.log(`Added dataset recipe to day ${dayIndex + 1}: ${recipe.name}`);
            datasetIndex++;
          }
        }
        
        console.log(`Phase 2 complete: ${slotsFilledWithDataset} additional slots filled with dataset recipes`);
      }

      // Phase 3: Fill days that still have no recipes with AI-generated recipes
      if (geminiService && isFeatureEnabledSync('suggestions')) {
        setGenerationProgress('Mengisi hari kosong dengan saran AI...');
        
        // Find days with no recipes
        const emptyDays: number[] = [];
        for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
          if (dailyRecipes[dayIndex].recipes.length === 0) {
            emptyDays.push(dayIndex);
          }
        }

        console.log(`Phase 3: Found ${emptyDays.length} empty days for AI generation`);

        if (emptyDays.length > 0) {
          try {
            const emptySlots = emptyDays.map(day => ({ day, slot: 0 }));
            const aiRecipes = await generateAIRecipesForEmptySlots(emptySlots, geminiService, usedIngredients);
            
            // Assign AI recipes to empty days
            let aiIndex = 0;
            for (const dayIndex of emptyDays) {
              if (aiIndex < aiRecipes.length) {
                dailyRecipes[dayIndex].recipes.push(aiRecipes[aiIndex]);
                console.log(`Filled empty day ${dayIndex + 1} with AI recipe: ${aiRecipes[aiIndex].name}`);
                aiIndex++;
              }
            }
          } catch (error) {
            console.warn('Failed to generate AI recipes for empty days:', error);
          }
        }
      }

      // Phase 4: Fill remaining empty slots with additional dataset/AI recipes if available
      setGenerationProgress('Melengkapi rencana menu...');
      
      // Try to fill more slots with dataset recipes
      if (datasetRecipes.length > 0) {
        let datasetIndex = 0;
        for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
          while (dailyRecipes[dayIndex].recipes.length < 2 && datasetIndex < datasetRecipes.length) {
            const recipe = datasetRecipes[datasetIndex];
            // Check if recipe is not already used in this day
            const alreadyUsed = dailyRecipes[dayIndex].recipes.some(r => r?.id === recipe.id);
            if (!alreadyUsed) {
              dailyRecipes[dayIndex].recipes.push(recipe);
              console.log(`Added extra dataset recipe to day ${dayIndex + 1}: ${recipe.name}`);
            }
            datasetIndex++;
          }
        }
      }

      setGenerationProgress('Menyelesaikan rencana menu...');
      
      const newPlan = {
        id: 'plan-' + Date.now(),
        week_start: currentWeek,
        user_id: user?.id || 'current-user',
        daily_recipes: dailyRecipes,
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

  const handleSaveWeeklyPlan = async () => {
    if (!weeklyPlan || !user?.id) return;

    setIsSaving(true);
    try {
      const today = new Date();
      const monday = new Date(today);
      monday.setDate(today.getDate() - today.getDay() + 1);
      const weekStart = monday.toISOString().slice(0, 10);

      // Convert new format back to old format for saving
      const dailyMeals: DailyMeals[] = weeklyPlan.daily_recipes.map(day => {
        const meal: DailyMeals = { date: day.date };
        
        // Assign recipes to breakfast, lunch, dinner based on order
        if (day.recipes[0]) meal.breakfast = day.recipes[0];
        if (day.recipes[1]) meal.lunch = day.recipes[1];
        if (day.recipes[2]) meal.dinner = day.recipes[2];
        
        return meal;
      });

      await saveWeeklyPlan(weekStart, dailyMeals, peopleCount);
      setPlanSaved(true);
      console.log('Weekly plan saved successfully!');
    } catch (error) {
      console.error('Error saving weekly plan:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const generateShoppingList = (plan: { daily_recipes: DailyRecipes[] }, targetPeopleCount: number) => {
    const neededIngredients: Record<string, ShoppingItem> = {};
    
    // Collect all ingredients needed for the week
    plan.daily_recipes.forEach(day => {
      day.recipes.forEach(recipe => {
        if (recipe && recipe.recipe_ingredients) {
          recipe.recipe_ingredients.forEach(ingredient => {
            const key = ingredient.name.toLowerCase();
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
        item.quantity = 0;
      } else {
        item.quantity = Math.max(0, item.quantity - available);
        item.needed = item.quantity > 0;
      }
    });

    const filteredList = Object.values(neededIngredients).filter(item => 
      item.needed || item.quantity > 0
    );

    setShoppingList(filteredList);
  };

  const addRecipeToDay = (dayIndex: number) => {
    if (!weeklyPlan) return;
    
    const currentRecipes = weeklyPlan.daily_recipes[dayIndex].recipes;
    
    // Only add if less than 3 recipes
    if (currentRecipes.length < 3) {
      setSelectionContext({
        dayIndex,
        slotIndex: currentRecipes.length,
        dayName: days[dayIndex]
      });
      setShowRecipeSelection(true);
    }
  };

  const assignRecipeToSlot = (dayIndex: number, slotIndex: number, recipe: Recipe | null) => {
    if (!weeklyPlan) return;
    
    const updatedPlan = { ...weeklyPlan };
    updatedPlan.daily_recipes[dayIndex].recipes[slotIndex] = recipe;
    
    setWeeklyPlan(updatedPlan);
    generateShoppingList(updatedPlan, peopleCount);
    setPlanSaved(false);
  };

  const removeRecipeFromSlot = (dayIndex: number, slotIndex: number) => {
    if (!weeklyPlan) return;
    
    const updatedPlan = { ...weeklyPlan };
    updatedPlan.daily_recipes[dayIndex].recipes.splice(slotIndex, 1);
    
    setWeeklyPlan(updatedPlan);
    generateShoppingList(updatedPlan, peopleCount);
    setPlanSaved(false);
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
          <p className="text-gray-600 mt-1">Rencanakan menu fleksibel (0-3 resep per hari)</p>
        </div>
        <div className="flex items-center gap-3">
          {weeklyPlan && (
            <button
              onClick={handleSaveWeeklyPlan}
              disabled={isSaving || planSaved}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                planSaved 
                  ? 'bg-green-100 text-green-700 cursor-default'
                  : 'bg-green-500 text-white hover:bg-green-600'
              } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {planSaved ? (
                <>
                  <CheckCircle size={18} />
                  Tersimpan
                </>
              ) : (
                <>
                  <Save size={18} />
                  {isSaving ? 'Menyimpan...' : 'Simpan Rencana'}
                </>
              )}
            </button>
          )}
          <button
            onClick={() => setShowPeopleModal(true)}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <RefreshCw size={18} />
            {isGenerating ? 'Sedang membuat...' : (weeklyPlan ? 'Buat Ulang' : 'Buat Rencana Menu')}
          </button>
        </div>
      </div>

      {/* Plan Status */}
      {weeklyPlan && (
        <div className={`border rounded-lg p-4 ${planSaved ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className={planSaved ? 'text-green-600' : 'text-yellow-600'} size={20} />
              <span className={`font-medium ${planSaved ? 'text-green-900' : 'text-yellow-900'}`}>
                Rencana untuk {peopleCount} orang
              </span>
              {planSaved ? (
                <span className="text-green-700 text-sm">(Tersimpan)</span>
              ) : (
                <span className="text-yellow-700 text-sm">(Belum disimpan)</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPeopleModal(true)}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                Ubah jumlah
              </button>
              {!planSaved && (
                <button
                  onClick={handleSaveWeeklyPlan}
                  disabled={isSaving}
                  className="text-green-600 hover:text-green-800 text-sm font-medium"
                >
                  {isSaving ? 'Menyimpan...' : 'Simpan Sekarang'}
                </button>
              )}
            </div>
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

      {weeklyPlan && weeklyPlan.daily_recipes && !isGenerating && (
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
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
            {weeklyPlan.daily_recipes.map((day, dayIndex) => (
              <div key={dayIndex} className="bg-white rounded-lg shadow-md border border-blue-100 p-4">
                <h3 className="font-semibold text-gray-900 mb-3 text-center">
                  {days[dayIndex]}
                </h3>
                <div className="space-y-3">
                  {day.recipes.map((recipe, slotIndex) => (
                    <div key={slotIndex} className="border border-gray-200 rounded-lg p-2">
                      <div className="text-xs font-medium text-gray-600 mb-1">
                        Resep {slotIndex + 1}
                      </div>
                      {recipe ? (
                        <div className="text-sm">
                          <div className="flex items-start justify-between mb-1">
                            <div 
                              className="font-medium text-gray-900 line-clamp-2 flex-1 cursor-pointer hover:text-blue-600 transition-colors"
                              onClick={() => handleRecipeClick(recipe)}
                            >
                              {recipe.name}
                            </div>
                            <div className="ml-1 flex-shrink-0 flex items-center gap-1">
                              {(() => {
                                const source = getRecipeSource(recipe);
                                const SourceIcon = source.icon;
                                return <SourceIcon className={source.color} size={14} title={source.label} />;
                              })()}
                              <Eye 
                                className="text-gray-400 hover:text-blue-500 cursor-pointer" 
                                size={12}
                                onClick={() => handleRecipeClick(recipe)}
                                title="Lihat detail"
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                            <Clock size={10} />
                            <span>{recipe.prep_time + recipe.cook_time} menit</span>
                            <Users size={10} />
                            <span>{peopleCount} porsi</span>
                          </div>
                          
                          {/* Save button for external recipes */}
                          {isRecipeFromExternalSource(recipe) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                saveRecipeToCollection(recipe);
                              }}
                              disabled={savingRecipeId === recipe.id}
                              className="text-xs text-green-600 hover:text-green-800 mb-1 flex items-center gap-1 disabled:text-gray-400"
                            >
                              <Save size={10} />
                              {savingRecipeId === recipe.id ? 'Menyimpan...' : 'Simpan'}
                            </button>
                          )}
                          
                          <button
                            onClick={() => removeRecipeFromSlot(dayIndex, slotIndex)}
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
                                assignRecipeToSlot(dayIndex, slotIndex, recipe);
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
                  
                  {/* Add recipe button (max 3) */}
                  {day.recipes.length < 3 && (
                    <button
                      onClick={() => addRecipeToDay(dayIndex)}
                      className="w-full text-xs text-blue-600 hover:text-blue-800 border border-dashed border-blue-300 rounded-lg py-2 flex items-center justify-center gap-1"
                    >
                      <Plus size={12} />
                      Tambah Resep
                    </button>
                  )}
                  
                  {/* Show recipe count */}
                  <div className="text-center text-xs text-gray-500">
                    {day.recipes.length} resep
                  </div>
                </div>
              </div>
            ))}
          </div>

          {shoppingList.length > 0 && (
            <div className="bg-white rounded-lg shadow-md border border-green-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <ShoppingCart className="text-green-600" size={24} />
                <h3 className="text-lg font-semibold text-gray-900">Daftar Belanja</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <h4 className="font-medium text-green-800 mb-2">Perlu Dibeli</h4>
                  <ul className="space-y-1">
                    {shoppingList.filter(item => item.needed).map(item => (
                      <li key={item.id} className="text-sm text-gray-700">
                        <span className="font-medium">
                          {item.name}
                        </span>
                        <span className="text-gray-500 ml-2">
                          {item.quantity} {unitTranslations[item.unit] || item.unit}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium text-blue-800 mb-2">Sudah Ada</h4>
                  <ul className="space-y-1">
                    {shoppingList.filter(item => !item.needed).map(item => (
                      <li key={item.id} className="text-sm text-gray-500">
                        <span>
                          {item.name}
                        </span>
                        <span className="ml-2">✓</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {!weeklyPlan && !isGenerating && (
        <div className="text-center py-12">
          <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
          <div className="space-y-2">
            <p className="text-gray-500 font-medium">Buat rencana menu mingguan yang fleksibel!</p>
            <p className="text-gray-400 text-sm">
              Sistem akan mengoptimalkan penggunaan bahan yang ada, lalu melengkapi dengan resep dataset dan saran AI
            </p>
            <p className="text-gray-400 text-sm">
              Setiap hari akan memiliki minimal 1 resep, maksimal 3 resep yang bisa disesuaikan
            </p>
            {getCurrentWeekPlan() && (
              <p className="text-blue-600 text-sm font-medium">
                Anda sudah memiliki rencana untuk minggu ini. Klik "Buat Rencana Menu" untuk membuat yang baru.
              </p>
            )}
          </div>
        </div>
      )}

      {/* People Count Modal */}
      <PeopleCountModal
        isOpen={showPeopleModal}
        onClose={() => setShowPeopleModal(false)}
        onConfirm={generateWeeklyPlan}
      />

      {/* Recipe Selection Modal */}
      {selectionContext && (
        <RecipeSelectionModal
          isOpen={showRecipeSelection}
          onClose={() => {
            setShowRecipeSelection(false);
            setSelectionContext(null);
          }}
          onSelectRecipe={(recipe) => {
            if (selectionContext) {
              assignRecipeToSlot(selectionContext.dayIndex, selectionContext.slotIndex, recipe);
            }
          }}
          savedRecipes={recipes}
          ingredients={ingredients}
          dayName={selectionContext.dayName}
          slotNumber={selectionContext.slotIndex + 1}
        />
      )}

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