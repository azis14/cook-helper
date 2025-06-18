import React, { useState, useEffect } from 'react';
import { Upload, Star, Clock, Users, ChefHat, TrendingUp, Filter } from 'lucide-react';
import DatasetService, { RecipeRecommendation } from '../services/datasetService';
import { Ingredient } from '../types';

interface DatasetRecommendationsProps {
  ingredients: Ingredient[];
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
}

export const DatasetRecommendations: React.FC<DatasetRecommendationsProps> = ({
  ingredients,
  showSuccess,
  showError,
}) => {
  const [datasetService] = useState(() => new DatasetService());
  const [recommendations, setRecommendations] = useState<RecipeRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDatasetLoaded, setIsDatasetLoaded] = useState(false);
  const [filters, setFilters] = useState({
    minRating: 4.0,
    maxCookTime: 60,
    difficulty: '' as '' | 'easy' | 'medium' | 'hard',
    cuisine: '',
  });

  const difficultyTranslations = {
    easy: 'Mudah',
    medium: 'Sedang',
    hard: 'Sulit',
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      showError('Harap upload file CSV');
      return;
    }

    setIsLoading(true);
    try {
      const text = await file.text();
      await datasetService.loadDataset(text);
      setIsDatasetLoaded(true);
      showSuccess('Dataset berhasil dimuat!');
      generateRecommendations();
    } catch (error) {
      showError('Gagal memuat dataset. Pastikan format CSV benar.');
      console.error('Dataset loading error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateRecommendations = () => {
    if (!isDatasetLoaded || ingredients.length === 0) return;

    setIsLoading(true);
    try {
      const recs = datasetService.getRecommendations(
        ingredients,
        filters.minRating,
        filters.maxCookTime || undefined,
        filters.difficulty || undefined,
        filters.cuisine || undefined
      );
      setRecommendations(recs);
      showSuccess(`Ditemukan ${recs.length} rekomendasi resep!`);
    } catch (error) {
      showError('Gagal membuat rekomendasi');
      console.error('Recommendation error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isDatasetLoaded && ingredients.length > 0) {
      generateRecommendations();
    }
  }, [filters, isDatasetLoaded, ingredients]);

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={16}
        className={i < Math.floor(rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}
      />
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Rekomendasi Dataset</h2>
          <p className="text-gray-600 mt-1">Resep terpilih berdasarkan data rating dan popularitas</p>
        </div>
      </div>

      {/* Dataset Upload */}
      {!isDatasetLoaded && (
        <div className="bg-white p-8 rounded-lg shadow-md border border-blue-100 text-center">
          <Upload size={48} className="mx-auto text-blue-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Dataset Resep</h3>
          <p className="text-gray-600 mb-4">
            Upload file CSV dengan kolom: name, ingredients, instructions, rating, cook_time, dll.
          </p>
          <label className="inline-block bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors cursor-pointer">
            Pilih File CSV
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isLoading}
            />
          </label>
          {isLoading && (
            <div className="mt-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-gray-600 mt-2">Memuat dataset...</p>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      {isDatasetLoaded && (
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={20} className="text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Filter Rekomendasi</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rating Minimum
              </label>
              <select
                value={filters.minRating}
                onChange={(e) => setFilters(prev => ({ ...prev, minRating: parseFloat(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={3.0}>3.0+ ⭐</option>
                <option value={3.5}>3.5+ ⭐</option>
                <option value={4.0}>4.0+ ⭐</option>
                <option value={4.5}>4.5+ ⭐</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Waktu Memasak Max (menit)
              </label>
              <select
                value={filters.maxCookTime}
                onChange={(e) => setFilters(prev => ({ ...prev, maxCookTime: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={30}>30 menit</option>
                <option value={45}>45 menit</option>
                <option value={60}>1 jam</option>
                <option value={90}>1.5 jam</option>
                <option value={120}>2 jam</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tingkat Kesulitan
              </label>
              <select
                value={filters.difficulty}
                onChange={(e) => setFilters(prev => ({ ...prev, difficulty: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Semua</option>
                <option value="easy">Mudah</option>
                <option value="medium">Sedang</option>
                <option value="hard">Sulit</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Jenis Masakan
              </label>
              <input
                type="text"
                value={filters.cuisine}
                onChange={(e) => setFilters(prev => ({ ...prev, cuisine: e.target.value }))}
                placeholder="cth: Italian, Asian"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && isDatasetLoaded && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Menganalisis dataset dan membuat rekomendasi...</p>
        </div>
      )}

      {/* No Ingredients Warning */}
      {isDatasetLoaded && ingredients.length === 0 && (
        <div className="text-center py-12">
          <ChefHat size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">Tambahkan bahan-bahan untuk mendapatkan rekomendasi dari dataset!</p>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && !isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recommendations.map((recipe) => (
            <div
              key={recipe.id}
              className="bg-white rounded-lg shadow-md border border-blue-100 overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 text-lg">{recipe.name}</h3>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="text-blue-500" size={16} />
                    <span className="text-sm font-medium text-blue-600">
                      {Math.round(recipe.match_score * 100)}%
                    </span>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mb-3">{recipe.description}</p>
                
                {/* Rating */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center">
                    {renderStars(recipe.rating)}
                  </div>
                  <span className="text-sm font-medium text-gray-900">{recipe.rating}</span>
                  <span className="text-sm text-gray-500">({recipe.rating_count} ulasan)</span>
                </div>
                
                {/* Recipe Info */}
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

                {/* Nutrition Info */}
                {recipe.nutrition && (
                  <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2 text-sm">Informasi Gizi (per porsi):</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                      <div>Kalori: {Math.round(recipe.nutrition.calories / recipe.servings)}</div>
                      <div>Protein: {Math.round(recipe.nutrition.protein / recipe.servings)}g</div>
                      <div>Karbo: {Math.round(recipe.nutrition.carbs / recipe.servings)}g</div>
                      <div>Lemak: {Math.round(recipe.nutrition.fat / recipe.servings)}g</div>
                    </div>
                  </div>
                )}
                
                {/* Match Reasons */}
                <div className="mb-3">
                  <h4 className="font-medium text-gray-900 mb-2 text-sm">Mengapa direkomendasikan:</h4>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {recipe.match_reasons.slice(0, 3).map((reason, index) => (
                      <li key={index} className="flex items-start gap-1">
                        <span className="text-green-500 mt-0.5">•</span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Ingredients Preview */}
                <div className="mb-3">
                  <h4 className="font-medium text-gray-900 mb-2 text-sm">Bahan-bahan:</h4>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {(recipe.recipe_ingredients || []).slice(0, 3).map((ingredient, index) => (
                      <li key={index}>• {ingredient.name}</li>
                    ))}
                    {(recipe.recipe_ingredients || []).length > 3 && (
                      <li className="text-gray-500">+ {(recipe.recipe_ingredients || []).length - 3} bahan lainnya</li>
                    )}
                  </ul>
                </div>

                {/* Tags */}
                {recipe.tags && recipe.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {recipe.tags.slice(0, 3).map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No Recommendations */}
      {isDatasetLoaded && recommendations.length === 0 && !isLoading && ingredients.length > 0 && (
        <div className="text-center py-12">
          <ChefHat size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">
            Tidak ada rekomendasi yang cocok dengan filter saat ini. Coba ubah filter atau tambah bahan lain.
          </p>
        </div>
      )}
    </div>
  );
};