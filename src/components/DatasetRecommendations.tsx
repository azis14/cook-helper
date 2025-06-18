import React, { useState, useEffect } from 'react';
import { Database, Star, Clock, Users, ChefHat, TrendingUp, Filter, Search, ExternalLink, Heart } from 'lucide-react';
import SupabaseDatasetService, { RecipeRecommendation } from '../services/supabaseDatasetService';
import { Ingredient } from '../types';
import { RecipeDetailModal } from './RecipeDetailModal';

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
  const [datasetService] = useState(() => new SupabaseDatasetService());
  const [recommendations, setRecommendations] = useState<RecipeRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeRecommendation | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [stats, setStats] = useState({ total: 0, avgLoves: 0, topCategories: [] });
  const [filters, setFilters] = useState({
    minLoves: 50,
    searchQuery: '',
  });

  const difficultyTranslations = {
    easy: 'Mudah',
    medium: 'Sedang',
    hard: 'Sulit',
  };

  const difficultyColors = {
    easy: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    hard: 'bg-red-100 text-red-800',
  };

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    if (ingredients.length > 0) {
      generateRecommendations();
    }
  }, [ingredients, filters.minLoves]);

  const loadStats = async () => {
    try {
      const statsData = await datasetService.getRecipeStats();
      setStats(statsData);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const generateRecommendations = async () => {
    if (ingredients.length === 0) return;

    setIsLoading(true);
    try {
      const recs = await datasetService.getRecommendations(
        ingredients,
        filters.minLoves,
        12
      );
      setRecommendations(recs);
      if (recs.length > 0) {
        showSuccess(`Ditemukan ${recs.length} rekomendasi resep dari dataset!`);
      }
    } catch (error) {
      showError('Gagal mengambil rekomendasi dari dataset');
      console.error('Recommendation error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!filters.searchQuery.trim()) {
      generateRecommendations();
      return;
    }

    setIsLoading(true);
    try {
      const searchResults = await datasetService.searchRecipes(filters.searchQuery, 12);
      const convertedResults = searchResults.map(recipe => 
        datasetService['calculateRecommendation'](recipe, ingredients.map(ing => ing.name.toLowerCase()))
      );
      setRecommendations(convertedResults);
      showSuccess(`Ditemukan ${convertedResults.length} hasil pencarian!`);
    } catch (error) {
      showError('Gagal mencari resep');
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCardClick = (recipe: RecipeRecommendation) => {
    setSelectedRecipe(recipe);
    setShowDetailModal(true);
  };

  const formatLoves = (count: number): string => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Database className="text-blue-600" size={28} />
            Dataset Resep
          </h2>
          <p className="text-gray-600 mt-1">
            Rekomendasi dari {stats.total.toLocaleString()} resep populer komunitas
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Total Resep</p>
              <p className="text-2xl font-bold">{stats.total.toLocaleString()}</p>
            </div>
            <Database size={32} className="text-blue-200" />
          </div>
        </div>
        <div className="bg-gradient-to-r from-pink-500 to-pink-600 text-white p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-pink-100 text-sm">Rata-rata Likes</p>
              <p className="text-2xl font-bold">{stats.avgLoves.toLocaleString()}</p>
            </div>
            <Heart size={32} className="text-pink-200" />
          </div>
        </div>
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Rekomendasi</p>
              <p className="text-2xl font-bold">{recommendations.length}</p>
            </div>
            <TrendingUp size={32} className="text-green-200" />
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={20} className="text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Pencarian & Filter</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cari Resep
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={filters.searchQuery}
                onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                placeholder="Cari nama resep atau bahan..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Search size={18} />
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Minimum Likes
            </label>
            <select
              value={filters.minLoves}
              onChange={(e) => setFilters(prev => ({ ...prev, minLoves: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={10}>10+ ❤️</option>
              <option value={50}>50+ ❤️</option>
              <option value={100}>100+ ❤️</option>
              <option value={500}>500+ ❤️</option>
              <option value={1000}>1000+ ❤️</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Menganalisis dataset dan membuat rekomendasi...</p>
        </div>
      )}

      {/* No Ingredients Warning */}
      {ingredients.length === 0 && !isLoading && (
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
              className="bg-white rounded-lg shadow-md border border-blue-100 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleCardClick(recipe)}
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 text-lg line-clamp-2">
                    {recipe.name}
                  </h3>
                  <div className="flex items-center gap-1 ml-2">
                    <TrendingUp className="text-blue-500" size={16} />
                    <span className="text-sm font-medium text-blue-600">
                      {Math.round(recipe.match_score * 100)}%
                    </span>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{recipe.description}</p>
                
                {/* Popularity */}
                <div className="flex items-center gap-2 mb-3">
                  <Heart className="text-pink-500" size={16} />
                  <span className="text-sm font-medium text-gray-900">
                    {formatLoves(recipe.loves_count)} likes
                  </span>
                  {recipe.source_url && (
                    <ExternalLink className="text-gray-400" size={14} />
                  )}
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
                  <span className={`px-2 py-1 rounded-full text-xs ${difficultyColors[recipe.difficulty]}`}>
                    {difficultyTranslations[recipe.difficulty]}
                  </span>
                </div>
                
                {/* Match Reasons */}
                <div className="mb-3">
                  <h4 className="font-medium text-gray-900 mb-2 text-sm">Mengapa direkomendasikan:</h4>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {recipe.match_reasons.slice(0, 2).map((reason, index) => (
                      <li key={index} className="flex items-start gap-1">
                        <span className="text-green-500 mt-0.5">•</span>
                        <span className="line-clamp-1">{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Ingredients Preview */}
                <div className="mb-3">
                  <h4 className="font-medium text-gray-900 mb-2 text-sm">Bahan-bahan:</h4>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {(recipe.recipe_ingredients || []).slice(0, 3).map((ingredient, index) => (
                      <li key={index} className="line-clamp-1">• {ingredient.name}</li>
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
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Click hint */}
                <div className="mt-3 text-xs text-gray-400 text-center">
                  Klik untuk melihat detail lengkap
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No Recommendations */}
      {recommendations.length === 0 && !isLoading && ingredients.length > 0 && (
        <div className="text-center py-12">
          <ChefHat size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">
            Tidak ada rekomendasi yang cocok dengan filter saat ini. Coba ubah filter atau tambah bahan lain.
          </p>
        </div>
      )}

      {/* Recipe Detail Modal */}
      {selectedRecipe && (
        <RecipeDetailModal
          recipe={selectedRecipe}
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedRecipe(null);
          }}
        />
      )}
    </div>
  );
};