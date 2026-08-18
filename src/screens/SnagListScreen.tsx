import React, { useEffect, useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { Snag, SnagStatus } from '../types/database';
import { supabase } from '../lib/supabase';
import { useSnagStore } from '../store/useSnagStore';

type Props = NativeStackScreenProps<RootStackParamList, 'SnagList'>;

const STATUS_TABS: { label: string; value: SnagStatus | 'all' }[] = [
  { label: 'Tümü', value: 'all' },
  { label: 'Açık', value: 'open' },
  { label: 'İşlemde', value: 'in_progress' },
  { label: 'Çözüldü', value: 'resolved' },
];

export default function SnagListScreen({ navigation }: Props) {
  const [snags, setSnags] = useState<Snag[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Zustand Store
  const { searchQuery, selectedStatus, setSearchQuery, setSelectedStatus } = useSnagStore();

  useEffect(() => {
    fetchSnags();
  }, []);

  async function fetchSnags() {
    try {
      const { data, error } = await supabase
        .from('snags')
        .select('id, title, description, status, priority, created_at, locations(title), users!snags_assigned_to_user_id_fkey(full_name, role)')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase Hatası:', error.message);
      } else {
        setSnags((data as unknown as Snag[]) || []);
      }
    } catch (err) {
      console.error('Bağlantı Hatası:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // Arama ve Durum Filtreleme (Null/Undefined Korumalı)
  const filteredSnags = useMemo(() => {
    return snags.filter((snag) => {
      const query = searchQuery.trim().toLowerCase();
      const titleMatch = (snag.title || '').toLowerCase().includes(query);
      const descMatch = (snag.description || '').toLowerCase().includes(query);
      const locMatch = (snag.locations?.title || '').toLowerCase().includes(query);

      const matchesSearch = query === '' ? true : (titleMatch || descMatch || locMatch);
      const matchesStatus = selectedStatus === 'all' ? true : snag.status === selectedStatus;

      return matchesSearch && matchesStatus;
    });
  }, [snags, searchQuery, selectedStatus]);

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'critical':
      case 'high':
        return '#dc3545';
      case 'medium':
        return '#fd7e14';
      default:
        return '#0dcaf0';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'resolved':
      case 'approved':
        return '#198754';
      case 'in_progress':
        return '#0d6efd';
      default:
        return '#6c757d';
    }
  };

  return (
    <View style={styles.container}>
      {/* 🔍 Arama Çubuğu */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Kusur, açıklama veya konum ara..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* 📌 Durum Filtre Sekmeleri */}
      <View style={styles.tabContainer}>
        {STATUS_TABS.map((tab) => (
          <TouchableOpacity
            key={tab.value}
            style={[styles.tabButton, selectedStatus === tab.value && styles.tabButtonActive]}
            onPress={() => setSelectedStatus(tab.value)}
          >
            <Text style={[styles.tabText, selectedStatus === tab.value && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0d6efd" />
          <Text style={styles.loadingText}>Kayıtlar yükleniyor...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredSnags}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchSnags();
              }}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {searchQuery || selectedStatus !== 'all'
                  ? 'Filtrelere uygun kusur kaydı bulunamadı.'
                  : 'Henüz kayıtlı bir hasar/kusur kaydı yok.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('SnagDetail', { snagId: item.id })}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <View style={[styles.badge, { backgroundColor: getPriorityBadgeColor(item.priority) }]}>
                  <Text style={styles.badgeText}>{item.priority.toUpperCase()}</Text>
                </View>
              </View>

              <Text style={styles.cardDesc} numberOfLines={2}>
                {item.description}
              </Text>

              <View style={styles.divider} />

              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>📍 Konum:</Text>
                <Text style={styles.metaValue}>{item.locations?.title || 'Belirtilmedi'}</Text>
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>👷 Sorumlu:</Text>
                <Text style={styles.metaValue}>{item.assigned_user?.full_name || 'Atama Yok'}</Text>
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>📌 Durum:</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusBadgeColor(item.status) }]}>
                  <Text style={styles.statusBadgeText}>{item.status.toUpperCase()}</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Sağ Alttaki Ekle Butonu */}
      <TouchableOpacity
        style={styles.fabButton}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('CreateSnag')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f9' },
  searchContainer: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 },
  searchInput: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#e9ecef',
    alignItems: 'center',
  },
  tabButtonActive: { backgroundColor: '#0d6efd' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#495057' },
  tabTextActive: { color: '#ffffff', fontWeight: 'bold' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#6c757d', fontSize: 14 },
  listContent: { padding: 16, paddingBottom: 80 },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#6c757d', fontSize: 14, textAlign: 'center' },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#212529', flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  cardDesc: { fontSize: 14, color: '#495057', lineHeight: 20, marginBottom: 10 },
  divider: { height: 1, backgroundColor: '#e9ecef', marginVertical: 8 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  metaLabel: { fontSize: 13, color: '#6c757d', fontWeight: '500' },
  metaValue: { fontSize: 13, color: '#212529', fontWeight: '600' },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  statusBadgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  fabButton: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    backgroundColor: '#0d6efd',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#0d6efd',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  fabText: { color: '#ffffff', fontSize: 32, fontWeight: '300', marginTop: -2 },
});