import React, { useState, useEffect } from 'react';
import { Brain, Zap, TrendingUp, Search, Filter, Star, Clock, Users, ChefHat, Target } from 'lucide-react';
import RAGRecipeService, { RAGRecipeRecommendation } from '../services/ragRecipeService';
import { Ingredient } from '../types';
import { RecipeDetailModal } from './RecipeDetailModal';

interface RAGRecommendationsProps {
  ingredients: Ingredient[];
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
}

export const RAGRecommendations: React.FC<RAGRecommendationsProps> = ({
  ingredients,
  showSuccess,
  showError,
}) => {
  const [ragService] = useState(() => new RAGRecipeService());
  const [recommendations, setRecommendations] = useState<RAGRecipeRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<RAGRecipeRecommendation | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    minSimilarity: 0.3,
    maxResults: 12,
    minLoves: 50,
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
    initializeService();
  }, []);

  useEffect(() => {
    if (ingredients.length > 0) {
      generateRAGRecommendations();
    }
  }, [ingredients, filters]);

  const initializeService = async () => {
    setIsInitializing(true);
    try {
      await ragService.initialize();
      showSuccess('Sistem RAG berhasil diinisialisasi!');
    } catch (error) {
      showError('Gagal menginisialisasi sistem RAG');
      console.error('RAG initialization error:', error);
    } finally {
      setIsInitializing(false);
    }
  };

  const generateRAGRecommendations = async () => {
    if (ingredients.length === 0) return;

    setIsLoading(true);
    try {
      const recs = await ragService.getRecommendations(ingredients, {
        minLoves: filters.minLoves,
        maxResults: filters.maxResults,
        minSimilarity: filters.minSimilarity,
      });
      
      setRecommendations(recs);
      if (recs.length > 0) {
        showSuccess(`Ditemukan ${recs.length} rekomendasi menggunakan AI semantik!`);
      } else {
        showError('Tidak ada resep yang cocok dengan kriteria pencarian');
      }
    } catch (error) {
      showError('Gagal mengambil rekomendasi RAG');
      console.error('RAG recommendation error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSemanticSearch = async () => {
    if (!searchQuery.trim()) {
      generateRAGRecommendations();
      return;
    }

    setIsLoading(true);
    try {
      const searchResults = await ragService.semanticSearch(searchQuery, {
        maxResults: filters.maxResults,
        minSimilarity: filters.minSimilarity,
      });
      
      setRecommendations(searchResults);
      showSuccess(`Ditemukan ${searchResults.length} hasil pencarian semantik!`);
    } catch (error) {
      showError('Gagal melakukan pencarian semantik');
      console.error('Semantic search error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCardClick = (recipe: RAGRecipeRecommendation) => {
    setSelectedRecipe(recipe);
    setShowDetailModal(true);
  };

  const getSimilarityColor = (score: number): string => {
    if (score >= 0.7) return 'text-green-600 bg-green-100';
    if (score >= 0.5) return 'text-blue-600 bg-blue-100';
    if (score >= 0.3) return 'text-yellow-600 bg-yellow-100';
    return 'text-gray-600 bg-gray-100';
  };

  const getConfidenceIcon = (score: number) => {
    if (score >= 0.8) return <Target className="text-green-500" size={16} />;
    if (score >= 0.6) return <TrendingUp className="text-blue-500" size={16} />;
    return <Zap className="text-yellow-500" size={16} />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Brain className="text-purple-600" size={28} />
            RAG Recipe Intelligence
          </h2>
          <p className="text-gray-600 mt-1">
            Rekomendasi resep menggunakan AI semantik dan embedding
          </p>
        </div>
        {isInitializing && (
          <div className="flex items-center gap-2 text-purple-600">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
            <span className="text-sm">Menginisialisasi AI...</span>
          </div>
        )}
      </div>

      {/* RAG Status & Info */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border border-purple-200">
        <div className="flex items-center gap-3 mb-2">
          <Brain className="text-purple-600" size={20} />
          <h3 className="font-semibold text-gray-900">Sistem RAG Aktif</h3>
        </div>
        <p className="text-sm text-gray-700">
          Menggunakan semantic embeddings untuk menemukan resep yang paling relevan dengan bahan Anda. 
          Sistem ini memahami konteks dan makna, bukan hanya pencocokan kata kunci.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={20} className="text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Pencarian Semantik & Filter</h3>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pencarian Semantik
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari berdasarkan makna: 'makanan sehat', 'masakan cepat', dll..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                onKeyPress={(e) => e.key === 'Enter' && handleSemanticSearch()}
              />
              <button
                onClick={handleSemanticSearch}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
              >
                <Search size={18} />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Contoh: "makanan pedas indonesia", "resep sehat rendah kalori"
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min. Kemiripan
              </label>
              <select
                value={filters.minSimilarity}
                onChange={(e) => setFilters(prev => ({ ...prev, minSimilarity: parseFloat(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
              >
                <option value={0.2}>20% (Longgar)</option>
                <option value={0.3}>30% (Normal)</option>
                <option value={0.4}>40% (Ketat)</option>
                <option value={0.5}>50% (Sangat Ketat)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min. Likes
              </label>
              <select
                value={filters.minLoves}
                onChange={(e) => setFilters(prev => ({ ...prev, minLoves: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
              >
                <option value={10}>10+</option>
                <option value={50}>50+</option>
                <option value={100}>100+</option>
                <option value={500}>500+</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max. Hasil
              </label>
              <select
                value={filters.maxResults}
                onChange={(e) => setFilters(prev => ({ ...prev, maxResults: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
              >
                <option value={6}>6 resep</option>
                <option value={12}>12 resep</option>
                <option value={18}>18 resep</option>
                <option value={24}>24 resep</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-600">AI sedang menganalisis dan mencari resep yang paling relevan...</p>
        </div>
      )}

      {/* No Ingredients Warning */}
      {ingredients.length === 0 && !isLoading && !searchQuery && (
        <div className="text-center py-12">
          <Brain size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">Tambahkan bahan-bahan untuk mendapatkan rekomendasi RAG yang cerdas!</p>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && !isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recommendations.map((recipe) => (
            <div
              key={recipe.id}
              className="bg-white rounded-lg shadow-md border border-purple-100 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleCardClick(recipe)}
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 text-lg line-clamp-2">
                    {recipe.name}
                  </h3>
                  <div className="flex items-center gap-1 ml-2">
                    {getConfidenceIcon(recipe.confidence_score)}
                    <span className="text-xs font-medium text-gray-600">
                      {Math.round(recipe.confidence_score * 100)}%
                    </span>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{recipe.description}</p>
                
                {/* Similarity Score */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSimilarityColor(recipe.similarity_score)}`}>
                      {Math.round(recipe.similarity_score * 100)}% match
                    </span>
                    <span className="text-sm text-gray-500">
                      {recipe.loves_count.toLocaleString()} ❤️
                    </span>
                  </div>
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
                
                {/* Relevance Reasons */}
                <div className="mb-3">
                  <h4 className="font-medium text-gray-900 mb-2 text-sm">Mengapa direkomendasikan:</h4>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {recipe.relevance_reasons.slice(0, 2).map((reason, index) => (
                      <li key={index} className="flex items-start gap-1">
                        <span className="text-purple-500 mt-0.5">•</span>
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
                  <div className="flex flex-wrap gap-1 mb-3">
                    {recipe.tags.slice(0, 3).map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-purple-100 text-purple-600 text-xs rounded-full"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Click hint */}
                <div className="text-xs text-gray-400 text-center">
                  Klik untuk melihat detail lengkap
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No Recommendations */}
      {recommendations.length === 0 && !isLoading && (ingredients.length > 0 || searchQuery) && (
        <div className="text-center py-12">
          <ChefHat size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">
            Tidak ada resep yang cocok dengan kriteria pencarian. Coba ubah filter atau tambah bahan lain.
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