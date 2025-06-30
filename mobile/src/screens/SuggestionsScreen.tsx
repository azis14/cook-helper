import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { useIngredients } from '../hooks/useIngredients';
import { useRecipes } from '../hooks/useRecipes';
import { useToast } from '../contexts/ToastContext';

const SuggestionsScreen: React.FC = () => {
  const { user } = useAuth();
  const { ingredients } = useIngredients(user?.id);
  const { addRecipe } = useRecipes(user?.id);
  const { showSuccess, showError } = useToast();
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const generateSuggestions = async () => {
    if (ingredients.length === 0) {
      Alert.alert('Info', 'Tambahkan beberapa bahan terlebih dahulu untuk mendapatkan inspirasi resep AI!');
      return;
    }

    setIsLoading(true);
    try {
      // Mock AI suggestions for demo
      const mockSuggestions = [
        {
          id: 'mock-1',
          name: 'Tumis Sayuran Segar',
          description: 'Tumisan sayuran yang sehat dan lezat dengan bumbu sederhana',
          prep_time: 10,
          cook_time: 15,
          servings: 4,
          difficulty: 'easy',
          instructions: [
            'Cuci bersih semua sayuran',
            'Potong sayuran sesuai selera',
            'Panaskan minyak di wajan',
            'Tumis bawang putih hingga harum',
            'Masukkan sayuran dan aduk rata',
            'Bumbui dengan garam dan merica',
            'Masak hingga sayuran matang'
          ],
          tags: ['sehat', 'vegetarian', 'cepat'],
          recipe_ingredients: [
            { name: 'Sayuran campuran', quantity: 300, unit: 'gram' },
            { name: 'Bawang putih', quantity: 3, unit: 'siung' },
            { name: 'Minyak goreng', quantity: 2, unit: 'sendok' },
            { name: 'Garam', quantity: 1, unit: 'sendok' },
            { name: 'Merica', quantity: 1, unit: 'sendok' }
          ]
        },
        {
          id: 'mock-2',
          name: 'Sup Ayam Hangat',
          description: 'Sup ayam yang menghangatkan dengan sayuran segar',
          prep_time: 15,
          cook_time: 30,
          servings: 4,
          difficulty: 'medium',
          instructions: [
            'Rebus ayam hingga empuk',
            'Angkat ayam dan suwir-suwir',
            'Saring kaldu ayam',
            'Tumis bumbu halus',
            'Masukkan kaldu dan didihkan',
            'Tambahkan sayuran',
            'Masukkan ayam suwir',
            'Bumbui sesuai selera'
          ],
          tags: ['berkuah', 'hangat', 'bergizi'],
          recipe_ingredients: [
            { name: 'Ayam', quantity: 500, unit: 'gram' },
            { name: 'Wortel', quantity: 2, unit: 'buah' },
            { name: 'Kentang', quantity: 2, unit: 'buah' },
            { name: 'Bawang merah', quantity: 5, unit: 'siung' },
            { name: 'Bawang putih', quantity: 3, unit: 'siung' }
          ]
        }
      ];

      setSuggestions(mockSuggestions);
      showSuccess('Berhasil membuat inspirasi resep AI!');
    } catch (error) {
      showError('Gagal membuat inspirasi resep');
    } finally {
      setIsLoading(false);
    }
  };

  const saveRecipe = async (suggestion: any) => {
    try {
      const recipeData = {
        name: suggestion.name,
        description: suggestion.description,
        prep_time: suggestion.prep_time,
        cook_time: suggestion.cook_time,
        servings: suggestion.servings,
        difficulty: suggestion.difficulty,
        instructions: suggestion.instructions,
        tags: suggestion.tags,
      };

      const ingredients = suggestion.recipe_ingredients.map((ing: any) => ({
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
      }));

      await addRecipe(recipeData, ingredients);
      showSuccess('Resep berhasil disimpan ke koleksi Anda!');
    } catch (error) {
      showError('Gagal menyimpan resep');
    }
  };

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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Inspirasi Resep AI</Text>
        <Text style={styles.subtitle}>
          Resep pintar berdasarkan bahan yang tersedia
        </Text>
      </View>

      <View style={styles.content}>
        <TouchableOpacity
          style={[styles.generateButton, isLoading && styles.generateButtonDisabled]}
          onPress={generateSuggestions}
          disabled={isLoading || ingredients.length === 0}
        >
          <Ionicons 
            name="sparkles" 
            size={20} 
            color="white" 
            style={isLoading ? { transform: [{ rotate: '360deg' }] } : {}}
          />
          <Text style={styles.generateButtonText}>
            {isLoading ? 'Sedang membuat...' : 'Buat Inspirasi AI'}
          </Text>
        </TouchableOpacity>

        {ingredients.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="bulb-outline" size={64} color="#9ca3af" />
            <Text style={styles.emptyText}>
              Tambahkan beberapa bahan terlebih dahulu untuk mendapatkan inspirasi resep AI!
            </Text>
          </View>
        )}

        {suggestions.length > 0 && (
          <ScrollView style={styles.suggestionsList}>
            {suggestions.map((suggestion) => (
              <View key={suggestion.id} style={styles.suggestionCard}>
                <View style={styles.suggestionHeader}>
                  <Text style={styles.suggestionName}>{suggestion.name}</Text>
                  <Ionicons name="sparkles" size={20} color="#8b5cf6" />
                </View>
                
                <Text style={styles.suggestionDescription}>
                  {suggestion.description}
                </Text>
                
                <View style={styles.suggestionDetails}>
                  <View style={styles.detailItem}>
                    <Ionicons name="time-outline" size={14} color="#6b7280" />
                    <Text style={styles.detailText}>
                      {suggestion.prep_time + suggestion.cook_time} menit
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Ionicons name="people-outline" size={14} color="#6b7280" />
                    <Text style={styles.detailText}>{suggestion.servings} porsi</Text>
                  </View>
                  <View style={[styles.difficultyBadge, { backgroundColor: difficultyColors[suggestion.difficulty] }]}>
                    <Text style={styles.difficultyText}>
                      {difficultyTranslations[suggestion.difficulty]}
                    </Text>
                  </View>
                </View>

                <View style={styles.ingredientsPreview}>
                  <Text style={styles.previewTitle}>Bahan-bahan:</Text>
                  {suggestion.recipe_ingredients.slice(0, 3).map((ingredient: any, index: number) => (
                    <Text key={index} style={styles.ingredientText}>
                      • {ingredient.quantity} {ingredient.unit} {ingredient.name}
                    </Text>
                  ))}
                  {suggestion.recipe_ingredients.length > 3 && (
                    <Text style={styles.moreText}>
                      + {suggestion.recipe_ingredients.length - 3} bahan lainnya
                    </Text>
                  )}
                </View>

                <View style={styles.instructionsPreview}>
                  <Text style={styles.previewTitle}>Cara memasak:</Text>
                  {suggestion.instructions.slice(0, 2).map((instruction: string, index: number) => (
                    <Text key={index} style={styles.instructionText}>
                      {index + 1}. {instruction}
                    </Text>
                  ))}
                  {suggestion.instructions.length > 2 && (
                    <Text style={styles.moreText}>
                      + {suggestion.instructions.length - 2} langkah lainnya
                    </Text>
                  )}
                </View>

                {suggestion.tags && suggestion.tags.length > 0 && (
                  <View style={styles.tagsContainer}>
                    {suggestion.tags.slice(0, 3).map((tag: string, index: number) => (
                      <View key={index} style={styles.tag}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={() => saveRecipe(suggestion)}
                >
                  <Ionicons name="bookmark" size={16} color="white" />
                  <Text style={styles.saveButtonText}>Simpan Resep</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8b5cf6',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
  },
  generateButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  generateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 24,
  },
  suggestionsList: {
    flex: 1,
  },
  suggestionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e5b4f3',
  },
  suggestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  suggestionName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
  },
  suggestionDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  suggestionDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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
  ingredientsPreview: {
    marginBottom: 12,
  },
  instructionsPreview: {
    marginBottom: 12,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  ingredientText: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  instructionText: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  moreText: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 4,
  },
  tag: {
    backgroundColor: '#e5b4f3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 10,
    color: '#8b5cf6',
    fontWeight: '500',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default SuggestionsScreen;