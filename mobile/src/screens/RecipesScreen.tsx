import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { useRecipes, Recipe } from '../hooks/useRecipes';
import { useToast } from '../contexts/ToastContext';
import RecipeModal from '../components/RecipeModal';
import RecipeDetailModal from '../components/RecipeDetailModal';

const RecipesScreen: React.FC = () => {
  const { user } = useAuth();
  const { recipes, loading, addRecipe, deleteRecipe, refetch } = useRecipes(user?.id);
  const { showSuccess, showError } = useToast();
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  const difficultyTranslations = {
    easy: 'Mudah',
    medium: 'Sedang',
    hard: 'Sulit',
  };

  const difficultyColors = {
    easy: '#10b981',
    medium: '#f59e0b',
    hard: '#ef4444',
  };

  const handleAddRecipe = () => {
    setModalVisible(true);
  };

  const handleViewRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setDetailModalVisible(true);
  };

  const handleDeleteRecipe = (recipe: Recipe) => {
    Alert.alert(
      'Hapus Resep',
      `Apakah Anda yakin ingin menghapus "${recipe.name}"?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteRecipe(recipe.id);
              showSuccess('Resep berhasil dihapus');
            } catch (error) {
              showError('Gagal menghapus resep');
            }
          },
        },
      ]
    );
  };

  const handleSaveRecipe = async (recipeData: any, ingredients: any[]) => {
    try {
      await addRecipe(recipeData, ingredients);
      showSuccess('Resep berhasil ditambahkan');
      setModalVisible(false);
    } catch (error) {
      showError('Gagal menyimpan resep');
    }
  };

  const renderRecipe = ({ item }: { item: Recipe }) => (
    <TouchableOpacity
      style={styles.recipeCard}
      onPress={() => handleViewRecipe(item)}
    >
      <View style={styles.recipeHeader}>
        <View style={styles.recipeInfo}>
          <Text style={styles.recipeName}>{item.name}</Text>
          <Text style={styles.recipeDescription} numberOfLines={2}>
            {item.description}
          </Text>
          
          <View style={styles.recipeDetails}>
            <View style={styles.detailItem}>
              <Ionicons name="time-outline" size={14} color="#6b7280" />
              <Text style={styles.detailText}>
                {item.prep_time + item.cook_time} menit
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="people-outline" size={14} color="#6b7280" />
              <Text style={styles.detailText}>{item.servings} porsi</Text>
            </View>
            <View style={[styles.difficultyBadge, { backgroundColor: difficultyColors[item.difficulty] }]}>
              <Text style={styles.difficultyText}>
                {difficultyTranslations[item.difficulty]}
              </Text>
            </View>
          </View>

          <Text style={styles.ingredientCount}>
            {item.recipe_ingredients?.length || 0} bahan
          </Text>
        </View>
        
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteRecipe(item)}
        >
          <Ionicons name="trash-outline" size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Resep-Resep Saya</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAddRecipe}>
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {recipes.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="book-outline" size={64} color="#9ca3af" />
          <Text style={styles.emptyText}>
            Belum ada resep tersimpan
          </Text>
          <Text style={styles.emptySubtext}>
            Buat resep pertama Anda!
          </Text>
        </View>
      ) : (
        <FlatList
          data={recipes}
          renderItem={renderRecipe}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refetch} />
          }
          contentContainerStyle={styles.listContent}
        />
      )}

      <RecipeModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={handleSaveRecipe}
      />

      <RecipeDetailModal
        visible={detailModalVisible}
        onClose={() => setDetailModalVisible(false)}
        recipe={selectedRecipe}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  addButton: {
    backgroundColor: '#10b981',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  recipeCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  recipeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  recipeInfo: {
    flex: 1,
  },
  recipeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  recipeDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  recipeDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  difficultyText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  ingredientCount: {
    fontSize: 12,
    color: '#6b7280',
  },
  deleteButton: {
    padding: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default RecipesScreen;