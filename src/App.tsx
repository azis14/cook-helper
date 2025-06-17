import React, { useState } from 'react';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { IngredientManager } from './components/IngredientManager';
import { RecipeManager } from './components/RecipeManager';
import { RecipeSuggestions } from './components/RecipeSuggestions';
import { WeeklyPlanner } from './components/WeeklyPlanner';
import { LanguageProvider } from './contexts/LanguageContext';
import { useLocalStorage } from './hooks/useLocalStorage';
import { Ingredient, Recipe, WeeklyPlan } from './types';

function App() {
  const [activeTab, setActiveTab] = useState('ingredients');
  const [ingredients, setIngredients] = useLocalStorage<Ingredient[]>('ingredients', []);
  const [recipes, setRecipes] = useLocalStorage<Recipe[]>('recipes', []);
  const [weeklyPlan, setWeeklyPlan] = useLocalStorage<WeeklyPlan | null>('weeklyPlan', null);

  const addIngredient = (ingredient: Omit<Ingredient, 'id'>) => {
    const newIngredient = {
      ...ingredient,
      id: 'ingredient-' + Date.now() + Math.random(),
    };
    setIngredients([...ingredients, newIngredient]);
  };

  const updateIngredient = (id: string, updates: Partial<Ingredient>) => {
    setIngredients(ingredients.map(ing => 
      ing.id === id ? { ...ing, ...updates } : ing
    ));
  };

  const deleteIngredient = (id: string) => {
    setIngredients(ingredients.filter(ing => ing.id !== id));
  };

  const addRecipe = (recipe: Omit<Recipe, 'id'>) => {
    const newRecipe = {
      ...recipe,
      id: 'recipe-' + Date.now() + Math.random(),
    };
    setRecipes([...recipes, newRecipe]);
  };

  const updateRecipe = (id: string, updates: Partial<Recipe>) => {
    setRecipes(recipes.map(recipe => 
      recipe.id === id ? { ...recipe, ...updates } : recipe
    ));
  };

  const deleteRecipe = (id: string) => {
    setRecipes(recipes.filter(recipe => recipe.id !== id));
  };

  const updateWeeklyPlan = (plan: WeeklyPlan) => {
    setWeeklyPlan(plan);
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'ingredients':
        return (
          <IngredientManager
            ingredients={ingredients}
            onAdd={addIngredient}
            onUpdate={updateIngredient}
            onDelete={deleteIngredient}
          />
        );
      case 'recipes':
        return (
          <RecipeManager
            recipes={recipes}
            onAdd={addRecipe}
            onUpdate={updateRecipe}
            onDelete={deleteRecipe}
          />
        );
      case 'suggestions':
        return (
          <RecipeSuggestions
            ingredients={ingredients}
            recipes={recipes}
          />
        );
      case 'weekly-plan':
        return (
          <WeeklyPlanner
            recipes={recipes}
            ingredients={ingredients}
            weeklyPlan={weeklyPlan}
            onUpdatePlan={updateWeeklyPlan}
          />
        );
      default:
        return null;
    }
  };

  return (
    <LanguageProvider>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
        <Header />
        <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {renderActiveTab()}
        </main>
      </div>
    </LanguageProvider>
  );
}

export default App;