import React, { useState, useEffect } from 'react';
import { Calendar, ShoppingCart, Clock, Users, Plus, Trash2, Save, CheckCircle, AlertCircle, Edit } from 'lucide-react';
import { Recipe, WeeklyPlan, DailyMeals, ShoppingItem, Ingredient } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useWeeklyPlans } from '../hooks/useWeeklyPlans';
import SupabaseDatasetService, { RecipeRecommendation } from '../services/supabaseDatasetService';
import { isFeatureEnabledSync } from '../lib/featureFlags';

interface WeeklyPlannerProps {
  recipes: Recipe[];
  ingredients: Ingredient[];
}

interface RecipeSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRecipe: (recipe: Recipe) => void;
  dayName: string;
  userRecipes: Recipe[];
  ingredients: Ingredient[];
}

const RecipeSelectionModal: React.FC<RecipeSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectRecipe,
  dayName,
  userRecipes,
  ingredients,
}) => {
  const [activeTab, setActiveTab] = useState<'saved' | 'dataset'>('saved');
  const [datasetRecipes, setDatasetRecipes] = useState<RecipeRecommendation[]>([]);
  const [isLoadingDataset, setIsLoadingDataset] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [datasetService] = useState(() => new SupabaseDatasetService());

  const filteredUserRecipes = userRecipes.filter(recipe =>
    recipe.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    if (isOpen && activeTab === 'dataset' && isFeatureEnabledSync('dataset')) {
      loadDatasetRecipes();
    }
  }, [isOpen, activeTab]);

  const loadDatasetRecipes = async () => {
    if (ingredients.length === 0) return;

    setIsLoadingDataset(true);
    try {
      const recommendations = await datasetService.getRecommendations(ingredients, 50, 12);
      setDatasetRecipes(recommendations);
    } catch (error) {
      console.error('Error loading dataset recipes:', error);
    } finally {
      setIsLoadingDataset(false);
    }
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
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Pilih Resep untuk {dayName}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Pilih resep dari koleksi Anda atau temukan dari dataset komunitas
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            ×
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
              <Save size={16} />
              Resep Tersimpan ({userRecipes.length})
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
                <Calendar size={16} />
                Dataset Komunitas
              </div>
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {activeTab === 'saved' && (
            <div>
              {/* Search for saved recipes */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Cari resep tersimpan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              {filteredUserRecipes.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">
                    {searchQuery ? 'Tidak ada resep yang cocok dengan pencarian' : 'Belum ada resep tersimpan'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredUserRecipes.map((recipe) => (
                    <div
                      key={recipe.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => onSelectRecipe(recipe)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{recipe.name}</h4>
                        <Save className="text-green-500" size={16} />
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{recipe.description}</p>
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

          {activeTab === 'dataset' && isFeatureEnabledSync('dataset') && (
            <div>
              {isLoadingDataset ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <p className="text-gray-600">Memuat resep dari dataset...</p>
                </div>
              ) : datasetRecipes.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">
                    {ingredients.length === 0 
                      ? 'Tambahkan bahan-bahan untuk mendapatkan rekomendasi dari dataset'
                      : 'Tidak ada resep dataset yang cocok dengan bahan Anda'
                    }
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {datasetRecipes.map((recipe) => (
                    <div
                      key={recipe.id}
                      className="border border-blue-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => onSelectRecipe(recipe)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{recipe.name}</h4>
                        <div className="flex items-center gap-1">
                          <Calendar className="text-blue-500" size={16} />
                          <span className="text-xs text-blue-600">
                            {Math.round(recipe.match_score * 100)}%
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{recipe.description}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                        <div className="flex items-center gap-1">
                          <Clock size={12} />
                          <span>{recipe.prep_time + recipe.cook_time} menit</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users size={12} />
                          <span>{recipe.servings} porsi</span>
                        </div>
                        <span className="text-pink-600">❤️ {recipe.loves_count}</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {recipe.match_reasons.slice(0, 1).map((reason, index) => (
                          <div key={index}>• {reason}</div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4">
          <button
            onClick={onClose}
            className="w-full bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors"
          >
            Tutup
          </button>
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
  const { 
    weeklyPlans, 
    loading: plansLoading, 
    saveWeeklyPlan, 
    getCurrentWeekPlan 
  } = useWeeklyPlans(user?.id);

  const [currentWeekPlan, setCurrentWeekPlan] = useState<WeeklyPlan | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [peopleCount, setPeopleCount] = useState(4);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState<{
    dayIndex: number;
    dayName: string;
  } | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

  // Load current week plan when component mounts or plans change
  useEffect(() => {
    if (!plansLoading) {
      const currentPlan = getCurrentWeekPlan();
      setCurrentWeekPlan(currentPlan);
      if (currentPlan) {
        generateShoppingList(currentPlan);
      }
    }
  }, [plansLoading, weeklyPlans]);

  const generateWeeklyPlan = () => {
    setIsGenerating(true);
    
    setTimeout(() => {
      const today = new Date();
      const monday = new Date(today);
      monday.setDate(today.getDate() - today.getDay() + 1);
      const currentWeek = monday.toISOString().slice(0, 10);
      
      const dailyMeals: DailyMeals[] = [];
      
      // Generate a simple weekly plan
      for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        
        const dayMeals: DailyMeals = {
          date: date.toISOString().slice(0, 10),
          recipes: [], // Initialize with empty recipes array
        };
        
        // Add 1-2 random recipes per day if available
        if (recipes.length > 0) {
          const numRecipes = Math.floor(Math.random() * 2) + 1; // 1-2 recipes
          const shuffledRecipes = [...recipes].sort(() => Math.random() - 0.5);
          
          for (let j = 0; j < Math.min(numRecipes, shuffledRecipes.length); j++) {
            dayMeals.recipes!.push(shuffledRecipes[j]);
          }
        }
        
        dailyMeals.push(dayMeals);
      }
      
      const newPlan: WeeklyPlan = {
        id: 'temp-' + Date.now(),
        week_start: currentWeek,
        user_id: user?.id || '',
        daily_meals: dailyMeals,
      };
      
      setCurrentWeekPlan(newPlan);
      generateShoppingList(newPlan);
      setHasUnsavedChanges(true);
      setIsGenerating(false);
    }, 2000);
  };

  const handleSaveWeeklyPlan = async () => {
    if (!currentWeekPlan || !user?.id) return;

    setIsSaving(true);
    try {
      const savedPlan = await saveWeeklyPlan(
        currentWeekPlan.week_start,
        currentWeekPlan.daily_meals || [],
        peopleCount
      );
      setCurrentWeekPlan(savedPlan);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Error saving weekly plan:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const generateShoppingList = (plan: WeeklyPlan) => {
    const neededIngredients: Record<string, ShoppingItem> = {};
    
    // Collect all ingredients needed for the week
    (plan.daily_meals || []).forEach(day => {
      (day.recipes || []).forEach(recipe => {
        if (recipe && recipe.recipe_ingredients) {
          recipe.recipe_ingredients.forEach(ingredient => {
            const key = ingredient.name.toLowerCase();
            if (neededIngredients[key]) {
              neededIngredients[key].quantity += ingredient.quantity;
            } else {
              neededIngredients[key] = {
                id: 'shopping-' + Date.now() + Math.random(),
                name: ingredient.name,
                quantity: ingredient.quantity,
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

  const handleAddRecipe = (dayIndex: number) => {
    setSelectedDay({
      dayIndex,
      dayName: days[dayIndex],
    });
    setShowRecipeModal(true);
  };

  const handleSelectRecipe = (recipe: Recipe) => {
    if (!selectedDay || !currentWeekPlan) return;

    const updatedMeals = [...(currentWeekPlan.daily_meals || [])];
    if (!updatedMeals[selectedDay.dayIndex]) {
      const date = new Date();
      date.setDate(date.getDate() - date.getDay() + 1 + selectedDay.dayIndex);
      updatedMeals[selectedDay.dayIndex] = {
        date: date.toISOString().slice(0, 10),
        recipes: [],
      };
    }
    
    // Add recipe to the day's recipes list
    if (!updatedMeals[selectedDay.dayIndex].recipes) {
      updatedMeals[selectedDay.dayIndex].recipes = [];
    }
    
    // Check if we already have 3 recipes for this day
    if (updatedMeals[selectedDay.dayIndex].recipes!.length >= 3) {
      alert('Maksimal 3 resep per hari');
      return;
    }
    
    updatedMeals[selectedDay.dayIndex].recipes!.push(recipe);
    
    const updatedPlan = {
      ...currentWeekPlan,
      daily_meals: updatedMeals,
    };
    
    setCurrentWeekPlan(updatedPlan);
    generateShoppingList(updatedPlan);
    setHasUnsavedChanges(true);
    setShowRecipeModal(false);
    setSelectedDay(null);
  };

  const handleRemoveRecipe = (dayIndex: number, recipeIndex: number) => {
    if (!currentWeekPlan) return;

    const updatedMeals = [...(currentWeekPlan.daily_meals || [])];
    if (updatedMeals[dayIndex] && updatedMeals[dayIndex].recipes) {
      updatedMeals[dayIndex].recipes!.splice(recipeIndex, 1);
    }
    
    const updatedPlan = {
      ...currentWeekPlan,
      daily_meals: updatedMeals,
    };
    
    setCurrentWeekPlan(updatedPlan);
    generateShoppingList(updatedPlan);
    setHasUnsavedChanges(true);
  };

  const handleChangeRecipe = (dayIndex: number, recipeIndex: number) => {
    // Store which recipe we're replacing
    setSelectedDay({
      dayIndex,
      dayName: days[dayIndex],
      replacingIndex: recipeIndex,
    } as any);
    setShowRecipeModal(true);
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
  };

  if (plansLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Rencana Menu Mingguan</h2>
          <p className="text-gray-600 mt-1">Rencanakan menu makan untuk seminggu dengan efisien</p>
        </div>
        <div className="flex items-center gap-3">
          {currentWeekPlan && hasUnsavedChanges && (
            <button
              onClick={handleSaveWeeklyPlan}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Simpan Rencana
                </>
              )}
            </button>
          )}
          <button
            onClick={generateWeeklyPlan}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <Calendar size={18} />
            {isGenerating ? 'Sedang membuat...' : 'Buat Rencana Menu'}
          </button>
        </div>
      </div>

      {/* People Count Selector */}
      <div className="bg-white p-4 rounded-lg shadow-md border border-gray-100">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">
            Jumlah Orang:
          </label>
          <select
            value={peopleCount}
            onChange={(e) => setPeopleCount(Number(e.target.value))}
            className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map(count => (
              <option key={count} value={count}>{count} orang</option>
            ))}
          </select>
        </div>
      </div>

      {/* Status Indicator */}
      {currentWeekPlan && (
        <div className="bg-white p-4 rounded-lg shadow-md border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {hasUnsavedChanges ? (
                <>
                  <AlertCircle className="text-yellow-500" size={20} />
                  <span className="text-yellow-700 font-medium">Ada perubahan yang belum disimpan</span>
                </>
              ) : (
                <>
                  <CheckCircle className="text-green-500" size={20} />
                  <span className="text-green-700 font-medium">Rencana tersimpan</span>
                </>
              )}
            </div>
            <div className="text-sm text-gray-500">
              Minggu: {new Date(currentWeekPlan.week_start).toLocaleDateString('id-ID')}
            </div>
          </div>
        </div>
      )}

      {isGenerating && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Sedang membuat rencana menu mingguan yang optimal...</p>
        </div>
      )}

      {currentWeekPlan && currentWeekPlan.daily_meals && !isGenerating && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
            {currentWeekPlan.daily_meals.map((day, dayIndex) => (
              <div key={dayIndex} className="bg-white rounded-lg shadow-md border border-blue-100 p-4">
                <h3 className="font-semibold text-gray-900 mb-3 text-center">
                  {days[dayIndex]}
                </h3>
                <div className="space-y-2">
                  {/* Display existing recipes */}
                  {(day.recipes || []).map((recipe, recipeIndex) => (
                    <div key={recipeIndex} className="border border-gray-200 rounded-lg p-2">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900 mb-1">
                          {recipe.name}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                          <Clock size={12} />
                          <span>{recipe.prep_time + recipe.cook_time} menit</span>
                          <Users size={12} />
                          <span>{recipe.servings} porsi</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleChangeRecipe(dayIndex, recipeIndex)}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                          >
                            <Edit size={12} />
                            Ubah
                          </button>
                          <span className="text-gray-300">|</span>
                          <button
                            onClick={() => handleRemoveRecipe(dayIndex, recipeIndex)}
                            className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800"
                          >
                            <Trash2 size={12} />
                            Hapus
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Add recipe button - only show if less than 3 recipes */}
                  {(!day.recipes || day.recipes.length < 3) && (
                    <button
                      onClick={() => handleAddRecipe(dayIndex)}
                      className="w-full text-xs text-blue-600 hover:text-blue-800 border border-dashed border-blue-300 rounded p-3 hover:bg-blue-50 transition-colors"
                    >
                      <Plus size={16} className="mx-auto mb-1" />
                      Tambah Resep
                      {day.recipes && day.recipes.length > 0 && (
                        <div className="text-gray-500 mt-1">
                          ({day.recipes.length}/3)
                        </div>
                      )}
                    </button>
                  )}
                  
                  {/* Show count if at max */}
                  {day.recipes && day.recipes.length >= 3 && (
                    <div className="text-center text-xs text-gray-500 py-2">
                      Maksimal 3 resep per hari
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!currentWeekPlan && !isGenerating && (
        <div className="text-center py-12">
          <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">Buat rencana menu mingguan pertama Anda untuk memulai!</p>
        </div>
      )}

      {/* Recipe Selection Modal */}
      <RecipeSelectionModal
        isOpen={showRecipeModal}
        onClose={() => {
          setShowRecipeModal(false);
          setSelectedDay(null);
        }}
        onSelectRecipe={(recipe) => {
          if (selectedDay && 'replacingIndex' in selectedDay) {
            // Replace existing recipe
            if (!currentWeekPlan) return;
            const updatedMeals = [...(currentWeekPlan.daily_meals || [])];
            if (updatedMeals[selectedDay.dayIndex] && updatedMeals[selectedDay.dayIndex].recipes) {
              updatedMeals[selectedDay.dayIndex].recipes![selectedDay.replacingIndex] = recipe;
              const updatedPlan = {
                ...currentWeekPlan,
                daily_meals: updatedMeals,
              };
              setCurrentWeekPlan(updatedPlan);
              generateShoppingList(updatedPlan);
              setHasUnsavedChanges(true);
            }
          } else {
            // Add new recipe
            handleSelectRecipe(recipe);
          }
          setShowRecipeModal(false);
          setSelectedDay(null);
        }}
        dayName={selectedDay?.dayName || ''}
        userRecipes={recipes}
        ingredients={ingredients}
      />
    </div>
  );
};