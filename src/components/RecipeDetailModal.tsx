import React from 'react';
import { X, Clock, Users, ChefHat } from 'lucide-react';
import { Recipe } from '../types';

interface RecipeDetailModalProps {
  recipe: Recipe;
  isOpen: boolean;
  onClose: () => void;
}

export const RecipeDetailModal: React.FC<RecipeDetailModalProps> = ({
  recipe,
  isOpen,
  onClose,
}) => {
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{recipe.name}</h2>
            <p className="text-gray-600 mt-1">{recipe.description}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {/* Recipe Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <Clock className="mx-auto text-blue-600 mb-2" size={24} />
              <div className="text-sm text-gray-600">Persiapan</div>
              <div className="font-semibold text-gray-900">{recipe.prep_time} menit</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg text-center">
              <Clock className="mx-auto text-orange-600 mb-2" size={24} />
              <div className="text-sm text-gray-600">Memasak</div>
              <div className="font-semibold text-gray-900">{recipe.cook_time} menit</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <Users className="mx-auto text-green-600 mb-2" size={24} />
              <div className="text-sm text-gray-600">Porsi</div>
              <div className="font-semibold text-gray-900">{recipe.servings} orang</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg text-center">
              <ChefHat className="mx-auto text-purple-600 mb-2" size={24} />
              <div className="text-sm text-gray-600">Kesulitan</div>
              <div className="font-semibold text-gray-900">
                {difficultyTranslations[recipe.difficulty]}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Ingredients */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-2 h-6 bg-green-500 rounded"></div>
                Bahan-bahan
              </h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <ul className="space-y-3">
                  {(recipe.recipe_ingredients || []).map((ingredient, index) => (
                    <li key={index} className="flex items-center justify-between py-2 border-b border-gray-200 last:border-b-0">
                      <span className="font-medium text-gray-900">{ingredient.name}</span>
                      <span className="text-gray-600">
                        {ingredient.quantity} {unitTranslations[ingredient.unit] || ingredient.unit}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Instructions */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-2 h-6 bg-blue-500 rounded"></div>
                Cara Memasak
              </h3>
              <div className="space-y-4">
                {(recipe.instructions || []).map((instruction, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1 pt-1">
                      <p className="text-gray-700 leading-relaxed">{instruction}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tags */}
          {recipe.tags && recipe.tags.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Tag</h3>
              <div className="flex flex-wrap gap-2">
                {recipe.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Total Time Summary */}
          <div className="mt-8 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-gray-900">Total Waktu Memasak</h4>
                <p className="text-gray-600 text-sm">Dari persiapan hingga siap disajikan</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">
                  {recipe.prep_time + recipe.cook_time} menit
                </div>
                <div className="text-sm text-gray-600">
                  {Math.floor((recipe.prep_time + recipe.cook_time) / 60) > 0 && 
                    `${Math.floor((recipe.prep_time + recipe.cook_time) / 60)} jam `}
                  {(recipe.prep_time + recipe.cook_time) % 60} menit
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full bg-green-500 text-white py-3 px-4 rounded-lg hover:bg-green-600 transition-colors font-medium"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};