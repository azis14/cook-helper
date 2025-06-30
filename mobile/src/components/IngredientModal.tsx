import React, { useState, useEffect } from 'react';
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
import { Ingredient } from '../hooks/useIngredients';

interface IngredientModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (ingredient: any) => void;
  ingredient?: Ingredient | null;
}

const IngredientModal: React.FC<IngredientModalProps> = ({
  visible,
  onClose,
  onSave,
  ingredient,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    quantity: '1',
    unit: 'piece',
    category: 'vegetables',
    expiry_date: '',
  });

  const categories = [
    { label: 'Sayuran', value: 'vegetables' },
    { label: 'Daging & Unggas', value: 'meat' },
    { label: 'Makanan Laut', value: 'seafood' },
    { label: 'Susu & Olahan', value: 'dairy' },
    { label: 'Buah-buahan', value: 'fruits' },
  ];

  const units = [
    { label: 'kg', value: 'kg' },
    { label: 'gram', value: 'gram' },
    { label: 'liter', value: 'liter' },
    { label: 'ml', value: 'ml' },
    { label: 'buah', value: 'piece' },
    { label: 'siung', value: 'clove' },
  ];

  useEffect(() => {
    if (ingredient) {
      setFormData({
        name: ingredient.name,
        quantity: ingredient.quantity.toString(),
        unit: ingredient.unit,
        category: ingredient.category,
        expiry_date: ingredient.expiry_date || '',
      });
    } else {
      setFormData({
        name: '',
        quantity: '1',
        unit: 'piece',
        category: 'vegetables',
        expiry_date: '',
      });
    }
  }, [ingredient, visible]);

  const handleSave = () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Nama bahan harus diisi');
      return;
    }

    if (!formData.quantity || parseFloat(formData.quantity) <= 0) {
      Alert.alert('Error', 'Jumlah harus lebih dari 0');
      return;
    }

    const ingredientData = {
      name: formData.name.trim(),
      quantity: parseFloat(formData.quantity),
      unit: formData.unit,
      category: formData.category,
      expiry_date: formData.expiry_date || null,
    };

    onSave(ingredientData);
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
          <Text style={styles.title}>
            {ingredient ? 'Edit Bahan' : 'Tambah Bahan'}
          </Text>
          <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
            <Text style={styles.saveButtonText}>Simpan</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nama Bahan</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="contoh: Ayam, Tomat, Beras..."
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Jumlah</Text>
                <TextInput
                  style={styles.input}
                  value={formData.quantity}
                  onChangeText={(text) => setFormData({ ...formData, quantity: text })}
                  placeholder="1"
                  keyboardType="numeric"
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>Satuan</Text>
                <View style={styles.pickerContainer}>
                  <RNPickerSelect
                    value={formData.unit}
                    onValueChange={(value) => setFormData({ ...formData, unit: value })}
                    items={units}
                    style={pickerSelectStyles}
                    placeholder={{}}
                  />
                </View>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Kategori</Text>
              <View style={styles.pickerContainer}>
                <RNPickerSelect
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                  items={categories}
                  style={pickerSelectStyles}
                  placeholder={{}}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Tanggal Kadaluarsa (opsional)</Text>
              <TextInput
                style={styles.input}
                value={formData.expiry_date}
                onChangeText={(text) => setFormData({ ...formData, expiry_date: text })}
                placeholder="YYYY-MM-DD"
              />
              <Text style={styles.helpText}>
                Format: YYYY-MM-DD (contoh: 2024-12-31)
              </Text>
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
    backgroundColor: '#f97316',
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
  row: {
    flexDirection: 'row',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: 'white',
  },
  helpText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
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

export default IngredientModal;