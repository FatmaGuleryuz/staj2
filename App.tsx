import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootStackParamList } from './src/types/navigation';
import SnagListScreen from './src/screens/SnagListScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: '#ffffff' },
            headerTitleStyle: { fontWeight: 'bold', color: '#212529' },
            headerTintColor: '#0d6efd',
          }}
        >
          <Stack.Screen
            name="SnagList"
            component={SnagListScreen}
            options={{ title: '🏗️ SahaKONTROL' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}