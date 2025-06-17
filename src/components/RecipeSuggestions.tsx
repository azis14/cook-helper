import React, { useState } from 'react';
import { Lightbulb, RefreshCw, Clock, Users, ChefHat } from 'lucide-react';
import { Recipe, Ingredient } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface RecipeSuggestionsProps {
  ingredients: Ingredient[];
  recipes: Recipe[];
}

export const RecipeSuggestions: React.FC<RecipeSuggestionsProps> = ({
  ingredients,
  recipes,
}) => {
  const { t } = useLanguage();
  const [suggestions, setSuggestions] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Mock AI suggestions based on available ingredients
  const generateSuggestions = () => {
    setIsLoading(true);
    
    // Simulate API call delay
    setTimeout(() => {
      const availableIngredientNames = ingredients.map(ing => 
        ing.name.toLowerCase()
      );
      
      // Filter recipes that can be made with available ingredients
      const matchingRecipes = recipes.filter(recipe => {
        const recipeIngredients = recipe.recipe_ingredients?.map(ing => 
          ing.name.toLowerCase()
        ) || [];
        
        return recipeIngredients.some(ingredient => 
          availableIngredientNames.some(available => 
            available.includes(ingredient) || ingredient.includes(available)
          )
        );
      });

      // Mock AI-generated suggestions if we have ingredients but no matching recipes
      const mockSuggestions: Recipe[] = [];
      
      if (availableIngredientNames.includes('ayam') || availableIngredientNames.includes('chicken')) {
        mockSuggestions.push({
          id: 'mock-1',
          name: 'Tumis Ayam Sayuran',
          description: 'Tumisan ayam sehat dengan sayuran segar yang mudah dibuat',
          recipe_ingredients: [
            { id: '1', recipe_id: 'mock-1', name: 'Ayam', quantity: 300, unit: 'gram' },
            { id: '2', recipe_id: 'mock-1', name: 'Sayuran Campur', quantity: 200, unit: 'gram' },
          ],
          instructions: [
            'Potong ayam menjadi potongan kecil',
            'Panaskan minyak di wajan atau panci besar',
            'Tumis ayam sampai matang',
            'Tambahkan sayuran dan tumis selama 3-4 menit',
            'Bumbui dengan garam, merica, dan kecap asin'
          ],
          prep_time: 10,
          cook_time: 15,
          servings: 4,
          difficulty: 'easy',
          tags: ['cepat', 'sehat'],
          user_id: 'mock-user',
        });
      }

      if (availableIngredientNames.includes('nasi') || availableIngredientNames.includes('beras')) {
        mockSuggestions.push({
          id: 'mock-2',
          name: 'Nasi Goreng Spesial',
          description: 'Nasi goreng Indonesia klasik dengan telur dan sayuran',
          recipe_ingredients: [
            { id: '1', recipe_id: 'mock-2', name: 'Nasi Matang', quantity: 2, unit: 'piring' },
            { id: '2', recipe_id: 'mock-2', name: 'Telur', quantity: 2, unit: 'butir' },
          ],
          instructions: [
            'Panaskan minyak di wajan',
            'Orak-arik telur dan sisihkan',
            'Tumis nasi dengan bumbu',
            'Masukkan kembali telur dan aduk rata',
            'Sajikan panas dengan kerupuk'
          ],
          prep_time: 5,
          cook_time: 10,
          servings: 2,
          difficulty: 'easy',
          tags: ['cepat', 'indonesia'],
          user_id: 'mock-user',
        });
      }

      setSuggestions([...matchingRecipes, ...mockSuggestions]);
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t('recipeSuggestions')}</h2>
          <p className="text-gray-600 mt-1">{t('basedOnIngredients')}</p>
        </div>
        <button
          onClick={generateSuggestions}
          disabled={isLoading || ingredients.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
          {t('generateSuggestions')}
        </button>
      </div>

      {ingredients.length === 0 && (
        <div className="text-center py-12">
          <Lightbulb size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">Tambahkan beberapa bahan terlebih dahulu untuk mendapatkan saran resep!</p>
        </div>
      )}

      {isLoading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Sedang membuat saran resep...</p>
        </div>
      )}

      {suggestions.length > 0 && !isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {suggestions.map((recipe) => (
            <div
              key={recipe.id}
              className="bg-white rounded-lg shadow-md border border-yellow-100 overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 text-lg">
                    {recipe.name}
                  </h3>
                  <Lightbulb className="text-yellow-500" size={20} />
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
                    {t(recipe.difficulty)}
                  </span>
                </div>
                
                <div className="mb-3">
                  <h4 className="font-medium text-gray-900 mb-2">Bahan-bahan:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {(recipe.recipe_ingredients || []).slice(0, 3).map((ingredient, index) => (
                      <li key={index}>
                        • {ingredient.quantity} {t(ingredient.unit)} {ingredient.name}
                      </li>
                    ))}
                    {(recipe.recipe_ingredients || []).length > 3 && (
                      <li className="text-gray-500">+ {(recipe.recipe_ingredients || []).length - 3} bahan lainnya</li>
                    )}
                  </ul>
                </div>
                
                <div>
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
              </div>
            </div>
          ))}
        </div>
      )}

      {suggestions.length === 0 && !isLoading && ingredients.length > 0 && (
        <div className="text-center py-12">
          <ChefHat size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">Tidak ada saran resep ditemukan. Coba buat saran resep!</p>
        </div>
      )}
    </div>
  );
};