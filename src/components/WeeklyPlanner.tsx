import React, { useState, useEffect } from 'react';
import { Calendar, ShoppingCart, Clock, Users, Plus, X, Search, Sparkles, Database, BookOpen, ChefHat } from 'lucide-react';
import { Recipe, WeeklyPlan, DailyMeals, ShoppingItem, Ingredient } from '../types';
import { useWeeklyPlans } from '../hooks/useWeeklyPlans';
import { useAuth } from '../hooks/useAuth';
import SupabaseDatasetService, { RecipeRecommendation } from '../services/supabaseDatasetService';
import { isFeatureEnabledSync } from '../lib/featureFlags';

interface WeeklyPlannerProps {
  recipes: Recipe[];
  ingredients: Ingredient[];
}

interface RecipeSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRecipe: (recipe: Recipe | null) => void;
  dayName: string;
  slotNumber: number;
  savedRecipes: Recipe[];
  ingredients: Ingredient[];
}

const RecipeSelectionModal: React.FC<RecipeSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectRecipe,
  dayName,
  slotNumber,
  savedRecipes,
  ingredients,
}) => {
  const [activeTab, setActiveTab] = useState<'saved' | 'dataset'>('saved');
  const [searchQuery, setSearchQuery] = useState('');
  const [datasetRecipes, setDatasetRecipes] = useState<RecipeRecommendation[]>([]);
  const [loadingDataset, setLoadingDataset] = useState(false);
  const [datasetService] = useState(() => new SupabaseDatasetService());

  const isDatasetEnabled = isFeatureEnabledSync('dataset');

  // Auto-generate dataset recommendations when modal opens
  useEffect(() => {
    if (isOpen && isDatasetEnabled && ingredients.length > 0) {
      generateDatasetRecommendations();
    }
  }, [isOpen, isDatasetEnabled, ingredients]);

  const generateDatasetRecommendations = async () => {
    if (!isDatasetEnabled || ingredients.length === 0) return;

    setLoadingDataset(true);
    try {
      const recommendations = await datasetService.getRecommendations(
        ingredients,
        30, // Lower minimum loves for more variety
        8   // Get 8 recommendations
      );
      setDatasetRecipes(recommendations);
      
      // Auto-switch to dataset tab if we have good recommendations
      if (recommendations.length > 0 && activeTab === 'saved' && savedRecipes.length === 0) {
        setActiveTab('dataset');
      }
    } catch (error) {
      console.error('Error generating dataset recommendations:', error);
    } finally {
      setLoadingDataset(false);
    }
  };

  const filteredSavedRecipes = savedRecipes.filter(recipe =>
    recipe.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDatasetRecipes = datasetRecipes.filter(recipe =>
    recipe.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleRecipeSelect = (recipe: Recipe) => {
    onSelectRecipe(recipe);
    onClose();
  };

  const handleRemoveRecipe = () => {
    onSelectRecipe(null);
    onClose();
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

        {/* Search Bar */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari resep..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('saved')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === 'saved'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <BookOpen size={16} />
              Resep Tersimpan ({filteredSavedRecipes.length})
            </div>
          </button>
          {isDatasetEnabled && (
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
                Dataset Komunitas ({filteredDatasetRecipes.length})
                {loadingDataset && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                )}
              </div>
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {/* Auto-generate button for dataset */}
          {activeTab === 'dataset' && isDatasetEnabled && (
            <div className="mb-4">
              <button
                onClick={generateDatasetRecommendations}
                disabled={loadingDataset || ingredients.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <Sparkles size={16} className={loadingDataset ? 'animate-spin' : ''} />
                {loadingDataset ? 'Mencari Resep...' : 'Cari Resep Terbaik dari Dataset'}
              </button>
              {ingredients.length === 0 && (
                <p className="text-sm text-gray-500 mt-2">
                  Tambahkan bahan-bahan di tab "Bahan" untuk mendapatkan rekomendasi yang lebih baik
                </p>
              )}
            </div>
          )}

          {/* Recipe Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeTab === 'saved' ? (
              filteredSavedRecipes.length > 0 ? (
                filteredSavedRecipes.map((recipe) => (
                  <div
                    key={recipe.id}
                    onClick={() => handleRecipeSelect(recipe)}
                    className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-900 line-clamp-1">{recipe.name}</h4>
                      <BookOpen className="text-green-500 flex-shrink-0 ml-2" size={16} />
                    </div>
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">{recipe.description}</p>
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
                ))
              ) : (
                <div className="col-span-2 text-center py-8">
                  <ChefHat size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">
                    {searchQuery ? 'Tidak ada resep yang cocok dengan pencarian' : 'Belum ada resep tersimpan'}
                  </p>
                </div>
              )
            ) : (
              // Dataset recipes
              filteredDatasetRecipes.length > 0 ? (
                filteredDatasetRecipes.map((recipe) => (
                  <div
                    key={recipe.id}
                    onClick={() => handleRecipeSelect(recipe)}
                    className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-900 line-clamp-1">{recipe.name}</h4>
                      <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                        <Database className="text-blue-500" size={16} />
                        <span className="text-xs text-blue-600 font-medium">
                          {Math.round(recipe.match_score * 100)}%
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">{recipe.description}</p>
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
                    {recipe.match_reasons.length > 0 && (
                      <div className="text-xs text-green-600">
                        💡 {recipe.match_reasons[0]}
                      </div>
                    )}
                  </div>
                ))
              ) : loadingDataset ? (
                <div className="col-span-2 text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <p className="text-gray-600">Mencari resep terbaik dari dataset...</p>
                </div>
              ) : (
                <div className="col-span-2 text-center py-8">
                  <Database size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500 mb-4">
                    {searchQuery ? 'Tidak ada resep dataset yang cocok' : 'Klik tombol di atas untuk mencari resep dari dataset'}
                  </p>
                  {!searchQuery && ingredients.length === 0 && (
                    <p className="text-sm text-gray-400">
                      Tip: Tambahkan bahan-bahan untuk mendapatkan rekomendasi yang lebih relevan
                    </p>
                  )}
                </div>
              )
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleRemoveRecipe}
            className="px-4 py-2 text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
          >
            Hapus Resep
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Batal
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
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{
    dayIndex: number;
    slotType: 'breakfast' | 'lunch' | 'dinner';
    dayName: string;
    slotNumber: number;
  } | null>(null);
  const [peopleCount, setPeopleCount] = useState(4);

  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
  const mealLabels = {
    breakfast: 'Sarapan',
    lunch: 'Makan Siang',
    dinner: 'Makan Malam',
  };

  // Load current week plan on component mount
  useEffect(() => {
    const currentPlan = getCurrentWeekPlan();
    setCurrentWeekPlan(currentPlan);
    if (currentPlan) {
      generateShoppingList(currentPlan);
    }
  }, [weeklyPlans]);

  const generateWeeklyPlan = async () => {
    setIsGenerating(true);
    
    try {
      const today = new Date();
      const monday = new Date(today);
      monday.setDate(today.getDate() - today.getDay() + 1);
      const weekStart = monday.toISOString().slice(0, 10);
      
      const dailyMeals: DailyMeals[] = [];
      
      // Generate meals for each day
      for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        
        const dayMeals: DailyMeals = {
          date: date.toISOString().slice(0, 10),
        };
        
        // Randomly assign recipes with higher probability for user recipes
        const availableRecipes = recipes.length > 0 ? recipes : [];
        
        if (availableRecipes.length > 0) {
          // At least one meal per day
          const mealTypes: (keyof DailyMeals)[] = ['breakfast', 'lunch', 'dinner'];
          const guaranteedMeal = mealTypes[Math.floor(Math.random() * mealTypes.length)];
          
          // Assign the guaranteed meal
          if (guaranteedMeal !== 'date') {
            dayMeals[guaranteedMeal] = availableRecipes[Math.floor(Math.random() * availableRecipes.length)];
          }
          
          // Randomly assign other meals (60% chance each)
          mealTypes.forEach(mealType => {
            if (mealType !== 'date' && mealType !== guaranteedMeal && Math.random() > 0.4) {
              dayMeals[mealType] = availableRecipes[Math.floor(Math.random() * availableRecipes.length)];
            }
          });
        }
        
        dailyMeals.push(dayMeals);
      }
      
      const newPlan = await saveWeeklyPlan(weekStart, dailyMeals, peopleCount);
      setCurrentWeekPlan(newPlan);
      generateShoppingList(newPlan);
    } catch (error) {
      console.error('Error generating weekly plan:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateShoppingList = (plan: WeeklyPlan) => {
    const neededIngredients: Record<string, ShoppingItem> = {};
    
    // Collect all ingredients needed for the week
    (plan.daily_meals || []).forEach(day => {
      [day.breakfast, day.lunch, day.dinner].forEach(recipe => {
        if (recipe && recipe.recipe_ingredients) {
          recipe.recipe_ingredients.forEach(ingredient => {
            const key = ingredient.name.toLowerCase();
            if (neededIngredients[key]) {
              neededIngredients[key].quantity += ingredient.quantity * (peopleCount / recipe.servings);
            } else {
              neededIngredients[key] = {
                id: 'shopping-' + Date.now() + Math.random(),
                name: ingredient.name,
                quantity: ingredient.quantity * (peopleCount / recipe.servings),
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

  const handleAddRecipe = (dayIndex: number, mealType: 'breakfast' | 'lunch' | 'dinner') => {
    const slotNumber = mealType === 'breakfast' ? 1 : mealType === 'lunch' ? 2 : 3;
    setSelectedSlot({
      dayIndex,
      slotType: mealType,
      dayName: days[dayIndex],
      slotNumber,
    });
    setShowRecipeModal(true);
  };

  const handleRecipeSelect = async (recipe: Recipe | null) => {
    if (!selectedSlot || !currentWeekPlan) return;

    const updatedDailyMeals = [...(currentWeekPlan.daily_meals || [])];
    
    // Ensure we have a meal object for this day
    if (!updatedDailyMeals[selectedSlot.dayIndex]) {
      const date = new Date();
      date.setDate(date.getDate() - date.getDay() + 1 + selectedSlot.dayIndex);
      updatedDailyMeals[selectedSlot.dayIndex] = {
        date: date.toISOString().slice(0, 10),
      };
    }
    
    // Update the specific meal
    updatedDailyMeals[selectedSlot.dayIndex][selectedSlot.slotType] = recipe;
    
    try {
      // Save the updated plan
      const updatedPlan = await saveWeeklyPlan(
        currentWeekPlan.week_start,
        updatedDailyMeals,
        peopleCount
      );
      setCurrentWeekPlan(updatedPlan);
      generateShoppingList(updatedPlan);
    } catch (error) {
      console.error('Error updating weekly plan:', error);
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
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Jumlah Orang:</label>
            <input
              type="number"
              value={peopleCount}
              onChange={(e) => setPeopleCount(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
              min="1"
              max="20"
            />
          </div>
          <button
            onClick={generateWeeklyPlan}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <Calendar size={18} />
            {isGenerating ? 'Sedang membuat...' : currentWeekPlan ? 'Buat Ulang' : 'Buat Rencana Menu'}
          </button>
        </div>
      </div>

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
                <div className="space-y-3">
                  {(['breakfast', 'lunch', 'dinner'] as const).map((mealType) => (
                    <div key={mealType} className="border border-gray-200 rounded-lg p-2">
                      <div className="text-xs font-medium text-gray-600 mb-1">
                        {mealLabels[mealType]}
                      </div>
                      {day[mealType] ? (
                        <div className="text-sm">
                          <div className="font-medium text-gray-900 mb-1 line-clamp-2">
                            {day[mealType]!.name}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                            <Clock size={12} />
                            <span>
                              {day[mealType]!.prep_time + day[mealType]!.cook_time} menit
                            </span>
                            <Users size={12} />
                            <span>{day[mealType]!.servings} porsi</span>
                          </div>
                          <button
                            onClick={() => handleAddRecipe(dayIndex, mealType)}
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            Ganti
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAddRecipe(dayIndex, mealType)}
                          className="w-full flex items-center justify-center gap-1 py-2 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          <Plus size={14} />
                          Tambah Resep
                        </button>
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
                <h3 className="text-lg font-semibold text-gray-900">Daftar Belanja</h3>
                <span className="text-sm text-gray-500">({peopleCount} orang)</span>
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
                          {Math.ceil(item.quantity * 10) / 10} {unitTranslations[item.unit] || item.unit}
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

      {!currentWeekPlan && !isGenerating && (
        <div className="text-center py-12">
          <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500 mb-4">Buat rencana menu mingguan pertama Anda untuk memulai!</p>
          <p className="text-sm text-gray-400">
            Sistem akan menggunakan resep tersimpan Anda dan memberikan opsi untuk menambah dari dataset komunitas
          </p>
        </div>
      )}

      {/* Recipe Selection Modal */}
      <RecipeSelectionModal
        isOpen={showRecipeModal}
        onClose={() => {
          setShowRecipeModal(false);
          setSelectedSlot(null);
        }}
        onSelectRecipe={handleRecipeSelect}
        dayName={selectedSlot?.dayName || ''}
        slotNumber={selectedSlot?.slotNumber || 1}
        savedRecipes={recipes}
        ingredients={ingredients}
      />
    </div>
  );
};