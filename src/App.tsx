import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { Footer } from './components/Footer';
import { IngredientManager } from './components/IngredientManager';
import { RecipeManager } from './components/RecipeManager';
import { RecipeSuggestions } from './components/RecipeSuggestions';
import { DatasetRecommendations } from './components/DatasetRecommendations';
import { RAGRecommendations } from './components/RAGRecommendations';
import { WeeklyPlanner } from './components/WeeklyPlanner';
import { AuthForm } from './components/AuthForm';
import { Toast } from './components/Toast';
import { useAuth } from './hooks/useAuth';
import { useIngredients } from './hooks/useIngredients';
import { useRecipes } from './hooks/useRecipes';
import { useToast } from './hooks/useToast';
import { signOut } from './lib/supabase';
import { isFeatureEnabledSync, preloadFeatureFlags } from './lib/featureFlags';
import { LogOut } from 'lucide-react';

function App() {
  const { user, loading } = useAuth();
  const { ingredients } = useIngredients(user?.id);
  const { recipes } = useRecipes(user?.id);
  const { toasts, showSuccess, showError, hideToast } = useToast();
  const [activeTab, setActiveTab] = useState('ingredients');
  const [featuresLoaded, setFeaturesLoaded] = useState(false);

  // Preload feature flags on app start
  useEffect(() => {
    preloadFeatureFlags().then(() => {
      setFeaturesLoaded(true);
    }).catch(error => {
      console.error('Failed to preload feature flags:', error);
      setFeaturesLoaded(true); // Continue with defaults
    });
  }, []);

  const handleSignOut = async () => {
    await signOut();
  };

  const renderActiveTab = () => {
    // Don't render tabs until features are loaded to prevent accessing disabled features
    if (!featuresLoaded) {
      return (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        </div>
      );
    }

    switch (activeTab) {
      case 'ingredients':
        return <IngredientManager />;
      case 'recipes':
        return <RecipeManager />;
      case 'suggestions':
        return isFeatureEnabledSync('suggestions') ? (
          <RecipeSuggestions 
            ingredients={ingredients} 
            recipes={recipes}
            showSuccess={showSuccess}
            showError={showError}
          />
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">Fitur Inspirasi AI tidak tersedia saat ini.</p>
          </div>
        );
      case 'dataset':
        return isFeatureEnabledSync('dataset') ? (
          <DatasetRecommendations
            ingredients={ingredients}
            showSuccess={showSuccess}
            showError={showError}
          />
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">Fitur Dataset tidak tersedia saat ini.</p>
          </div>
        );
      case 'rag':
        return isFeatureEnabledSync('rag') ? (
          <RAGRecommendations
            ingredients={ingredients}
            showSuccess={showSuccess}
            showError={showError}
          />
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">Fitur RAG AI tidak tersedia saat ini.</p>
          </div>
        );
      case 'weekly-plan':
        return isFeatureEnabledSync('weeklyPlanner') ? (
          <WeeklyPlanner ingredients={ingredients} recipes={recipes} />
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">Fitur Rencana Mingguan tidak tersedia saat ini.</p>
          </div>
        );
      default:
        return <IngredientManager />;
    }
  };

  if (loading || !featuresLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm onSuccess={() => {}} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 flex flex-col">
      <Header />
      <div className="flex items-center justify-between max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <div className="text-sm text-gray-600">
          Selamat datang, {user.email}
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-white rounded-lg transition-colors"
        >
          <LogOut size={16} />
          Keluar
        </button>
      </div>
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
      
      {/* Main content area with flex-1 to push footer down */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {renderActiveTab()}
      </main>

      {/* Footer */}
      <Footer />

      {/* Toast notifications */}
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => hideToast(toast.id)}
        />
      ))}
    </div>
  );
}

export default App;