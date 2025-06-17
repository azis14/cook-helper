import React, { useState } from 'react';
import { Calendar, ShoppingCart, Clock, Users } from 'lucide-react';
import { Recipe, WeeklyPlan, DailyMeals, ShoppingItem, Ingredient } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface WeeklyPlannerProps {
  recipes: Recipe[];
  ingredients: Ingredient[];
  weeklyPlan: WeeklyPlan | null;
  onUpdatePlan: (plan: WeeklyPlan) => void;
}

export const WeeklyPlanner: React.FC<WeeklyPlannerProps> = ({
  recipes,
  ingredients,
  weeklyPlan,
  onUpdatePlan,
}) => {
  const { t } = useLanguage();
  const [isGenerating, setIsGenerating] = useState(false);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const meals = ['breakfast', 'lunch', 'dinner'];

  const generateWeeklyPlan = () => {
    setIsGenerating(true);
    
    setTimeout(() => {
      const currentWeek = new Date().toISOString().slice(0, 10);
      const dailyMeals: DailyMeals[] = [];
      
      // Generate a simple weekly plan
      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        
        const dayMeals: DailyMeals = {
          date: date.toISOString().slice(0, 10),
        };
        
        // Randomly assign recipes or create simple suggestions
        if (recipes.length > 0) {
          if (Math.random() > 0.3) {
            dayMeals.breakfast = recipes[Math.floor(Math.random() * recipes.length)];
          }
          if (Math.random() > 0.2) {
            dayMeals.lunch = recipes[Math.floor(Math.random() * recipes.length)];
          }
          if (Math.random() > 0.1) {
            dayMeals.dinner = recipes[Math.floor(Math.random() * recipes.length)];
          }
        }
        
        dailyMeals.push(dayMeals);
      }
      
      const newPlan: WeeklyPlan = {
        id: 'plan-' + Date.now(),
        week: currentWeek,
        meals: dailyMeals,
      };
      
      onUpdatePlan(newPlan);
      generateShoppingList(newPlan);
      setIsGenerating(false);
    }, 2000);
  };

  const generateShoppingList = (plan: WeeklyPlan) => {
    const neededIngredients: Record<string, ShoppingItem> = {};
    
    // Collect all ingredients needed for the week
    plan.meals.forEach(day => {
      [day.breakfast, day.lunch, day.dinner].forEach(recipe => {
        if (recipe) {
          recipe.ingredients.forEach(ingredient => {
            const key = ingredient.name.toLowerCase();
            if (neededIngredients[key]) {
              neededIngredients[key].quantity += ingredient.quantity;
            } else {
              neededIngredients[key] = {
                id: 'shopping-' + Date.now() + Math.random(),
                name: ingredient.name,
                nameId: ingredient.nameId,
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
        item.quantity = item.quantity - available;
      }
    });

    setShoppingList(Object.values(neededIngredients));
  };

  const assignMealToDay = (dayIndex: number, mealType: keyof DailyMeals, recipe: Recipe | null) => {
    if (!weeklyPlan) return;
    
    const updatedMeals = [...weeklyPlan.meals];
    updatedMeals[dayIndex] = {
      ...updatedMeals[dayIndex],
      [mealType]: recipe,
    };
    
    const updatedPlan = {
      ...weeklyPlan,
      meals: updatedMeals,
    };
    
    onUpdatePlan(updatedPlan);
    generateShoppingList(updatedPlan);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t('myWeeklyPlan')}</h2>
          <p className="text-gray-600 mt-1">Rencanakan menu makan untuk seminggu dengan efisien</p>
        </div>
        <button
          onClick={generateWeeklyPlan}
          disabled={isGenerating}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <Calendar size={18} />
          {isGenerating ? 'Sedang membuat...' : t('generatePlan')}
        </button>
      </div>

      {isGenerating && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Sedang membuat rencana menu mingguan yang optimal...</p>
        </div>
      )}

      {weeklyPlan && !isGenerating && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
            {weeklyPlan.meals.map((day, dayIndex) => (
              <div key={dayIndex} className="bg-white rounded-lg shadow-md border border-blue-100 p-4">
                <h3 className="font-semibold text-gray-900 mb-3 text-center">
                  {t(days[dayIndex])}
                </h3>
                <div className="space-y-3">
                  {meals.map((mealType) => (
                    <div key={mealType} className="border border-gray-200 rounded-lg p-2">
                      <div className="text-xs font-medium text-gray-600 mb-1">
                        {t(mealType)}
                      </div>
                      {day[mealType as keyof DailyMeals] ? (
                        <div className="text-sm">
                          <div className="font-medium text-gray-900 mb-1">
                            {(day[mealType as keyof DailyMeals] as Recipe)?.name}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Clock size={12} />
                            <span>
                              {((day[mealType as keyof DailyMeals] as Recipe)?.prepTime || 0) + 
                               ((day[mealType as keyof DailyMeals] as Recipe)?.cookTime || 0)} menit
                            </span>
                            <Users size={12} />
                            <span>{(day[mealType as keyof DailyMeals] as Recipe)?.servings} porsi</span>
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
                <h3 className="text-lg font-semibold text-gray-900">{t('shoppingList')}</h3>
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
                          {item.quantity} {t(item.unit)}
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
          <p className="text-gray-500">Buat rencana menu mingguan pertama Anda untuk memulai!</p>
        </div>
      )}
    </div>
  );
};