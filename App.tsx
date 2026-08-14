import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StatusBar,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from './src/lib/supabase';

interface SnagItem {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  locations?: {
    title: string;
  } | null;
}

export default function App() {
  const [snags, setSnags] = useState<SnagItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchSnags();
  }, []);

  async function fetchSnags() {
    setErrorMessage(null);
    try {
      const { data, error } = await supabase
        .from('snags')
        .select('*, locations(title)');

      if (error) {
        setErrorMessage(error.message);
      } else {
        setSnags((data as unknown as SnagItem[]) || []);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Bilinmeyen bir hata oluştu.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const onRefresh = () => {
    setRefreshing(true);
    fetchSnags();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>🏗️ SahaKONTROL</Text>
          <Text style={styles.headerSubtitle}>Saha Eksiklik & Kalite Takip Paneli</Text>
        </View>

        {errorMessage ? (
          <ScrollView style={styles.errorBox}>
            <Text style={styles.errorTitle}>⚠️ Bağlantı / Veritabanı Uyarısı:</Text>
            <Text style={styles.errorDetail}>{errorMessage}</Text>
          </ScrollView>
        ) : loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#0056b3" />
            <Text style={styles.loaderText}>Veriler Supabase'den alınıyor...</Text>
          </View>
        ) : (
          <FlatList
            data={snags}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Henüz kayıtlı bir hasar/kusur kaydı yok.</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.title}>{item.title}</Text>
                  <View style={styles.priorityBadge}>
                    <Text style={styles.priorityText}>{item.priority?.toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={styles.description}>{item.description}</Text>
                <View style={styles.divider} />
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>📍 Konum:</Text>
                  <Text style={styles.metaValue}>
                    {item.locations?.title || 'Belirtilmedi'}
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>📌 Durum:</Text>
                  <Text style={[styles.metaValue, styles.statusText]}>
                    {item.status?.toUpperCase()}
                  </Text>
                </View>
              </View>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8f9fa' },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 10 },
  headerContainer: { marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#e9ecef' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#212529' },
  headerSubtitle: { fontSize: 13, color: '#6c757d', marginTop: 2 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loaderText: { marginTop: 10, color: '#6c757d', fontSize: 14 },
  errorBox: { padding: 14, backgroundColor: '#ffe3e3', borderRadius: 8, borderColor: '#ffc9c9', borderWidth: 1 },
  errorTitle: { color: '#c92a2a', fontWeight: 'bold', fontSize: 15, marginBottom: 4 },
  errorDetail: { color: '#495057', fontSize: 13, lineHeight: 18 },
  card: { backgroundColor: '#ffffff', borderRadius: 10, padding: 16, marginBottom: 14, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 16, fontWeight: 'bold', color: '#343a40', flex: 1, marginRight: 8 },
  priorityBadge: { backgroundColor: '#d9534f', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  priorityText: { color: '#ffffff', fontSize: 11, fontWeight: 'bold' },
  description: { fontSize: 14, color: '#495057', lineHeight: 20, marginBottom: 10 },
  divider: { height: 1, backgroundColor: '#f1f3f5', marginVertical: 8 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  metaLabel: { fontSize: 13, color: '#868e96', fontWeight: '500' },
  metaValue: { fontSize: 13, color: '#212529', fontWeight: '600' },
  statusText: { color: '#0056b3' },
  emptyContainer: { padding: 20, alignItems: 'center' },
  emptyText: { color: '#adb5bd', fontSize: 14 },
});