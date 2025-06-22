import React, { useState, useEffect } from 'react';
import { Brain, Zap, TrendingUp, Search, Filter, Star, Clock, Users, ChefHat, Target, Sparkles, Save, Check } from 'lucide-react';
import RAGRecipeService, { RAGRecipeRecommendation } from '../services/ragRecipeService';
import { Ingredient } from '../types';
import { RecipeDetailModal } from './RecipeDetailModal';
import { useRecipes } from '../hooks/useRecipes';
import { useAuth } from '../hooks/useAuth';

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
  const { user } = useAuth();
  const { addRecipe } = useRecipes(user?.id);
  const [ragService] = useState(() => new RAGRecipeService());
  const [recommendations, setRecommendations] = useState<RAGRecipeRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<RAGRecipeRecommendation | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [savingRecipeId, setSavingRecipeId] = useState<string | null>(null);
  const [savedRecipeIds, setSavedRecipeIds] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({
    minSimilarity: 0.3,
    maxResults: 10, // Reduced from 20 to 10 for better performance
    minLoves: 10,
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

  // Load saved recipe IDs from localStorage on component mount
  useEffect(() => {
    const savedRecipeIdsStorage = localStorage.getItem('saved-rag-recipe-ids');
    
    if (savedRecipeIdsStorage) {
      try {
        setSavedRecipeIds(new Set(JSON.parse(savedRecipeIdsStorage)));
      } catch (err) {
        console.error('Error parsing saved RAG recipe IDs:', err);
      }
    }
  }, []);

  // Save savedRecipeIds to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('saved-rag-recipe-ids', JSON.stringify(Array.from(savedRecipeIds)));
  }, [savedRecipeIds]);

  // Initialize service silently in the background
  useEffect(() => {
    ragService.initialize().catch(error => {
      console.error('RAG initialization error:', error);
    });
  }, []);

  const generateRAGRecommendations = async () => {
    if (ingredients.length === 0) {
      showError('Tambahkan bahan-bahan terlebih dahulu untuk mendapatkan rekomendasi');
      return;
    }

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
      showError('Masukkan kata kunci pencarian');
      return;
    }

    setIsLoading(true);
    try {
      const searchResults = await ragService.semanticSearch(searchQuery, {
        maxResults: filters.maxResults,
        minSimilarity: filters.minSimilarity,
      });
      
      setRecommendations(searchResults);
      if (searchResults.length > 0) {
        showSuccess(`Ditemukan ${searchResults.length} hasil pencarian semantik!`);
      } else {
        showError('Tidak ada resep yang cocok dengan kata kunci pencarian');
      }
    } catch (error) {
      showError('Gagal melakukan pencarian semantik');
      console.error('Semantic search error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchWithFilters = () => {
    if (searchQuery.trim()) {
      handleSemanticSearch();
    } else if (ingredients.length > 0) {
      generateRAGRecommendations();
    } else {
      showError('Masukkan kata kunci pencarian atau tambahkan bahan-bahan');
    }
  };

  const saveRecipeToCollection = async (recipe: RAGRecipeRecommendation) => {
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
      showSuccess('Resep RAG berhasil disimpan ke koleksi Anda!');
    } catch (err) {
      console.error('Error saving RAG recipe:', err);
      showError('Gagal menyimpan resep. Silakan coba lagi.');
    } finally {
      setSavingRecipeId(null);
    }
  };

  const isRecipeSaved = (recipe: RAGRecipeRecommendation) => {
    return savedRecipeIds.has(recipe.id);
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

  const isAIProcessed = (recipe: RAGRecipeRecommendation) => {
    return recipe.user_id === 'dataset-rag-ai';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Brain className="text-purple-600" size={28} />
            Asisten AI
          </h2>
          <p className="text-gray-600 mt-1">
            Rekomendasi resep menggunakan AI semantik dan embedding dengan pemrosesan AI
          </p>
        </div>
      </div>

      {/* RAG Status & Info */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border border-purple-200">
        <div className="flex items-center gap-3 mb-2">
          <Brain className="text-purple-600" size={20} />
          <h3 className="font-semibold text-gray-900">Sistem RAG dengan AI Processing</h3>
        </div>
        <p className="text-sm text-gray-700 mb-2">
          Menggunakan semantic embeddings untuk menemukan resep yang paling relevan dengan bahan Anda. 
          Hasil pencarian diproses dengan AI untuk memastikan format dan kualitas yang optimal.
        </p>
        <p className="text-xs text-gray-600">
          💡 Embeddings diperbarui secara otomatis di background menggunakan cron job untuk performa optimal.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <Search size={20} className="text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Pencarian Semantik</h3>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cari berdasarkan makna atau deskripsi
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari berdasarkan makna: 'makanan sehat', 'masakan cepat', dll..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                onKeyPress={(e) => e.key === 'Enter' && handleSearchWithFilters()}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Contoh: "makanan pedas indonesia", "resep sehat rendah kalori", "masakan cepat saji"
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minimum Kemiripan
              </label>
              <select
                value={filters.minSimilarity}
                onChange={(e) => setFilters(prev => ({ ...prev, minSimilarity: parseFloat(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value={0.2}>20% (Sangat Longgar)</option>
                <option value={0.3}>30% (Longgar)</option>
                <option value={0.4}>40% (Normal)</option>
                <option value={0.5}>50% (Ketat)</option>
                <option value={0.6}>60% (Sangat Ketat)</option>
              </select>
            </div>
            
            <button
              onClick={handleSearchWithFilters}
              disabled={isLoading}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Mencari...' : 'Terapkan Filter & Cari'}
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-600">AI sedang menganalisis dan memproses resep yang paling relevan...</p>
          <p className="text-sm text-gray-500 mt-2">Mencari hingga {filters.maxResults} resep terbaik...</p>
        </div>
      )}

      {/* No Search State */}
      {recommendations.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <Brain size={48} className="mx-auto text-gray-400 mb-4" />
          <div className="space-y-2">
            <p className="text-gray-500 font-medium">Siap untuk mencari resep dengan AI semantik!</p>
            <p className="text-gray-400 text-sm">
              Masukkan kata kunci pencarian atau gunakan bahan-bahan yang Anda miliki
            </p>
          </div>
          <div className="mt-6 space-y-2">
            <p className="text-sm text-gray-600 font-medium">Cara menggunakan:</p>
            <div className="text-xs text-gray-500 space-y-1">
              <p>• Ketik kata kunci seperti "makanan sehat" atau "masakan cepat"</p>
              <p>• Atau biarkan kosong dan gunakan bahan-bahan dari tab Bahan</p>
              <p>• Klik "Terapkan Filter & Cari" atau tekan Enter</p>
            </div>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && !isLoading && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Ditemukan {recommendations.length} resep yang relevan
            </h3>
            <div className="text-sm text-gray-500">
              Menampilkan hingga {filters.maxResults} resep terbaik
            </div>
          </div>
          
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
                      {isAIProcessed(recipe) && (
                        <Sparkles className="text-purple-500 ml-1" size={14} />
                      )}
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{recipe.description}</p>
                  
                  {/* AI Processing Badge */}
                  {isAIProcessed(recipe) && (
                    <div className="mb-3">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                        <Sparkles size={12} />
                        Diproses AI
                      </span>
                    </div>
                  )}
                  
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

                  {/* Save Recipe Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      saveRecipeToCollection(recipe);
                    }}
                    disabled={savingRecipeId === recipe.id || isRecipeSaved(recipe)}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors mb-2 ${
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

                  {/* Click hint */}
                  <div className="text-xs text-gray-400 text-center">
                    Klik kartu untuk melihat detail lengkap
                  </div>
                </div>
              </div>
            ))}
          </div>
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