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
import { useIngredients, Ingredient } from '../hooks/useIngredients';
import { useToast } from '../contexts/ToastContext';
import IngredientModal from '../components/IngredientModal';

const IngredientsScreen: React.FC = () => {
  const { user } = useAuth();
  const { ingredients, loading, addIngredient, updateIngredient, deleteIngredient, refetch } = useIngredients(user?.id);
  const { showSuccess, showError } = useToast();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);

  const categoryTranslations: Record<string, string> = {
    vegetables: 'Sayuran',
    meat: 'Daging & Unggas',
    seafood: 'Makanan Laut',
    dairy: 'Susu & Olahan',
    fruits: 'Buah-buahan',
  };

  const unitTranslations: Record<string, string> = {
    kg: 'kg',
    gram: 'gram',
    liter: 'liter',
    ml: 'ml',
    piece: 'buah',
    clove: 'siung',
  };

  const categoryColors: Record<string, string> = {
    vegetables: '#10b981',
    meat: '#ef4444',
    seafood: '#3b82f6',
    dairy: '#f59e0b',
    fruits: '#f97316',
  };

  const handleAddIngredient = () => {
    setEditingIngredient(null);
    setModalVisible(true);
  };

  const handleEditIngredient = (ingredient: Ingredient) => {
    setEditingIngredient(ingredient);
    setModalVisible(true);
  };

  const handleDeleteIngredient = (ingredient: Ingredient) => {
    Alert.alert(
      'Hapus Bahan',
      `Apakah Anda yakin ingin menghapus "${ingredient.name}"?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteIngredient(ingredient.id);
              showSuccess('Bahan berhasil dihapus');
            } catch (error) {
              showError('Gagal menghapus bahan');
            }
          },
        },
      ]
    );
  };

  const handleSaveIngredient = async (ingredientData: any) => {
    try {
      if (editingIngredient) {
        await updateIngredient(editingIngredient.id, ingredientData);
        showSuccess('Bahan berhasil diperbarui');
      } else {
        await addIngredient(ingredientData);
        showSuccess('Bahan berhasil ditambahkan');
      }
      setModalVisible(false);
    } catch (error) {
      showError('Gagal menyimpan bahan');
    }
  };

  const renderIngredient = ({ item }: { item: Ingredient }) => (
    <View style={styles.ingredientCard}>
      <View style={styles.ingredientHeader}>
        <View style={styles.ingredientInfo}>
          <Text style={styles.ingredientName}>{item.name}</Text>
          <Text style={styles.ingredientQuantity}>
            {item.quantity} {unitTranslations[item.unit]}
          </Text>
          <View style={[styles.categoryBadge, { backgroundColor: categoryColors[item.category] }]}>
            <Text style={styles.categoryText}>
              {categoryTranslations[item.category]}
            </Text>
          </View>
          {item.expiry_date && (
            <Text style={styles.expiryDate}>
              Kadaluarsa: {new Date(item.expiry_date).toLocaleDateString('id-ID')}
            </Text>
          )}
        </View>
        <View style={styles.ingredientActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => handleEditIngredient(item)}
          >
            <Ionicons name="pencil" size={16} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteIngredient(item)}
          >
            <Ionicons name="trash" size={16} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const groupedIngredients = ingredients.reduce((acc, ingredient) => {
    if (!acc[ingredient.category]) {
      acc[ingredient.category] = [];
    }
    acc[ingredient.category].push(ingredient);
    return acc;
  }, {} as Record<string, Ingredient[]>);

  const renderCategory = ({ item }: { item: [string, Ingredient[]] }) => {
    const [category, categoryIngredients] = item;
    return (
      <View style={styles.categorySection}>
        <Text style={styles.categoryTitle}>
          {categoryTranslations[category]} ({categoryIngredients.length})
        </Text>
        {categoryIngredients.map((ingredient) => (
          <View key={ingredient.id}>
            {renderIngredient({ item: ingredient })}
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Bahan-Bahan Saya</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAddIngredient}>
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {ingredients.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="basket-outline" size={64} color="#9ca3af" />
          <Text style={styles.emptyText}>
            Belum ada bahan yang ditambahkan
          </Text>
          <Text style={styles.emptySubtext}>
            Mulai dengan menambahkan beberapa bahan!
          </Text>
        </View>
      ) : (
        <FlatList
          data={Object.entries(groupedIngredients)}
          renderItem={renderCategory}
          keyExtractor={([category]) => category}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refetch} />
          }
          contentContainerStyle={styles.listContent}
        />
      )}

      <IngredientModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={handleSaveIngredient}
        ingredient={editingIngredient}
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
    backgroundColor: '#f97316',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  ingredientCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  ingredientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  ingredientQuantity: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  categoryText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  expiryDate: {
    fontSize: 12,
    color: '#f97316',
    fontWeight: '500',
  },
  ingredientActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#3b82f6',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
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

export default IngredientsScreen;