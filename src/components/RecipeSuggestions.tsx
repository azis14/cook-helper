import React, { useState, useEffect } from 'react';
import { Lightbulb, Clock, Users, ChefHat, Sparkles, Save, Check } from 'lucide-react';
import { Recipe, Ingredient } from '../types';
import GeminiService from '../services/geminiService';
import { useRecipes } from '../hooks/useRecipes';
import { useAuth } from '../hooks/useAuth';

interface RecipeSuggestionsProps {
  ingredients: Ingredient[];
  recipes: Recipe[];
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
}

export const RecipeSuggestions: React.FC<RecipeSuggestionsProps> = ({
  ingredients,
  recipes,
  showSuccess,
  showError,
}) => {
  const { user } = useAuth();
  const { addRecipe } = useRecipes(user?.id);
  const [suggestions, setSuggestions] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingRecipeId, setSavingRecipeId] = useState<string | null>(null);
  const [savedRecipeIds, setSavedRecipeIds] = useState<Set<string>>(new Set());

  const difficultyTranslations = {
    easy: 'Mudah',
    medium: 'Sedang',
    hard: 'Sulit',
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
    sendok: 'sendok',
    gelas: 'gelas',
  };

  // Helper function to check if a recipe is AI-generated
  const isAIGenerated = (recipe: Recipe) => {
    return recipe.user_id === 'ai-generated' || recipe.id.startsWith('mock-') || recipe.id.startsWith('gemini-');
  };

  // Load saved suggestions from localStorage on component mount
  useEffect(() => {
    const savedSuggestions = localStorage.getItem('recipe-suggestions');
    const savedRecipeIdsStorage = localStorage.getItem('saved-recipe-ids');
    
    if (savedSuggestions) {
      try {
        const allSavedSuggestions = JSON.parse(savedSuggestions);
        // Filter to only show AI-generated recipes
        const aiOnlySuggestions = allSavedSuggestions.filter((recipe: Recipe) => isAIGenerated(recipe));
        setSuggestions(aiOnlySuggestions);
      } catch (err) {
        console.error('Error parsing saved suggestions:', err);
      }
    }

    if (savedRecipeIdsStorage) {
      try {
        setSavedRecipeIds(new Set(JSON.parse(savedRecipeIdsStorage)));
      } catch (err) {
        console.error('Error parsing saved recipe IDs:', err);
      }
    }
  }, []);

  // Save suggestions to localStorage whenever they change
  useEffect(() => {
    if (suggestions.length > 0) {
      localStorage.setItem('recipe-suggestions', JSON.stringify(suggestions));
    }
  }, [suggestions]);

  // Save savedRecipeIds to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('saved-recipe-ids', JSON.stringify(Array.from(savedRecipeIds)));
  }, [savedRecipeIds]);

  const generateAISuggestions = async () => {
    if (!ingredients.length) return;

    setIsLoading(true);
    setError(null);

    try {
      const apiKey = import.meta.env.VITE_GOOGLE_AI_API_KEY;
      
      if (!apiKey) {
        throw new Error('Google AI API key tidak ditemukan. Pastikan VITE_GOOGLE_AI_API_KEY sudah diatur di file .env');
      }

      const geminiService = new GeminiService(apiKey);
      const aiSuggestions = await geminiService.generateRecipeSuggestions(ingredients);
      
      // Only show AI-generated suggestions, don't include existing recipes
      setSuggestions(aiSuggestions);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan saat membuat saran resep';
      setError(errorMessage);
      showError(errorMessage);
      console.error('Error generating AI suggestions:', err);
    } finally {
      setIsLoading(false);
    }
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
      
      // Mark recipe as saved
      setSavedRecipeIds(prev => new Set([...prev, recipe.id]));
      
      // Show success toast
      showSuccess('Resep berhasil disimpan ke koleksi Anda!');
    } catch (err) {
      console.error('Error saving recipe:', err);
      showError('Gagal menyimpan resep. Silakan coba lagi.');
    } finally {
      setSavingRecipeId(null);
    }
  };

  const isRecipeSaved = (recipe: Recipe) => {
    return savedRecipeIds.has(recipe.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Inspirasi Resep AI</h2>
          <p className="text-gray-600 mt-1">Resep pintar berdasarkan bahan yang tersedia</p>
        </div>
        <button
          onClick={generateAISuggestions}
          disabled={isLoading || ingredients.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <Sparkles size={18} className={isLoading ? 'animate-spin' : ''} />
          {isLoading ? 'Sedang membuat...' : 'Buat Saran AI'}
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {ingredients.length === 0 && (
        <div className="text-center py-12">
          <Lightbulb size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">Tambahkan beberapa bahan terlebih dahulu untuk mendapatkan saran resep AI!</p>
        </div>
      )}

      {isLoading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-600">AI sedang membuat saran resep khusus untuk Anda...</p>
        </div>
      )}

      {suggestions.length > 0 && !isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {suggestions.map((recipe) => (
            <div
              key={recipe.id}
              className="bg-white rounded-lg shadow-md border border-purple-100 overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 text-lg">
                    {recipe.name}
                  </h3>
                  <div className="flex items-center gap-1">
                    <Sparkles className="text-purple-500" size={20} />
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mb-3">
                  {recipe.description}
                </p>
                
                <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                  <div className="flex items-center gap-1">
                    <Clock size={14} />
                    <span>{recipe.prep_time + recipe.cook_time} menit</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users size={14} />
                    <span>{recipe.servings} porsi</span>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    recipe.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                    recipe.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {difficultyTranslations[recipe.difficulty]}
                  </span>
                </div>
                
                <div className="mb-3">
                  <h4 className="font-medium text-gray-900 mb-2">Bahan-bahan:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {(recipe.recipe_ingredients || []).slice(0, 3).map((ingredient, index) => (
                      <li key={index}>
                        • {ingredient.quantity} {unitTranslations[ingredient.unit] || ingredient.unit} {ingredient.name}
                      </li>
                    ))}
                    {(recipe.recipe_ingredients || []).length > 3 && (
                      <li className="text-gray-500">+ {(recipe.recipe_ingredients || []).length - 3} bahan lainnya</li>
                    )}
                  </ul>
                </div>
                
                <div className="mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">Cara memasak:</h4>
                  <ol className="text-sm text-gray-600 space-y-1">
                    {(recipe.instructions || []).slice(0, 2).map((instruction, index) => (
                      <li key={index}>
                        {index + 1}. {instruction}
                      </li>
                    ))}
                    {(recipe.instructions || []).length > 2 && (
                      <li className="text-gray-500">+ {(recipe.instructions || []).length - 2} langkah lainnya</li>
                    )}
                  </ol>
                </div>

                {recipe.tags && recipe.tags.length > 0 && (
                  <div className="mb-4 flex flex-wrap gap-1">
                    {recipe.tags.slice(0, 3).map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-purple-100 text-purple-600 text-xs rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Save Recipe Button - only show for AI generated recipes */}
                <button
                  onClick={() => saveRecipeToCollection(recipe)}
                  disabled={savingRecipeId === recipe.id || isRecipeSaved(recipe)}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    isRecipeSaved(recipe)
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                      : savingRecipeId === recipe.id
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : 'bg-green-500 text-white hover:bg-green-600'
                  }`}
                >
                  {isRecipeSaved(recipe) ? (
                    <>
                      <Check size={16} />
                      Sudah Disimpan
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      {savingRecipeId === recipe.id ? 'Menyimpan...' : 'Simpan Resep'}
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {suggestions.length === 0 && !isLoading && ingredients.length > 0 && !error && (
        <div className="text-center py-12">
          <ChefHat size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">Klik "Buat Saran AI" untuk mendapatkan resep pintar berdasarkan bahan Anda!</p>
        </div>
      )}
    </div>
  );
};