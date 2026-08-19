import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { Snag, SnagStatus } from '../types/database';
import { supabase } from '../lib/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'SnagDetail'>;

export default function SnagDetailScreen({ route, navigation }: Props) {
  const { snagId } = route.params;
  const [snag, setSnag] = useState<Snag | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [updating, setUpdating] = useState<boolean>(false);

  useEffect(() => {
    fetchDetail();
  }, [snagId]);

  async function fetchDetail() {
    try {
      const { data, error } = await supabase
        .from('snags')
        .select(`
          id,
          title,
          description,
          status,
          priority,
          created_at,
          updated_at,
          locations ( title ),
          users!snags_assigned_to_user_id_fkey ( full_name, role )
        `)
        .eq('id', snagId)
        .single();

      if (error) {
        Alert.alert('Hata', 'Kayıt detayları bulunamadı.');
        navigation.goBack();
      } else {
        setSnag(data as unknown as Snag);
      }
    } catch (err) {
      console.error('Detay çekme hatası:', err);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(newStatus: SnagStatus) {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('snags')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', snagId);

      if (error) {
        Alert.alert('Güncelleme Hatası', error.message);
      } else {
        Alert.alert('Başarılı', `Kusur durumu "${newStatus.toUpperCase()}" olarak güncellendi.`);
        setSnag((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch (err) {
      console.error('Durum güncelleme hatası:', err);
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0d6efd" />
        <Text style={styles.loadingText}>Detaylar Supabase'den alınıyor...</Text>
      </View>
    );
  }

  if (!snag) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>{snag.title}</Text>
        <Text style={styles.description}>{snag.description}</Text>

        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.label}>Aciliyet Seviyesi:</Text>
          <Text style={[styles.value, styles.priorityText]}>
            {snag.priority?.toUpperCase()}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Şantiye Konumu:</Text>
          <Text style={styles.value}>
            {snag.locations?.title || 'Belirtilmedi'}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Görevli Taşeron / Sorumlu:</Text>
          <Text style={styles.value}>
            {snag.assigned_user?.full_name || 'Atama Yapılmadı'}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Mevcut Durum:</Text>
          <Text style={[styles.value, styles.statusText]}>
            {snag.status?.toUpperCase()}
          </Text>
        </View>
      </View>

      <Text style={styles.sectionHeader}>📌 Durumu Değiştir</Text>

      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.btnBlue]}
          disabled={updating}
          onPress={() => updateStatus('in_progress')}
        >
          {updating ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.actionBtnText}>İşleme Al (In Progress)</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.btnGreen]}
          disabled={updating}
          onPress={() => updateStatus('resolved')}
        >
          {updating ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.actionBtnText}>Çözüldü Olarak İşaretle (Resolved)</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.btnGray]}
          disabled={updating}
          onPress={() => updateStatus('open')}
        >
          {updating ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.actionBtnText}>Tekrar Aç (Open)</Text>
          )}
        </TouchableOpacity>
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
    marginTop: 12,
    color: '#6c757d',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 18,
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: '#495057',
    lineHeight: 22,
  },
  divider: {
    height: 1,
    backgroundColor: '#e9ecef',
    marginVertical: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    color: '#212529',
    fontWeight: '600',
  },
  priorityText: {
    color: '#dc3545',
    fontWeight: 'bold',
  },
  statusText: {
    color: '#0d6efd',
    fontWeight: 'bold',
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#495057',
    marginTop: 24,
    marginBottom: 12,
  },
  actionsContainer: {
    gap: 10,
  },
  actionBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 2,
  },
  btnBlue: {
    backgroundColor: '#0d6efd',
  },
  btnGreen: {
    backgroundColor: '#198754',
  },
  btnGray: {
    backgroundColor: '#6c757d',
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
});