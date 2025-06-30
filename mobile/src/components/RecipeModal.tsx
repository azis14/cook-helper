import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import RNPickerSelect from 'react-native-picker-select';

interface RecipeModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (recipe: any, ingredients: any[]) => void;
}

const RecipeModal: React.FC<RecipeModalProps> = ({
  visible,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    prep_time: '15',
    cook_time: '30',
    servings: '4',
    difficulty: 'easy',
    instructions: [''],
    tags: '',
  });

  const [ingredients, setIngredients] = useState([
    { name: '', quantity: '1', unit: 'piece' }
  ]);

  const difficulties = [
    { label: 'Mudah', value: 'easy' },
    { label: 'Sedang', value: 'medium' },
    { label: 'Sulit', value: 'hard' },
  ];

  const units = [
    { label: 'kg', value: 'kg' },
    { label: 'gram', value: 'gram' },
    { label: 'liter', value: 'liter' },
    { label: 'ml', value: 'ml' },
    { label: 'buah', value: 'piece' },
    { label: 'siung', value: 'clove' },
  ];

  const addIngredient = () => {
    setIngredients([...ingredients, { name: '', quantity: '1', unit: 'piece' }]);
  };

  const removeIngredient = (index: number) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter((_, i) => i !== index));
    }
  };

  const updateIngredient = (index: number, field: string, value: string) => {
    const newIngredients = [...ingredients];
    newIngredients[index] = { ...newIngredients[index], [field]: value };
    setIngredients(newIngredients);
  };

  const addInstruction = () => {
    setFormData({
      ...formData,
      instructions: [...formData.instructions, '']
    });
  };

  const removeInstruction = (index: number) => {
    if (formData.instructions.length > 1) {
      setFormData({
        ...formData,
        instructions: formData.instructions.filter((_, i) => i !== index)
      });
    }
  };

  const updateInstruction = (index: number, value: string) => {
    const newInstructions = [...formData.instructions];
    newInstructions[index] = value;
    setFormData({ ...formData, instructions: newInstructions });
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Nama resep harus diisi');
      return;
    }

    const validIngredients = ingredients.filter(ing => ing.name.trim());
    if (validIngredients.length === 0) {
      Alert.alert('Error', 'Minimal satu bahan harus diisi');
      return;
    }

    const validInstructions = formData.instructions.filter(inst => inst.trim());
    if (validInstructions.length === 0) {
      Alert.alert('Error', 'Minimal satu langkah harus diisi');
      return;
    }

    const recipeData = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      prep_time: parseInt(formData.prep_time) || 15,
      cook_time: parseInt(formData.cook_time) || 30,
      servings: parseInt(formData.servings) || 4,
      difficulty: formData.difficulty,
      instructions: validInstructions,
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
    };

    const ingredientData = validIngredients.map(ing => ({
      name: ing.name.trim(),
      quantity: parseFloat(ing.quantity) || 1,
      unit: ing.unit,
    }));

    onSave(recipeData, ingredientData);
    
    // Reset form
    setFormData({
      name: '',
      description: '',
      prep_time: '15',
      cook_time: '30',
      servings: '4',
      difficulty: 'easy',
      instructions: [''],
      tags: '',
    });
    setIngredients([{ name: '', quantity: '1', unit: 'piece' }]);
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
          <Text style={styles.title}>Tambah Resep</Text>
          <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
            <Text style={styles.saveButtonText}>Simpan</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nama Resep</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="contoh: Nasi Goreng Spesial"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Deskripsi</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="Deskripsi singkat tentang resep ini..."
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Persiapan (menit)</Text>
                <TextInput
                  style={styles.input}
                  value={formData.prep_time}
                  onChangeText={(text) => setFormData({ ...formData, prep_time: text })}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>Memasak (menit)</Text>
                <TextInput
                  style={styles.input}
                  value={formData.cook_time}
                  onChangeText={(text) => setFormData({ ...formData, cook_time: text })}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Porsi</Text>
                <TextInput
                  style={styles.input}
                  value={formData.servings}
                  onChangeText={(text) => setFormData({ ...formData, servings: text })}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>Kesulitan</Text>
                <View style={styles.pickerContainer}>
                  <RNPickerSelect
                    value={formData.difficulty}
                    onValueChange={(value) => setFormData({ ...formData, difficulty: value })}
                    items={difficulties}
                    style={pickerSelectStyles}
                    placeholder={{}}
                  />
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Bahan-bahan</Text>
                <TouchableOpacity onPress={addIngredient} style={styles.addButton}>
                  <Ionicons name="add" size={20} color="#10b981" />
                </TouchableOpacity>
              </View>
              {ingredients.map((ingredient, index) => (
                <View key={index} style={styles.ingredientRow}>
                  <TextInput
                    style={[styles.input, { flex: 2, marginRight: 8 }]}
                    value={ingredient.name}
                    onChangeText={(text) => updateIngredient(index, 'name', text)}
                    placeholder="Nama bahan"
                  />
                  <TextInput
                    style={[styles.input, { flex: 1, marginRight: 8 }]}
                    value={ingredient.quantity}
                    onChangeText={(text) => updateIngredient(index, 'quantity', text)}
                    placeholder="Jumlah"
                    keyboardType="numeric"
                  />
                  <View style={[styles.pickerContainer, { flex: 1, marginRight: 8 }]}>
                    <RNPickerSelect
                      value={ingredient.unit}
                      onValueChange={(value) => updateIngredient(index, 'unit', value)}
                      items={units}
                      style={pickerSelectStyles}
                      placeholder={{}}
                    />
                  </View>
                  {ingredients.length > 1 && (
                    <TouchableOpacity
                      onPress={() => removeIngredient(index)}
                      style={styles.removeButton}
                    >
                      <Ionicons name="trash" size={16} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Cara Memasak</Text>
                <TouchableOpacity onPress={addInstruction} style={styles.addButton}>
                  <Ionicons name="add" size={20} color="#10b981" />
                </TouchableOpacity>
              </View>
              {formData.instructions.map((instruction, index) => (
                <View key={index} style={styles.instructionRow}>
                  <Text style={styles.stepNumber}>{index + 1}.</Text>
                  <TextInput
                    style={[styles.input, styles.textArea, { flex: 1 }]}
                    value={instruction}
                    onChangeText={(text) => updateInstruction(index, text)}
                    placeholder={`Langkah ${index + 1}...`}
                    multiline
                    numberOfLines={2}
                  />
                  {formData.instructions.length > 1 && (
                    <TouchableOpacity
                      onPress={() => removeInstruction(index)}
                      style={styles.removeButton}
                    >
                      <Ionicons name="trash" size={16} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Tag (pisahkan dengan koma)</Text>
              <TextInput
                style={styles.input}
                value={formData.tags}
                onChangeText={(text) => setFormData({ ...formData, tags: text })}
                placeholder="contoh: nasi, goreng, pedas"
              />
            </View>
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
  },
  saveButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  form: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: 'white',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  addButton: {
    padding: 4,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginRight: 8,
    marginTop: 12,
  },
  removeButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    color: '#1f2937',
  },
  inputAndroid: {
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#1f2937',
  },
});

export default RecipeModal;