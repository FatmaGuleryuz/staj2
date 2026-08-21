import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Image,
  Text,
  StatusBar,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { RootStackParamList } from './src/types/navigation';
import SnagListScreen from './src/screens/SnagListScreen';
import SnagDetailScreen from './src/screens/SnagDetailScreen';
import CreateSnagScreen from './src/screens/CreateSnagScreen';

const queryClient = new QueryClient();
const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [splashVisible, setSplashVisible] = useState(true);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Building bittikten sonra ekranda 2 saniye net kalır
    const timer = setTimeout(() => {
      // 500ms süren yumuşak saydamlaşma (fade-out) geçişi
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        setSplashVisible(false);
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, [fadeAnim]);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <QueryClientProvider client={queryClient}>
        <View style={styles.rootContainer}>
          {/* Ana Uygulama Navigasyonu */}
          <NavigationContainer>
            <Stack.Navigator
              initialRouteName="SnagList"
              screenOptions={{
                headerStyle: { backgroundColor: '#ffffff' },
                headerTitleStyle: { fontWeight: 'bold', color: '#0056b3' },
                headerTintColor: '#0056b3',
                headerShadowVisible: false,
              }}
            >
              <Stack.Screen
                name="SnagList"
                component={SnagListScreen}
                options={{ title: 'SahaKONTROL' }}
              />
              <Stack.Screen
                name="SnagDetail"
                component={SnagDetailScreen}
                options={{ title: 'Kusur Detayı' }}
              />
              <Stack.Screen
                name="CreateSnag"
                component={CreateSnagScreen}
                options={{ title: 'Yeni Kusur Bildirimi' }}
              />
            </Stack.Navigator>
          </NavigationContainer>

          {/* Akıcı Geçişli Açılış Katmanı */}
          {splashVisible && (
            <Animated.View
              style={[
                styles.splashOverlay,
                { opacity: fadeAnim },
              ]}
              pointerEvents="none"
            >
              <View style={styles.logoWrapper}>
                <Image
                  source={require('./assets/icon.png')}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.splashFooter}>
                <ActivityIndicator size="small" color="#0056b3" />
                <Text style={styles.footerText}>SahaKONTROL Yükleniyor...</Text>
              </View>
            </Animated.View>
          )}
        </View>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  splashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
    elevation: 999,
  },
  logoWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  logoImage: {
    width: 220,
    height: 220,
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