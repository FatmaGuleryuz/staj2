import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { Snag, SnagStatus } from '../types/database';
import { supabase } from '../lib/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'SnagDetail'>;

function getTurkishRole(role?: string): string {
  switch (role?.toLowerCase()) {
    case 'admin':
      return 'Sistem Yöneticisi';
    case 'manager':
      return 'Şantiye Şefi / Proje Müdürü';
    case 'engineer':
      return 'Saha Kontrol Mühendisi';
    case 'subcontractor':
      return 'Taşeron Firma / Usta Başı';
    default:
      return 'Saha Görevlisi';
  }
}

function getTurkishStatus(status?: string): string {
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
}

async function fetchSnagDetail(snagId: string): Promise<Snag> {
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
    .eq('id', snagId)
    .single();

  if (error) throw new Error(error.message);
  return data as unknown as Snag;
}

export default function SnagDetailScreen({ route }: Props) {
  const { snagId } = route.params;
  const queryClient = useQueryClient();

  const { data: snag, isLoading, isError } = useQuery({
    queryKey: ['snag', snagId],
    queryFn: () => fetchSnagDetail(snagId),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: SnagStatus) => {
      const { error } = await supabase
        .from('snags')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', snagId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['snag', snagId] });
      queryClient.invalidateQueries({ queryKey: ['snags'] });
      Alert.alert('Başarılı', 'Kusur durumu güncellendi.');
    },
    onError: (err: any) => {
      Alert.alert('Hata', err.message || 'Durum güncellenirken bir sorun oluştu.');
    },
  });

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0056b3" />
        <Text style={styles.loadingText}>Detaylar yükleniyor...</Text>
      </View>
    );
  }

  if (isError || !snag) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Kusur detayları yüklenemedi.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{snag.title}</Text>
          <View style={[styles.badge, styles[`badge_${snag.priority}`]]}>
            <Text style={styles.badgeText}>{snag.priority?.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.statusContainer}>
          <Text style={styles.statusLabel}>Mevcut Durum:</Text>
          <View style={[styles.statusBadge, styles[`statusBadge_${snag.status}`]]}>
            <Text style={styles.statusBadgeText}>{getTurkishStatus(snag.status)}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <Text style={styles.sectionHeading}>Açıklama & Detaylar</Text>
        <Text style={styles.descriptionText}>{snag.description}</Text>

        <View style={styles.divider} />

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>📍 Konum:</Text>
          <Text style={styles.metaValue}>{snag.locations?.title || 'Belirtilmedi'}</Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>👷 Atanan Sorumlu:</Text>
          <Text style={styles.metaValue}>
            {snag.assigned_user?.full_name || 'Atama Yapılmadı'}
          </Text>
        </View>

        {snag.assigned_user?.role && (
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>💼 Sorumlu Görevi:</Text>
            <Text style={styles.metaValue}>{getTurkishRole(snag.assigned_user.role)}</Text>
          </View>
        )}

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>🕒 Kayıt Tarihi:</Text>
          <Text style={styles.metaValue}>
            {new Date(snag.created_at).toLocaleDateString('tr-TR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>

      {/* Durum Yönetim Butonları */}
      <View style={styles.actionCard}>
        <Text style={styles.sectionHeading}>Durum Yönetimi</Text>
        <View style={styles.actionButtonsRow}>
          {snag.status === 'open' && (
            <TouchableOpacity
              style={[styles.btn, styles.btnProgress]}
              onPress={() => updateStatusMutation.mutate('in_progress')}
            >
              <Text style={styles.btnText}>İşleme Al</Text>
            </TouchableOpacity>
          )}

          {snag.status === 'in_progress' && (
            <TouchableOpacity
              style={[styles.btn, styles.btnResolve]}
              onPress={() => updateStatusMutation.mutate('resolved')}
            >
              <Text style={styles.btnText}>Kusuru Çözüldü Yap</Text>
            </TouchableOpacity>
          )}

          {snag.status === 'resolved' && (
            <TouchableOpacity
              style={[styles.btn, styles.btnApprove]}
              onPress={() => updateStatusMutation.mutate('approved')}
            >
              <Text style={styles.btnText}>Kusuru Onayla & Kapat</Text>
            </TouchableOpacity>
          )}

          {snag.status === 'approved' && (
            <View style={styles.approvedInfo}>
              <Text style={styles.approvedText}>✓ Bu kusur onaylanmış ve kapatılmıştır.</Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6f9',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#6c757d',
    fontSize: 14,
  },
  errorText: {
    color: '#dc3545',
    fontSize: 15,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 18,
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
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
  badge_critical: { backgroundColor: '#842029' },
  badge_high: { backgroundColor: '#dc3545' },
  badge_medium: { backgroundColor: '#fd7e14' },
  badge_low: { backgroundColor: '#0dcaf0' },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6c757d',
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusBadge_open: { backgroundColor: '#6c757d' },
  statusBadge_in_progress: { backgroundColor: '#0056b3' },
  statusBadge_resolved: { backgroundColor: '#198754' },
  statusBadge_approved: { backgroundColor: '#0f5132' },
  divider: {
    height: 1,
    backgroundColor: '#f1f3f5',
    marginVertical: 14,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#495057',
    marginBottom: 6,
  },
  descriptionText: {
    fontSize: 15,
    color: '#343a40',
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metaLabel: {
    fontSize: 13,
    color: '#6c757d',
    fontWeight: '600',
  },
  metaValue: {
    fontSize: 13,
    color: '#212529',
    fontWeight: 'bold',
    flexShrink: 1,
    textAlign: 'right',
  },
  actionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginTop: 14,
    elevation: 3,
  },
  actionButtonsRow: {
    marginTop: 8,
    gap: 8,
  },
  btn: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnProgress: { backgroundColor: '#0056b3' },
  btnResolve: { backgroundColor: '#198754' },
  btnApprove: { backgroundColor: '#0f5132' },
  btnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  approvedInfo: {
    paddingVertical: 10,
    backgroundColor: '#d1e7dd',
    borderRadius: 8,
    alignItems: 'center',
  },
  approvedText: {
    color: '#0f5132',
    fontWeight: 'bold',
    fontSize: 14,
  },
});