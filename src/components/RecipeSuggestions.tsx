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
  const { t, language } = useLanguage();
  const [suggestions, setSuggestions] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Mock AI suggestions based on available ingredients
  const generateSuggestions = () => {
    setIsLoading(true);
    
    // Simulate API call delay
    setTimeout(() => {
      const availableIngredientNames = ingredients.map(ing => 
        language === 'en' ? ing.name.toLowerCase() : ing.nameId.toLowerCase()
      );
      
      // Filter recipes that can be made with available ingredients
      const matchingRecipes = recipes.filter(recipe => {
        const recipeIngredients = recipe.ingredients.map(ing => 
          language === 'en' ? ing.name.toLowerCase() : ing.nameId.toLowerCase()
        );
        
        return recipeIngredients.some(ingredient => 
          availableIngredientNames.some(available => 
            available.includes(ingredient) || ingredient.includes(available)
          )
        );
      });

      // Mock AI-generated suggestions if we have ingredients but no matching recipes
      const mockSuggestions: Recipe[] = [];
      
      if (availableIngredientNames.includes('chicken') || availableIngredientNames.includes('ayam')) {
        mockSuggestions.push({
          id: 'mock-1',
          name: 'Chicken Stir Fry',
          nameId: 'Tumis Ayam',
          description: 'Quick and healthy chicken stir fry with vegetables',
          descriptionId: 'Tumis ayam cepat dan sehat dengan sayuran',
          ingredients: [
            { ingredientId: '1', name: 'Chicken', nameId: 'Ayam', quantity: 300, unit: 'gram' },
            { ingredientId: '2', name: 'Mixed Vegetables', nameId: 'Sayuran Campur', quantity: 200, unit: 'gram' },
          ],
          instructions: [
            'Cut chicken into small pieces',
            'Heat oil in a wok or large pan',
            'Stir fry chicken until cooked',
            'Add vegetables and stir fry for 3-4 minutes',
            'Season with salt, pepper, and soy sauce'
          ],
          instructionsId: [
            'Potong ayam menjadi potongan kecil',
            'Panaskan minyak di wajan atau panci besar',
            'Tumis ayam sampai matang',
            'Tambahkan sayuran dan tumis selama 3-4 menit',
            'Bumbui dengan garam, merica, dan kecap asin'
          ],
          prepTime: 10,
          cookTime: 15,
          servings: 4,
          difficulty: 'easy',
          tags: ['quick', 'healthy'],
        });
      }

      if (availableIngredientNames.includes('rice') || availableIngredientNames.includes('nasi')) {
        mockSuggestions.push({
          id: 'mock-2',
          name: 'Fried Rice',
          nameId: 'Nasi Goreng',
          description: 'Classic Indonesian fried rice with eggs and vegetables',
          descriptionId: 'Nasi goreng Indonesia klasik dengan telur dan sayuran',
          ingredients: [
            { ingredientId: '1', name: 'Cooked Rice', nameId: 'Nasi Matang', quantity: 2, unit: 'piece' },
            { ingredientId: '2', name: 'Eggs', nameId: 'Telur', quantity: 2, unit: 'piece' },
          ],
          instructions: [
            'Heat oil in a wok',
            'Scramble the eggs and set aside',
            'Stir fry rice with seasonings',
            'Add eggs back and mix well',
            'Serve hot with crackers'
          ],
          instructionsId: [
            'Panaskan minyak di wajan',
            'Orak-arik telur dan sisihkan',
            'Tumis nasi dengan bumbu',
            'Masukkan kembali telur dan aduk rata',
            'Sajikan panas dengan kerupuk'
          ],
          prepTime: 5,
          cookTime: 10,
          servings: 2,
          difficulty: 'easy',
          tags: ['quick', 'indonesian'],
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
          <p className="text-gray-500">Add some ingredients first to get recipe suggestions!</p>
        </div>
      )}

      {isLoading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Generating recipe suggestions...</p>
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
                    {language === 'en' ? recipe.name : recipe.nameId}
                  </h3>
                  <Lightbulb className="text-yellow-500" size={20} />
                </div>
                
                <p className="text-sm text-gray-600 mb-3">
                  {language === 'en' ? recipe.description : recipe.descriptionId}
                </p>
                
                <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                  <div className="flex items-center gap-1">
                    <Clock size={14} />
                    <span>{recipe.prepTime + recipe.cookTime}m</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users size={14} />
                    <span>{recipe.servings}</span>
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
                  <h4 className="font-medium text-gray-900 mb-2">{t('ingredients')}:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {recipe.ingredients.slice(0, 3).map((ingredient, index) => (
                      <li key={index}>
                        • {ingredient.quantity} {t(ingredient.unit)} {
                          language === 'en' ? ingredient.name : ingredient.nameId
                        }
                      </li>
                    ))}
                    {recipe.ingredients.length > 3 && (
                      <li className="text-gray-500">+ {recipe.ingredients.length - 3} more</li>
                    )}
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">{t('instructions')}:</h4>
                  <ol className="text-sm text-gray-600 space-y-1">
                    {(language === 'en' ? recipe.instructions : recipe.instructionsId)
                      .slice(0, 2).map((instruction, index) => (
                      <li key={index}>
                        {index + 1}. {instruction}
                      </li>
                    ))}
                    {recipe.instructions.length > 2 && (
                      <li className="text-gray-500">+ {recipe.instructions.length - 2} more steps</li>
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
          <p className="text-gray-500">No recipe suggestions found. Try generating suggestions!</p>
        </div>
      )}
    </div>
  );
};