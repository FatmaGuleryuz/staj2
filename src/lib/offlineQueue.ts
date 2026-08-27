import AsyncStorage from '@react-native-async-storage/async-storage';

const OFFLINE_KEY = '@snag_offline_queue';

export interface OfflineSnag {
  id: string;
  payload: any;
  created_at: string;
}

export async function saveSnagOffline(payload: any): Promise<void> {
  try {
    const existing = await AsyncStorage.getItem(OFFLINE_KEY);
    const queue: OfflineSnag[] = existing ? JSON.parse(existing) : [];
    
    const newEntry: OfflineSnag = {
      id: `offline-${Date.now()}`,
      payload,
      created_at: new Date().toISOString(),
    };
    
    queue.push(newEntry);
    await AsyncStorage.setItem(OFFLINE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.error('Offline kayıt hatası:', err);
  }
}

export async function getOfflineQueue(): Promise<OfflineSnag[]> {
  try {
    const existing = await AsyncStorage.getItem(OFFLINE_KEY);
    return existing ? JSON.parse(existing) : [];
  } catch {
    return [];
  }
}

export async function clearOfflineQueue(): Promise<void> {
  try {
    await AsyncStorage.removeItem(OFFLINE_KEY);
  } catch (err) {
    console.error('Kuyruk temizleme hatası:', err);
  }
}