import React, { useMemo, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  ScrollView,
  BackHandler,
  Keyboard,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { Snag, SnagStatus } from '../types/database';
import { supabase } from '../lib/supabase';
import { useSnagStore } from '../store/useSnagStore';
import { useSyncEngine } from '../hooks/useSyncEngine';

type Props = NativeStackScreenProps<RootStackParamList, 'SnagList'>;

const STATUS_TABS: { label: string; value: SnagStatus | 'all' }[] = [
  { label: 'Tümü', value: 'all' },
  { label: 'Açık', value: 'open' },
  { label: 'İşlemde', value: 'in_progress' },
  { label: 'Çözüldü', value: 'resolved' },
  { label: 'Onaylandı', value: 'approved' },
];

async function fetchSnags(): Promise<Snag[]> {
  const { data, error } = await supabase
    .from('snags')
    .select(`
      id,
      company_id,
      location_id,
      title,
      description,
      status,
      priority,
      assigned_to_user_id,
      created_by_user_id,
      image_url,
      signature_url,
      created_at,
      updated_at,
      locations(title),
      assigned_user:users!snags_assigned_to_user_id_fkey(full_name, role)
    `)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data as unknown as Snag[]) || [];
}


export default function SnagListScreen({ navigation }: Props) {
   useSyncEngine();
  const { searchQuery, selectedStatus, setSearchQuery, setSelectedStatus } = useSnagStore();
  const searchInputRef = useRef<TextInput>(null);
  const isKeyboardVisibleRef = useRef(false);

  const { data: snags = [], isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['snags'],
    queryFn: fetchSnags,
  });
 

  // Klavye görünürlük durumunu anlık takip etme
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => {
      isKeyboardVisibleRef.current = true;
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      isKeyboardVisibleRef.current = false;
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Geri tuşu (BackHandler) akıllı yönetimi
  useEffect(() => {
    const onBackPress = () => {
      // 1. Durum: Klavye açıksa ilk basışta sadece klavyeyi kapat ve odağı kaldır
      if (isKeyboardVisibleRef.current || searchInputRef.current?.isFocused()) {
        Keyboard.dismiss();
        searchInputRef.current?.blur();
        return true; // Uygulamadan çıkışı engelle
      }

      // 2. Durum: Arama kutusunda metin varsa ikinci basışta aramayı sıfırla
      if (searchQuery.trim() !== '') {
        setSearchQuery('');
        return true; // Uygulamadan çıkışı engelle
      }

      // 3. Durum: Ana ekranda kal, çıkışı engelle
      return true;
    };

    const backHandlerSubscription = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress
    );

    return () => backHandlerSubscription.remove();
  }, [searchQuery, setSearchQuery]);

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
      case 'approved':
        return '#0f5132';
      case 'resolved':
        return '#198754';
      case 'in_progress':
        return '#0056b3';
      default:
        return '#6c757d';
    }
  };

  const getTurkishStatus = (status: string) => {
    switch (status) {
      case 'open':
        return 'AÇIK';
      case 'in_progress':
        return 'İŞLEMDE';
      case 'resolved':
        return 'ÇÖZÜLDÜ';
      case 'approved':
        return 'ONAYLANDI';
      default:
        return (status || '').toUpperCase();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          ref={searchInputRef}
          style={styles.searchInput}
          placeholder="🔍 Kusur, açıklama veya konum ara..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.tabWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScrollContent}
        >
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
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0056b3" />
          <Text style={styles.loadingText}>Veriler yükleniyor...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredSnags}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={['#0056b3']}
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
          renderItem={({ item }) => {
            const canEdit = item.status === 'open' || item.status === 'in_progress';

            return (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('SnagDetail', { snagId: item.id })}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <View style={[styles.badge, { backgroundColor: getPriorityBadgeColor(item.priority) }]}>
                    <Text style={styles.badgeText}>{item.priority?.toUpperCase()}</Text>
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
                  <Text style={styles.metaValue}>
                    {item.assigned_user?.full_name || 'Atama Yok'}
                  </Text>
                </View>

                <View style={styles.footerRow}>
                  <View style={styles.statusWrapper}>
                    <Text style={styles.metaLabel}>📌 Durum: </Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusBadgeColor(item.status) }]}>
                      <Text style={styles.statusBadgeText}>{getTurkishStatus(item.status)}</Text>
                    </View>
                  </View>

                  {canEdit && (
                    <TouchableOpacity
                      style={styles.editBtn}
                      activeOpacity={0.8}
                      onPress={() => {
                        navigation.navigate('CreateSnag', { snagId: item.id });
                      }}
                    >
                      <Text style={styles.editBtnText}>✏️ Düzenle</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <TouchableOpacity
        style={styles.fabButton}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('CreateSnag', undefined)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6f9',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  searchInput: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  tabWrapper: {
    paddingVertical: 8,
  },
  tabScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#e9ecef',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#0056b3',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#495057',
  },
  tabTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#6c757d',
    fontSize: 14,
  },
  listContent: {
    padding: 16,
    paddingBottom: 90,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#6c757d',
    fontSize: 14,
    textAlign: 'center',
  },
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212529',
    flex: 1,
    marginRight: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  cardDesc: {
    fontSize: 14,
    color: '#495057',
    lineHeight: 20,
    marginBottom: 10,
  },
  divider: {
    height: 1,
    backgroundColor: '#e9ecef',
    marginVertical: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  metaLabel: {
    fontSize: 13,
    color: '#6c757d',
    fontWeight: '500',
  },
  metaValue: {
    fontSize: 13,
    color: '#212529',
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f3f5',
  },
  statusWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  editBtn: {
    backgroundColor: '#e7f1ff',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#b6d4fe',
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0056b3',
  },
  fabButton: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    backgroundColor: '#0056b3',
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#0056b3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  fabText: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '300',
    marginTop: -3,
  },
});