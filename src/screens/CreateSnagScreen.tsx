import React, { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  TouchableWithoutFeedback,
  Image,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { RootStackParamList } from '../types/navigation';
import { SnagPriority } from '../types/database';
import { supabase } from '../lib/supabase';
import { pickOrTakePhoto, uploadImageToSupabase } from '../lib/storage';
import PhotoMarkupModal from '../components/PhotoMarkupModal';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateSnag'>;

interface UserOption {
  id: string;
  full_name: string;
  role: string;
  company_id?: string;
}

const PRIORITIES: { label: string; value: SnagPriority; color: string }[] = [
  { label: 'Düşük', value: 'low', color: '#0dcaf0' },
  { label: 'Orta', value: 'medium', color: '#fd7e14' },
  { label: 'Yüksek', value: 'high', color: '#dc3545' },
  { label: 'Kritik', value: 'critical', color: '#842029' },
];

const BLOK_LIST = ['A Blok', 'B Blok', 'C Blok', 'D Blok', 'E Blok', 'Ortak Alan'];
const KAT_LIST = ['Bodrum Kat', 'Zemin Kat', '1. Kat', '2. Kat', '3. Kat', '4. Kat', '5. Kat', '6. Kat', 'Çatı Katı'];
const DAIRE_LIST = Array.from({ length: 24 }, (_, i) => `Daire ${i + 1}`);

function getTurkishRole(role: string): string {
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

function normalizeText(text: string): string {
  return (text || '')
    .toLocaleLowerCase('tr-TR')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export default function CreateSnagScreen({ route, navigation }: Props) {
  const queryClient = useQueryClient();
  const editSnagId = route.params?.snagId;
  const isEditMode = Boolean(editSnagId);

  const [title, setTitle] = useState('');
  
  // Konum Ayrıştırma State'leri
  const [selectedBlok, setSelectedBlok] = useState<string>('A Blok');
  const [selectedKat, setSelectedKat] = useState<string>('1. Kat');
  const [selectedDaire, setSelectedDaire] = useState<string>('Daire 1');
  const [openDropdown, setOpenDropdown] = useState<'blok' | 'kat' | 'daire' | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);

  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<SnagPriority>('medium');

  // Fotoğraf ve Çizim State'leri
  const [selectedImage, setSelectedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [isMarkupVisible, setIsMarkupVisible] = useState(false);

  // Kullanıcı State'leri
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [userSearchText, setUserSearchText] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      title: isEditMode ? 'Kusur Kaydını Düzenle' : 'Yeni Kusur Bildirimi',
    });
    loadAllData();
  }, [isEditMode, editSnagId]);

  async function loadAllData() {
    setLoading(true);
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, full_name, role, company_id')
        .order('full_name', { ascending: true });

      if (userError) throw userError;
      const userList = (userData as UserOption[]) || [];
      setUsers(userList);

      if (editSnagId) {
        const { data: snag, error: snagErr } = await supabase
          .from('snags')
          .select('id, title, description, priority, location_id, assigned_to_user_id, image_url, locations(id, title)')
          .eq('id', editSnagId)
          .single();

        if (snagErr) {
          Alert.alert('Hata', 'Kusur detayları yüklenemedi.');
        } else if (snag) {
          setTitle(snag.title || '');
          setDescription(snag.description || '');
          setPriority((snag.priority as SnagPriority) || 'medium');
          setExistingImageUrl(snag.image_url || null);

          const loc = snag.locations as unknown as { id: string; title: string } | null;
          setLocationId(loc?.id || snag.location_id || null);

          if (loc?.title) {
            const parts = loc.title.split(' - ');
            if (parts[0]) setSelectedBlok(parts[0]);
            if (parts[1]) setSelectedKat(parts[1]);
            if (parts[2]) setSelectedDaire(parts[2]);
          }

          if (snag.assigned_to_user_id) {
            const foundUser = userList.find((u) => u.id === snag.assigned_to_user_id);
            if (foundUser) setSelectedUser(foundUser);
          }
        }
      } else {
        if (userList.length > 0) setSelectedUser(userList[0]);
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Hata', 'Veriler yüklenirken bir problem oluştu.');
    } finally {
      setLoading(false);
    }
  }

  const handleSelectPhoto = async (useCamera: boolean) => {
    const asset = await pickOrTakePhoto(useCamera);
    if (asset) {
      setSelectedImage(asset);
    }
  };

  const handleSaveAnnotatedImage = (annotatedBase64: string) => {
    if (selectedImage) {
      setSelectedImage({
        ...selectedImage,
        base64: annotatedBase64,
        uri: `data:image/jpeg;base64,${annotatedBase64}`,
      });
    } else {
      setSelectedImage({
        uri: `data:image/jpeg;base64,${annotatedBase64}`,
        base64: annotatedBase64,
        width: 800,
        height: 600,
      } as ImagePicker.ImagePickerAsset);
    }
    setIsMarkupVisible(false);
  };

  const filteredUsers = useMemo(() => {
    const query = normalizeText(userSearchText);
    if (!query) return users;
    return users.filter((u) => normalizeText(u.full_name).includes(query));
  }, [users, userSearchText]);

  async function handleSave() {
    if (!title.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen kusur başlığını yazınız.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen açıklama ve detayları giriniz.');
      return;
    }
    if (!selectedUser) {
      Alert.alert('Eksik Bilgi', 'Lütfen atanacak bir sorumlu seçiniz.');
      return;
    }

    const fullLocationTitle = `${selectedBlok} - ${selectedKat} - ${selectedDaire}`;

    setSaving(true);
    try {
      let finalImageUrl = existingImageUrl;
      if (selectedImage) {
        const uploadedUrl = await uploadImageToSupabase(selectedImage);
        if (uploadedUrl) {
          finalImageUrl = uploadedUrl;
        } else {
          Alert.alert('Uyarı', 'Fotoğraf yüklenemedi ancak kayıt işlemine devam ediliyor.');
        }
      }

      let finalLocationId = locationId;
      if (isEditMode && locationId) {
        await supabase
          .from('locations')
          .update({ title: fullLocationTitle })
          .eq('id', locationId);
      } else {
        const { data: locData } = await supabase
          .from('locations')
          .insert([
            {
              title: fullLocationTitle,
              company_id: selectedUser.company_id || '11111111-1111-1111-1111-111111111111',
            },
          ])
          .select()
          .single();

        if (locData) {
          finalLocationId = locData.id;
        }
      }

      if (isEditMode && editSnagId) {
        const { error } = await supabase
          .from('snags')
          .update({
            title: title.trim(),
            description: description.trim(),
            priority: priority,
            location_id: finalLocationId || undefined,
            assigned_to_user_id: selectedUser.id,
            image_url: finalImageUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editSnagId);

        if (error) {
          Alert.alert('Hata', error.message);
        } else {
          await queryClient.invalidateQueries({ queryKey: ['snags'] });
          await queryClient.invalidateQueries({ queryKey: ['snag', editSnagId] });
          Alert.alert('Başarılı', 'Kusur kaydı başarıyla güncellendi.', [
            { text: 'Tamam', onPress: () => navigation.goBack() },
          ]);
        }
      } else {
        const { error } = await supabase.from('snags').insert([
          {
            company_id: selectedUser.company_id || '11111111-1111-1111-1111-111111111111',
            location_id: finalLocationId || '55555555-5555-5555-5555-555555555555',
            title: title.trim(),
            description: description.trim(),
            priority: priority,
            status: 'open',
            assigned_to_user_id: selectedUser.id,
            image_url: finalImageUrl,
            created_by_user_id: '22222222-2222-2222-2222-222222222222',
          },
        ]);

        if (error) {
          Alert.alert('Hata', error.message);
        } else {
          await queryClient.invalidateQueries({ queryKey: ['snags'] });
          Alert.alert('Başarılı', 'Yeni hasar kaydı başarıyla oluşturuldu.', [
            { text: 'Tamam', onPress: () => navigation.goBack() },
          ]);
        }
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Hata', 'Kayıt sırasında bir problem oluştu.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0056b3" />
        <Text style={styles.loadingText}>Mevcut bilgiler getiriliyor...</Text>
      </View>
    );
  }

  const currentPreviewUri = selectedImage ? selectedImage.uri : existingImageUrl;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      nestedScrollEnabled={true}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.card}>
        <Text style={styles.label}>1. Kusur Başlığı *</Text>
        <TextInput
          style={styles.input}
          placeholder="Örn: Duvar Tesisat Su Sızıntısı"
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.label}>2. Konum / Alan *</Text>
        <View style={styles.locationSelectorsRow}>
          {/* Blok Seçimi */}
          <View style={styles.selectorCol}>
            <TouchableOpacity
              style={[styles.selectorBar, openDropdown === 'blok' && styles.selectorBarActive]}
              onPress={() => setOpenDropdown(openDropdown === 'blok' ? null : 'blok')}
            >
              <Text style={styles.selectorBarText} numberOfLines={1}>
                {selectedBlok}
              </Text>
              <Text style={styles.arrowIcon}>{openDropdown === 'blok' ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {openDropdown === 'blok' && (
              <View style={styles.inlineDropdownList}>
                <ScrollView style={styles.inlineScroll} nestedScrollEnabled={true}>
                  {BLOK_LIST.map((item) => (
                    <TouchableOpacity
                      key={item}
                      style={[styles.inlineItem, selectedBlok === item && styles.inlineItemActive]}
                      onPress={() => {
                        setSelectedBlok(item);
                        setOpenDropdown(null);
                      }}
                    >
                      <Text style={[styles.inlineItemText, selectedBlok === item && styles.inlineItemTextActive]}>
                        {item}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Kat Seçimi */}
          <View style={styles.selectorCol}>
            <TouchableOpacity
              style={[styles.selectorBar, openDropdown === 'kat' && styles.selectorBarActive]}
              onPress={() => setOpenDropdown(openDropdown === 'kat' ? null : 'kat')}
            >
              <Text style={styles.selectorBarText} numberOfLines={1}>
                {selectedKat}
              </Text>
              <Text style={styles.arrowIcon}>{openDropdown === 'kat' ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {openDropdown === 'kat' && (
              <View style={styles.inlineDropdownList}>
                <ScrollView style={styles.inlineScroll} nestedScrollEnabled={true}>
                  {KAT_LIST.map((item) => (
                    <TouchableOpacity
                      key={item}
                      style={[styles.inlineItem, selectedKat === item && styles.inlineItemActive]}
                      onPress={() => {
                        setSelectedKat(item);
                        setOpenDropdown(null);
                      }}
                    >
                      <Text style={[styles.inlineItemText, selectedKat === item && styles.inlineItemTextActive]}>
                        {item}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Daire Seçimi */}
          <View style={styles.selectorCol}>
            <TouchableOpacity
              style={[styles.selectorBar, openDropdown === 'daire' && styles.selectorBarActive]}
              onPress={() => setOpenDropdown(openDropdown === 'daire' ? null : 'daire')}
            >
              <Text style={styles.selectorBarText} numberOfLines={1}>
                {selectedDaire}
              </Text>
              <Text style={styles.arrowIcon}>{openDropdown === 'daire' ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {openDropdown === 'daire' && (
              <View style={styles.inlineDropdownList}>
                <ScrollView style={styles.inlineScroll} nestedScrollEnabled={true}>
                  {DAIRE_LIST.map((item) => (
                    <TouchableOpacity
                      key={item}
                      style={[styles.inlineItem, selectedDaire === item && styles.inlineItemActive]}
                      onPress={() => {
                        setSelectedDaire(item);
                        setOpenDropdown(null);
                      }}
                    >
                      <Text style={[styles.inlineItemText, selectedDaire === item && styles.inlineItemTextActive]}>
                        {item}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        </View>

        <Text style={styles.label}>3. Açıklama & Detaylar *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Hasar boyutunu ve yapılması gerekenleri yazın..."
          multiline
          numberOfLines={4}
          value={description}
          onChangeText={setDescription}
        />

        <Text style={styles.label}>4. Hasar Fotoğrafı</Text>
        <View style={styles.photoActionsRow}>
          <TouchableOpacity style={styles.photoBtn} onPress={() => handleSelectPhoto(true)}>
            <Text style={styles.photoBtnText}>📷 Fotoğraf Çek</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.photoBtn, styles.photoBtnSecondary]} onPress={() => handleSelectPhoto(false)}>
            <Text style={styles.photoBtnSecondaryText}>🖼️ Galeriden Seç</Text>
          </TouchableOpacity>
        </View>

        {currentPreviewUri && (
          <View style={styles.previewContainer}>
            <Image source={{ uri: currentPreviewUri }} style={styles.previewImage} />
            
            <TouchableOpacity
              style={styles.markupBtn}
              onPress={() => setIsMarkupVisible(true)}
            >
              <Text style={styles.markupBtnText}>✏️ Çizim Yap / İşaretle</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.removeImageBtn}
              onPress={() => {
                setSelectedImage(null);
                setExistingImageUrl(null);
              }}
            >
              <Text style={styles.removeImageText}>✕ Kaldır</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.label}>5. Öncelik / Aciliyet Seviyesi</Text>
        <View style={styles.priorityGrid}>
          {PRIORITIES.map((p) => {
            const isSelected = priority === p.value;
            return (
              <TouchableOpacity
                key={p.value}
                style={[
                  styles.priorityBtn,
                  isSelected && { backgroundColor: p.color, borderColor: p.color },
                ]}
                onPress={() => setPriority(p.value)}
              >
                <Text style={[styles.priorityText, isSelected && styles.priorityTextActive]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>6. Atanacak Sorumlu Kişi / Taşeron *</Text>
        <TouchableOpacity
          style={styles.dropdownBtn}
          onPress={() => {
            setUserSearchText('');
            setUserModalVisible(true);
          }}
        >
          <View style={styles.dropdownContent}>
            <View style={{ flex: 1 }}>
              <Text style={styles.dropdownSelectedName}>
                {selectedUser ? selectedUser.full_name : 'Sorumlu Seçiniz'}
              </Text>
              {selectedUser && (
                <Text style={styles.dropdownSelectedRole}>
                  Görevi: {getTurkishRole(selectedUser.role)}
                </Text>
              )}
            </View>
            <Text style={styles.dropdownArrow}>▼</Text>
          </View>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.submitBtn, saving && styles.submitBtnDisabled]}
        disabled={saving}
        onPress={handleSave}
      >
        {saving ? (
          <View style={styles.savingRow}>
            <ActivityIndicator color="#ffffff" />
            <Text style={styles.savingText}>Buluta Yükleniyor ve Kaydediliyor...</Text>
          </View>
        ) : (
          <Text style={styles.submitBtnText}>
            {isEditMode ? 'Değişiklikleri Güncelle' : 'Kaydı Kaydet ve Gönder'}
          </Text>
        )}
      </TouchableOpacity>

      {/* Fotoğraf Üzeri Çizim Modalı */}
      <PhotoMarkupModal
        visible={isMarkupVisible}
        imageBase64={selectedImage?.base64}
        imageUri={currentPreviewUri}
        onClose={() => setIsMarkupVisible(false)}
        onSave={handleSaveAnnotatedImage}
      />

      {/* Sorumlu Seçim Modal Penceresi */}
      <Modal
        visible={userModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setUserModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setUserModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.modalContainer}>
                <Text style={styles.modalTitle}>👷 Sorumlu Personel Seçiniz</Text>

                <TextInput
                  style={styles.modalSearchInput}
                  placeholder="🔍 Personel ismi ara..."
                  value={userSearchText}
                  onChangeText={setUserSearchText}
                  autoCorrect={false}
                  autoCapitalize="none"
                />

                <FlatList
                  data={filteredUsers}
                  keyExtractor={(item) => item.id}
                  keyboardShouldPersistTaps="always"
                  ItemSeparatorComponent={() => <View style={styles.modalDivider} />}
                  ListEmptyComponent={
                    <Text style={styles.emptyListText}>
                      "{userSearchText}" isminde personel bulunamadı.
                    </Text>
                  }
                  renderItem={({ item }) => {
                    const isSelected = selectedUser?.id === item.id;
                    return (
                      <TouchableOpacity
                        style={[styles.userItem, isSelected && styles.userItemSelected]}
                        onPress={() => {
                          setSelectedUser(item);
                          setUserModalVisible(false);
                        }}
                      >
                        <View>
                          <Text style={[styles.userName, isSelected && styles.userNameActive]}>
                            {item.full_name}
                          </Text>
                          <Text style={styles.userRole}>
                            Görevi: {getTurkishRole(item.role)}
                          </Text>
                        </View>
                        {isSelected && <Text style={styles.checkMark}>✓</Text>}
                      </TouchableOpacity>
                    );
                  }}
                />

                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setUserModalVisible(false)}
                >
                  <Text style={styles.modalCloseText}>Vazgeç / Kapat</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f9' },
  content: { padding: 16, paddingBottom: 40 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#6c757d', fontSize: 14 },
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
  label: { fontSize: 14, fontWeight: '700', color: '#343a40', marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#dee2e6',
    fontSize: 15,
    color: '#212529',
  },
  locationSelectorsRow: { flexDirection: 'row', gap: 8, zIndex: 10 },
  selectorCol: { flex: 1, position: 'relative' },
  selectorBar: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#ced4da',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectorBarActive: { borderColor: '#0056b3', backgroundColor: '#e7f1ff' },
  selectorBarText: { fontSize: 12, fontWeight: '700', color: '#212529', flex: 1 },
  arrowIcon: { fontSize: 10, color: '#6c757d', marginLeft: 4 },
  inlineDropdownList: {
    marginTop: 4,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ced4da',
    maxHeight: 140,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  inlineScroll: { paddingVertical: 4 },
  inlineItem: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f5',
  },
  inlineItemActive: { backgroundColor: '#e7f1ff' },
  inlineItemText: { fontSize: 12, color: '#343a40', fontWeight: '500' },
  inlineItemTextActive: { color: '#0056b3', fontWeight: 'bold' },
  textArea: { height: 80, textAlignVertical: 'top' },
  photoActionsRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  photoBtn: {
    flex: 1,
    backgroundColor: '#0056b3',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  photoBtnText: { color: '#ffffff', fontSize: 13, fontWeight: 'bold' },
  photoBtnSecondary: { backgroundColor: '#e9ecef' },
  photoBtnSecondaryText: { color: '#343a40', fontSize: 13, fontWeight: 'bold' },
  previewContainer: { marginTop: 12, position: 'relative', alignItems: 'center' },
  previewImage: { width: '100%', height: 180, borderRadius: 10, resizeMode: 'cover' },
  markupBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 86, 179, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  markupBtnText: { color: '#ffffff', fontSize: 12, fontWeight: 'bold' },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(220, 53, 69, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  removeImageText: { color: '#ffffff', fontSize: 12, fontWeight: 'bold' },
  priorityGrid: { flexDirection: 'row', gap: 8, marginTop: 4 },
  priorityBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#f1f3f5',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  priorityText: { fontSize: 12, fontWeight: '600', color: '#495057' },
  priorityTextActive: { color: '#ffffff', fontWeight: 'bold' },
  dropdownBtn: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
  },
  dropdownContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dropdownSelectedName: { fontSize: 15, fontWeight: 'bold', color: '#212529' },
  dropdownSelectedRole: { fontSize: 12, color: '#6c757d', marginTop: 2 },
  dropdownArrow: { fontSize: 12, color: '#6c757d', marginLeft: 8 },
  submitBtn: {
    backgroundColor: '#0056b3',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    elevation: 3,
  },
  submitBtnDisabled: { backgroundColor: '#6c757d' },
  submitBtnText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  savingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  savingText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: { backgroundColor: '#ffffff', borderRadius: 14, width: '100%', maxHeight: '75%', padding: 18 },
  modalTitle: { fontSize: 17, fontWeight: 'bold', color: '#212529', marginBottom: 12, textAlign: 'center' },
  modalSearchInput: {
    backgroundColor: '#f1f3f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  emptyListText: { textAlign: 'center', color: '#6c757d', paddingVertical: 20, fontSize: 13 },
  userItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8, borderRadius: 8 },
  userItemSelected: { backgroundColor: '#e7f1ff' },
  userName: { fontSize: 15, fontWeight: '600', color: '#212529' },
  userNameActive: { color: '#0056b3', fontWeight: 'bold' },
  userRole: { fontSize: 12, color: '#6c757d' },
  checkMark: { fontSize: 16, color: '#0056b3', fontWeight: 'bold' },
  modalDivider: { height: 1, backgroundColor: '#f1f3f5' },
  modalCloseBtn: { marginTop: 14, backgroundColor: '#f8f9fa', paddingVertical: 12, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#dee2e6' },
  modalCloseText: { fontSize: 14, fontWeight: 'bold', color: '#495057' },
});