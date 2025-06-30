import React, { createContext, useContext, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error';
}

interface ToastContextType {
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
}

const ToastContext = createContext<ToastContextType>({
  showSuccess: () => {},
  showError: () => {},
});

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now().toString();
    const newToast: Toast = { id, message, type };
    
    setToasts(prev => [...prev, newToast]);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 3000);
  };

  const showSuccess = (message: string) => showToast(message, 'success');
  const showError = (message: string) => showToast(message, 'error');

  return (
    <ToastContext.Provider value={{ showSuccess, showError }}>
      {children}
      {toasts.length > 0 && (
        <View style={styles.toastContainer}>
          {toasts.map(toast => (
            <View
              key={toast.id}
              style={[
                styles.toast,
                toast.type === 'success' ? styles.successToast : styles.errorToast
              ]}
            >
              <Ionicons
                name={toast.type === 'success' ? 'checkmark-circle' : 'alert-circle'}
                size={20}
                color="white"
              />
              <Text style={styles.toastText}>{toast.message}</Text>
            </View>
          ))}
        </View>
      )}
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 1000,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  successToast: {
    backgroundColor: '#10b981',
  },
  errorToast: {
    backgroundColor: '#ef4444',
  },
  toastText: {
    color: 'white',
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
});