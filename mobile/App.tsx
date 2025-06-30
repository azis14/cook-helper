import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { AuthProvider } from './src/contexts/AuthContext';
import { ToastProvider } from './src/contexts/ToastContext';
import AuthScreen from './src/screens/AuthScreen';
import IngredientsScreen from './src/screens/IngredientsScreen';
import RecipesScreen from './src/screens/RecipesScreen';
import SuggestionsScreen from './src/screens/SuggestionsScreen';
import WeeklyPlannerScreen from './src/screens/WeeklyPlannerScreen';
import { useAuth } from './src/hooks/useAuth';
import { View, ActivityIndicator } from 'react-native';

const Tab = createBottomTabNavigator();

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Bahan') {
            iconName = focused ? 'basket' : 'basket-outline';
          } else if (route.name === 'Resep') {
            iconName = focused ? 'book' : 'book-outline';
          } else if (route.name === 'Inspirasi') {
            iconName = focused ? 'bulb' : 'bulb-outline';
          } else if (route.name === 'Rencana') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else {
            iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#f97316',
        tabBarInactiveTintColor: 'gray',
        headerStyle: {
          backgroundColor: '#fed7aa',
        },
        headerTintColor: '#9a3412',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      <Tab.Screen name="Bahan" component={IngredientsScreen} />
      <Tab.Screen name="Resep" component={RecipesScreen} />
      <Tab.Screen name="Inspirasi" component={SuggestionsScreen} />
      <Tab.Screen name="Rencana" component={WeeklyPlannerScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <NavigationContainer>
          <StatusBar style="auto" />
          <AppContent />
        </NavigationContainer>
      </ToastProvider>
    </AuthProvider>
  );
}