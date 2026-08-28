import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { getOfflineQueue, clearOfflineQueue } from '../lib/offlineQueue';

export function useSyncEngine() {
  const queryClient = useQueryClient();
  const isSyncingRef = useRef(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(async (state) => {
      const isOnline = Boolean(state.isConnected && state.isInternetReachable !== false);

      if (isOnline && !isSyncingRef.current) {
        await processSyncQueue();
      }
    });

    return () => unsubscribe();
  }, []);

  async function processSyncQueue() {
    try {
      const queue = await getOfflineQueue();
      if (!queue || queue.length === 0) return;

      isSyncingRef.current = true;
      let syncCount = 0;

      for (const item of queue) {
        const payload = item.payload;

        // 1. Lokasyon kaydı
        let locationId = '55555555-5555-5555-5555-555555555555';
        if (payload.location_title) {
          const { data: locData } = await supabase
            .from('locations')
            .insert([{ title: payload.location_title, company_id: payload.company_id }])
            .select()
            .single();

          if (locData) locationId = locData.id;
        }

        // 2. Snag (Kusur) kaydı
        const { error } = await supabase.from('snags').insert([
          {
            company_id: payload.company_id,
            location_id: locationId,
            title: payload.title,
            description: payload.description,
            priority: payload.priority,
            status: payload.status || 'open',
            assigned_to_user_id: payload.assigned_to_user_id,
            created_by_user_id: payload.created_by_user_id,
          },
        ]);

        if (!error) {
          syncCount++;
        }
      }

      // Kuyruğu temizle ve listeyi tazele
      await clearOfflineQueue();
      await queryClient.invalidateQueries({ queryKey: ['snags'] });

      if (syncCount > 0) {
        Alert.alert(
          'Senkronizasyon Tamamlandı',
          `İnternet bağlantısı sağlandı. Çevrimdışı kaydedilen ${syncCount} adet kusur kaydı buluta başarıyla aktarıldı.`
        );
      }
    } catch (err) {
      console.error('Senkronizasyon hatası:', err);
    } finally {
      isSyncingRef.current = false;
    }
  }
}