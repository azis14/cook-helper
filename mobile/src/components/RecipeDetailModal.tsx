import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Recipe } from '../hooks/useRecipes';

interface RecipeDetailModalProps {
  visible: boolean;
  onClose: () => void;
  recipe: Recipe | null;
}

const RecipeDetailModal: React.FC<RecipeDetailModalProps> = ({
  visible,
  onClose,
  recipe,
}) => {
  if (!recipe) return null;

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
  };

  const difficultyColors = {
    easy: '#10b981',
    medium: '#f59e0b',
    hard: '#ef4444',
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>
            {recipe.name}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.recipeHeader}>
            <Text style={styles.recipeName}>{recipe.name}</Text>
            <Text style={styles.recipeDescription}>{recipe.description}</Text>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Ionicons name="time-outline" size={24} color="#3b82f6" />
              <Text style={styles.statLabel}>Persiapan</Text>
              <Text style={styles.statValue}>{recipe.prep_time} menit</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="flame-outline" size={24} color="#f97316" />
              <Text style={styles.statLabel}>Memasak</Text>
              <Text style={styles.statValue}>{recipe.cook_time} menit</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="people-outline" size={24} color="#10b981" />
              <Text style={styles.statLabel}>Porsi</Text>
              <Text style={styles.statValue}>{recipe.servings} orang</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="star-outline" size={24} color="#8b5cf6" />
              <Text style={styles.statLabel}>Kesulitan</Text>
              <View style={[styles.difficultyBadge, { backgroundColor: difficultyColors[recipe.difficulty] }]}>
                <Text style={styles.difficultyText}>
                  {difficultyTranslations[recipe.difficulty]}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="list-outline" size={20} color="#10b981" />
              <Text style={styles.sectionTitle}>Bahan-bahan</Text>
            </View>
            <View style={styles.ingredientsList}>
              {(recipe.recipe_ingredients || []).map((ingredient, index) => (
                <View key={index} style={styles.ingredientItem}>
                  <View style={styles.ingredientBullet} />
                  <Text style={styles.ingredientName}>{ingredient.name}</Text>
                  <Text style={styles.ingredientQuantity}>
                    {ingredient.quantity} {unitTranslations[ingredient.unit] || ingredient.unit}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="clipboard-outline" size={20} color="#3b82f6" />
              <Text style={styles.sectionTitle}>Cara Memasak</Text>
            </View>
            <View style={styles.instructionsList}>
              {(recipe.instructions || []).map((instruction, index) => (
                <View key={index} style={styles.instructionItem}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.instructionText}>{instruction}</Text>
                </View>
              ))}
            </View>
          </View>

          {recipe.tags && recipe.tags.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="pricetag-outline" size={20} color="#f59e0b" />
                <Text style={styles.sectionTitle}>Tag</Text>
              </View>
              <View style={styles.tagsContainer}>
                {recipe.tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>#{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.totalTimeCard}>
            <Text style={styles.totalTimeLabel}>Total Waktu Memasak</Text>
            <Text style={styles.totalTimeValue}>
              {recipe.prep_time + recipe.cook_time} menit
            </Text>
            <Text style={styles.totalTimeSubtext}>
              Dari persiapan hingga siap disajikan
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  recipeHeader: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  recipeName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  recipeDescription: {
    fontSize: 16,
    color: '#6b7280',
    lineHeight: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    backgroundColor: 'white',
    marginBottom: 8,
  },
  statCard: {
    width: '50%',
    alignItems: 'center',
    paddingVertical: 16,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    backgroundColor: 'white',
    marginBottom: 8,
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginLeft: 8,
  },
  ingredientsList: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  ingredientBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
    marginRight: 12,
  },
  ingredientName: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },
  ingredientQuantity: {
    fontSize: 14,
    color: '#6b7280',
  },
  instructionsList: {
    gap: 16,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepNumberText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  instructionText: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 14,
    color: '#6b7280',
  },
  totalTimeCard: {
    backgroundColor: 'white',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  totalTimeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  totalTimeValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: 4,
  },
  totalTimeSubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});

export default RecipeDetailModal;