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

const WeeklyPlannerScreen: React.FC = () => {
  const { user } = useAuth();
  const { ingredients } = useIngredients(user?.id);
  const { recipes } = useRecipes(user?.id);
  const { showSuccess, showError } = useToast();
  const [weeklyPlan, setWeeklyPlan] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

  const generateWeeklyPlan = async () => {
    if (recipes.length === 0) {
      Alert.alert('Info', 'Tambahkan beberapa resep terlebih dahulu untuk membuat rencana mingguan!');
      return;
    }

    setIsGenerating(true);
    try {
      // Mock weekly plan generation
      const today = new Date();
      const monday = new Date(today);
      monday.setDate(today.getDate() - today.getDay() + 1);
      
      const dailyMeals = days.map((day, index) => {
        const date = new Date(monday);
        date.setDate(monday.getDate() + index);
        
        // Randomly assign 1-2 recipes per day
        const dayRecipes = [];
        const shuffledRecipes = [...recipes].sort(() => Math.random() - 0.5);
        const numRecipes = Math.floor(Math.random() * 2) + 1; // 1-2 recipes
        
        for (let i = 0; i < Math.min(numRecipes, shuffledRecipes.length); i++) {
          dayRecipes.push(shuffledRecipes[i]);
        }
        
        return {
          day,
          date: date.toISOString().slice(0, 10),
          recipes: dayRecipes,
        };
      });

      const newPlan = {
        id: 'plan-' + Date.now(),
        week_start: monday.toISOString().slice(0, 10),
        daily_meals: dailyMeals,
      };

      setWeeklyPlan(newPlan);
      showSuccess('Rencana menu mingguan berhasil dibuat!');
    } catch (error) {
      showError('Gagal membuat rencana menu');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateShoppingList = () => {
    if (!weeklyPlan) return;

    const neededIngredients: Record<string, any> = {};
    
    // Collect all ingredients needed for the week
    weeklyPlan.daily_meals.forEach((day: any) => {
      day.recipes.forEach((recipe: any) => {
        if (recipe.recipe_ingredients) {
          recipe.recipe_ingredients.forEach((ingredient: any) => {
            const key = ingredient.name.toLowerCase();
            if (neededIngredients[key]) {
              neededIngredients[key].quantity += ingredient.quantity;
            } else {
              neededIngredients[key] = {
                name: ingredient.name,
                quantity: ingredient.quantity,
                unit: ingredient.unit,
              };
            }
          });
        }
      });
    });

    // Check what we already have
    const availableIngredients = ingredients.reduce((acc, ing) => {
      acc[ing.name.toLowerCase()] = ing.quantity;
      return acc;
    }, {} as Record<string, number>);

    // Create shopping list
    const shoppingList = Object.values(neededIngredients)
      .map((item: any) => {
        const available = availableIngredients[item.name.toLowerCase()] || 0;
        const needed = Math.max(0, item.quantity - available);
        return {
          ...item,
          quantity: needed,
          needed: needed > 0,
        };
      })
      .filter((item: any) => item.needed);

    if (shoppingList.length === 0) {
      Alert.alert('Info', 'Anda sudah memiliki semua bahan yang diperlukan!');
    } else {
      const listText = shoppingList
        .map((item: any) => `• ${item.quantity} ${item.unit} ${item.name}`)
        .join('\n');
      
      Alert.alert(
        'Daftar Belanja',
        `Bahan yang perlu dibeli:\n\n${listText}`,
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Rencana Menu Mingguan</Text>
        <Text style={styles.subtitle}>
          Rencanakan menu makan untuk seminggu dengan efisien
        </Text>
      </View>

      <View style={styles.content}>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.generateButton, isGenerating && styles.generateButtonDisabled]}
            onPress={generateWeeklyPlan}
            disabled={isGenerating}
          >
            <Ionicons name="calendar" size={20} color="white" />
            <Text style={styles.generateButtonText}>
              {isGenerating ? 'Sedang membuat...' : 'Buat Rencana Menu'}
            </Text>
          </TouchableOpacity>

          {weeklyPlan && (
            <TouchableOpacity
              style={styles.shoppingButton}
              onPress={generateShoppingList}
            >
              <Ionicons name="basket" size={20} color="white" />
              <Text style={styles.shoppingButtonText}>Daftar Belanja</Text>
            </TouchableOpacity>
          )}
        </View>

        {recipes.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color="#9ca3af" />
            <Text style={styles.emptyText}>
              Tambahkan beberapa resep terlebih dahulu untuk membuat rencana mingguan!
            </Text>
          </View>
        )}

        {weeklyPlan && (
          <ScrollView style={styles.planContainer}>
            <View style={styles.weekHeader}>
              <Text style={styles.weekTitle}>
                Minggu: {new Date(weeklyPlan.week_start).toLocaleDateString('id-ID')}
              </Text>
            </View>

            {weeklyPlan.daily_meals.map((day: any, index: number) => (
              <View key={index} style={styles.dayCard}>
                <Text style={styles.dayTitle}>{day.day}</Text>
                <Text style={styles.dayDate}>
                  {new Date(day.date).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long'
                  })}
                </Text>

                {day.recipes.length === 0 ? (
                  <Text style={styles.noRecipeText}>Tidak ada menu</Text>
                ) : (
                  <View style={styles.recipesContainer}>
                    {day.recipes.map((recipe: any, recipeIndex: number) => (
                      <View key={recipeIndex} style={styles.recipeItem}>
                        <Text style={styles.recipeName}>{recipe.name}</Text>
                        <View style={styles.recipeDetails}>
                          <View style={styles.recipeDetail}>
                            <Ionicons name="time-outline" size={12} color="#6b7280" />
                            <Text style={styles.recipeDetailText}>
                              {recipe.prep_time + recipe.cook_time} menit
                            </Text>
                          </View>
                          <View style={styles.recipeDetail}>
                            <Ionicons name="people-outline" size={12} color="#6b7280" />
                            <Text style={styles.recipeDetailText}>
                              {recipe.servings} porsi
                            </Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        )}

        {!weeklyPlan && recipes.length > 0 && (
          <View style={styles.emptyPlanState}>
            <Ionicons name="calendar-outline" size={64} color="#9ca3af" />
            <Text style={styles.emptyText}>
              Buat rencana menu mingguan pertama Anda untuk memulai!
            </Text>
          </View>
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
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  generateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    borderRadius: 12,
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
  shoppingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  shoppingButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyPlanState: {
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
  planContainer: {
    flex: 1,
  },
  weekHeader: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  weekTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
  },
  dayCard: {
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
  dayTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  dayDate: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  noRecipeText: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  recipesContainer: {
    gap: 8,
  },
  recipeItem: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  recipeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  recipeDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  recipeDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recipeDetailText: {
    fontSize: 12,
    color: '#6b7280',
  },
});

export default WeeklyPlannerScreen;