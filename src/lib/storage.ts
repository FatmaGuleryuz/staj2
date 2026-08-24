import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';

export async function pickOrTakePhoto(useCamera: boolean = false): Promise<ImagePicker.ImagePickerAsset | null> {
  if (useCamera) {
    const cameraPerm = await ImagePicker.requestCameraPermissionsAsync();
    if (!cameraPerm.granted) {
      alert('Kamera izni gereklidir.');
      return null;
    }
  } else {
    const libraryPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!libraryPerm.granted) {
      alert('Galeri izni gereklidir.');
      return null;
    }
  }

  const result = useCamera
    ? await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
        base64: true,
      })
    : await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
        base64: true,
      });

  if (!result.canceled && result.assets && result.assets.length > 0) {
    return result.assets[0];
  }
  return null;
}

export async function uploadImageToSupabase(asset: ImagePicker.ImagePickerAsset): Promise<string | null> {
  try {
    if (!asset.base64) throw new Error('Resim verisi (base64) okunamadı.');

    const fileExt = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `snags/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('snag-images')
      .upload(filePath, decode(asset.base64), {
        contentType: `image/${fileExt === 'png' ? 'png' : 'jpeg'}`,
      });

    if (uploadError) {
      console.error('Storage Upload Error:', uploadError.message);
      return null;
    }

    const { data } = supabase.storage.from('snag-images').getPublicUrl(filePath);
    return data.publicUrl;
  } catch (err) {
    console.error('Fotoğraf yükleme hatası:', err);
    return null;
  }
}