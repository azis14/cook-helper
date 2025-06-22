import React, { useState } from 'react';
import { Calendar, ShoppingCart, Clock, Users, Plus, Trash2, RefreshCw, ChefHat, Sparkles, Database } from 'lucide-react';
import { Recipe, WeeklyPlan, DailyMeals, ShoppingItem, Ingredient } from '../types';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import GeminiService from '../services/geminiService';
import SupabaseDatasetService from '../services/supabaseDatasetService';
import { isFeatureEnabledSync } from '../lib/featureFlags';

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
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [showPeopleModal, setShowPeopleModal] = useState(false);
  const [peopleCount, setPeopleCount] = useState(4);
  const [generationProgress, setGenerationProgress] = useState('');

  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
  const meals = ['breakfast', 'lunch', 'dinner'];
  const mealLabels = {
    breakfast: 'Sarapan',
    lunch: 'Makan Siang',
    dinner: 'Makan Malam',
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

      // Create a pool of available recipes
      let availableRecipes = [...recipes];
      let datasetRecipes: any[] = [];
      
      // Get dataset recipes if feature is enabled
      if (isFeatureEnabledSync('dataset')) {
        setGenerationProgress('Mengambil resep dari dataset...');
        try {
          datasetRecipes = await datasetService.getRecommendations(ingredients, 50, 20);
        } catch (error) {
          console.warn('Failed to get dataset recipes:', error);
        }
      }

      setGenerationProgress('Menyusun menu untuk 7 hari...');

      // Generate meals for 7 days
      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        
        const dayMeals: DailyMeals = {
          date: date.toISOString().slice(0, 10),
        };

        // For each meal type, try to assign a recipe
        for (const mealType of meals) {
          let assignedRecipe: Recipe | null = null;

          // Priority 1: Use saved recipes (80% preference)
          if (availableRecipes.length > 0 && Math.random() > 0.2) {
            const randomIndex = Math.floor(Math.random() * availableRecipes.length);
            assignedRecipe = availableRecipes[randomIndex];
            
            // Remove from available pool to avoid repetition
            availableRecipes.splice(randomIndex, 1);
          }
          // Priority 2: Use dataset recipes
          else if (datasetRecipes.length > 0 && Math.random() > 0.3) {
            const randomIndex = Math.floor(Math.random() * datasetRecipes.length);
            assignedRecipe = datasetRecipes[randomIndex];
            
            // Remove from available pool
            datasetRecipes.splice(randomIndex, 1);
          }

          // Assign the recipe to the meal
          if (assignedRecipe) {
            dayMeals[mealType as keyof DailyMeals] = assignedRecipe;
          }
        }
        
        dailyMeals.push(dayMeals);
      }

      // Fill empty slots with AI suggestions if available
      if (geminiService && isFeatureEnabledSync('suggestions')) {
        setGenerationProgress('Mengisi slot kosong dengan saran AI...');
        
        const emptySlots = dailyMeals.reduce((count, day) => {
          return count + meals.filter(meal => !day[meal as keyof DailyMeals]).length;
        }, 0);

        if (emptySlots > 0) {
          try {
            // Generate AI recipes for empty slots
            const aiRecipes = await geminiService.generateRecipeSuggestions(ingredients);
            let aiRecipeIndex = 0;

            for (const day of dailyMeals) {
              for (const mealType of meals) {
                if (!day[mealType as keyof DailyMeals] && aiRecipeIndex < aiRecipes.length) {
                  day[mealType as keyof DailyMeals] = aiRecipes[aiRecipeIndex];
                  aiRecipeIndex++;
                }
              }
            }
          } catch (error) {
            console.warn('Failed to generate AI recipes:', error);
          }
        }
      }

      setGenerationProgress('Menyelesaikan rencana menu...');
      
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

    // Check what we already have
    const availableIngredients = ingredients.reduce((acc, ing) => {
      acc[ing.name.toLowerCase()] = ing.quantity;
      return acc;
    }, {} as Record<string, number>);

    // Mark items as needed or not
    Object.values(neededIngredients).forEach(item => {
      const available = availableIngredients[item.name.toLowerCase()] || 0;
      if (available >= item.quantity) {
        item.needed = false;
      } else {
        item.quantity = Math.max(0, item.quantity - available);
      }
    });

    setShoppingList(Object.values(neededIngredients));
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

  const getRecipeSource = (recipe: Recipe) => {
    if (recipe.user_id === 'ai-generated' || recipe.id.startsWith('gemini-')) {
      return { type: 'ai', icon: Sparkles, color: 'text-purple-500' };
    } else if (recipe.user_id === 'dataset') {
      return { type: 'dataset', icon: Database, color: 'text-blue-500' };
    } else {
      return { type: 'saved', icon: ChefHat, color: 'text-green-500' };
    }
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
    secukupnya: 'secukupnya',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Rencana Menu Mingguan</h2>
          <p className="text-gray-600 mt-1">Rencanakan menu makan untuk seminggu dengan efisien</p>
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
                <span>Resep Tersimpan</span>
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
                            <div className="font-medium text-gray-900 line-clamp-2 flex-1">
                              {(day[mealType as keyof DailyMeals] as Recipe)?.name}
                            </div>
                            <div className="ml-1 flex-shrink-0">
                              {(() => {
                                const source = getRecipeSource(day[mealType as keyof DailyMeals] as Recipe);
                                const SourceIcon = source.icon;
                                return <SourceIcon className={source.color} size={14} />;
                              })()}
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
                          <button
                            onClick={() => assignMealToDay(dayIndex, mealType as keyof DailyMeals, null)}
                            className="text-xs text-red-600 hover:text-red-800 mt-1"
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

          {shoppingList.length > 0 && (
            <div className="bg-white rounded-lg shadow-md border border-green-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <ShoppingCart className="text-green-600" size={24} />
                <h3 className="text-lg font-semibold text-gray-900">
                  Daftar Belanja untuk {peopleCount} Orang
                </h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <h4 className="font-medium text-green-800 mb-2 flex items-center gap-2">
                    <Plus className="text-green-600" size={16} />
                    Perlu Dibeli ({shoppingList.filter(item => item.needed).length} item)
                  </h4>
                  <ul className="space-y-1">
                    {shoppingList.filter(item => item.needed).map(item => (
                      <li key={item.id} className="text-sm text-gray-700 flex justify-between">
                        <span className="font-medium">{item.name}</span>
                        <span className="text-gray-500">
                          {Math.ceil(item.quantity * 10) / 10} {unitTranslations[item.unit] || item.unit}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                    <CheckCircle className="text-blue-600" size={16} />
                    Sudah Ada ({shoppingList.filter(item => !item.needed).length} item)
                  </h4>
                  <ul className="space-y-1">
                    {shoppingList.filter(item => !item.needed).map(item => (
                      <li key={item.id} className="text-sm text-gray-500 flex justify-between">
                        <span>{item.name}</span>
                        <span>✓</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-gray-800 mb-2">Ringkasan</h4>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>Total item:</span>
                      <span className="font-medium">{shoppingList.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Perlu beli:</span>
                      <span className="font-medium text-green-600">
                        {shoppingList.filter(item => item.needed).length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sudah ada:</span>
                      <span className="font-medium text-blue-600">
                        {shoppingList.filter(item => !item.needed).length}
                      </span>
                    </div>
                  </div>
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
            <p className="text-gray-500 font-medium">Buat rencana menu mingguan pertama Anda!</p>
            <p className="text-gray-400 text-sm">
              Sistem akan memprioritaskan resep tersimpan Anda, lalu mengisi dengan resep dataset dan saran AI
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
    </div>
  );
};