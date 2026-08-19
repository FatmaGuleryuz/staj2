import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Image,
  Text,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RootStackParamList } from './src/types/navigation';
import SnagListScreen from './src/screens/SnagListScreen';
import SnagDetailScreen from './src/screens/SnagDetailScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

// 🎨 Kurumsal Açılış Ekranı (Splash Screen)
function CustomSplashScreen() {
  return (
    <View style={styles.splashContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.logoWrapper}>
        <Image
          source={require('./assets/icon.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </View>
      <View style={styles.splashFooter}>
        <ActivityIndicator size="small" color="#0056b3" />
        <Text style={styles.footerText}>Sistem hazırlanıyor...</Text>
      </View>
    </View>
  );
}

export default function App() {
  const [isShowSplash, setIsShowSplash] = useState<boolean>(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsShowSplash(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      {isShowSplash ? (
        <CustomSplashScreen />
      ) : (
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="SnagList"
            screenOptions={{
              headerStyle: {
                backgroundColor: '#ffffff',
              },
              headerTitleStyle: {
                fontWeight: 'bold',
                color: '#0056b3',
              },
              headerTintColor: '#0056b3',
              headerShadowVisible: false,
            }}
          >
            <Stack.Screen
              name="SnagList"
              component={SnagListScreen}
              options={{
                title: 'SahaKONTROL',
              }}
            />
            <Stack.Screen
              name="SnagDetail"
              component={SnagDetailScreen}
              options={{
                title: 'Kusur Detayı',
              }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  logoImage: {
    width: 260,
    height: 260,
  },
  splashFooter: {
    paddingBottom: 40,
    alignItems: 'center',
    gap: 8,
  },
  footerText: {
    fontSize: 13,
    color: '#6c757d',
    fontWeight: '500',
  },
});