import React, { useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';

interface Props {
  visible: boolean;
  imageUri: string | null;
  onClose: () => void;
  onSave: (annotatedBase64: string) => void;
}

export default function PhotoMarkupModal({ visible, imageUri, onClose, onSave }: Props) {
  const webViewRef = useRef<WebView>(null);

  if (!visible || !imageUri) return null;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body, html { width: 100%; height: 100%; overflow: hidden; background-color: #000; }
          #container { position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
          canvas { position: absolute; touch-action: none; }
        </style>
      </head>
      <body>
        <div id="container">
          <canvas id="paintCanvas"></canvas>
        </div>
        <script>
          const canvas = document.getElementById('paintCanvas');
          const ctx = canvas.getContext('2d');
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = "${imageUri}";

          let isDrawing = false;

          img.onload = () => {
            const containerW = window.innerWidth;
            const containerH = window.innerHeight;
            
            const scale = Math.min(containerW / img.width, containerH / img.height);
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;

            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = '#dc3545'; // Kırmızı İşaret Kalemi
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
          };

          function getPos(e) {
            const rect = canvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            return {
              x: clientX - rect.left,
              y: clientY - rect.top
            };
          }

          canvas.addEventListener('touchstart', (e) => {
            isDrawing = true;
            const pos = getPos(e);
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
            e.preventDefault();
          });

          canvas.addEventListener('touchmove', (e) => {
            if (!isDrawing) return;
            const pos = getPos(e);
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
            e.preventDefault();
          });

          canvas.addEventListener('touchend', () => {
            isDrawing = false;
          });

          // React Native'den mesaj dinle (Kaydet / Sıfırla)
          window.addEventListener('message', (e) => {
            if (e.data === 'SAVE') {
              const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
              const base64 = dataUrl.split(',')[1];
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SAVE', base64: base64 }));
            } else if (e.data === 'CLEAR') {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            }
          });
        </script>
      </body>
    </html>
  `;

  const handleMessage = (event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'SAVE' && msg.base64) {
        onSave(msg.base64);
      }
    } catch (err) {
      console.error('Canvas Mesaj Hatası:', err);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>✕ Kapat</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>✏️ Hasarı Çiz / İşaretle</Text>
          <TouchableOpacity
            onPress={() => webViewRef.current?.postMessage('CLEAR')}
            style={styles.headerBtn}
          >
            <Text style={styles.clearBtnText}>Sıfırla</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.canvasWrapper}>
          <WebView
            ref={webViewRef}
            originWhitelist={['*']}
            source={{ html: htmlContent }}
            style={styles.webView}
            scrollEnabled={false}
            onMessage={handleMessage}
            renderLoading={() => <ActivityIndicator size="large" color="#ffffff" />}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.hintText}>Parmağınızla hasarlı bölgeyi daire içine alınız.</Text>
          <TouchableOpacity
            style={styles.confirmBtn}
            onPress={() => webViewRef.current?.postMessage('SAVE')}
          >
            <Text style={styles.confirmBtnText}>✓ Çizimi Onayla ve Kullan</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1e1e1e',
  },
  headerTitle: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  headerBtn: { padding: 6 },
  headerBtnText: { color: '#adb5bd', fontSize: 14, fontWeight: '600' },
  clearBtnText: { color: '#fd7e14', fontSize: 14, fontWeight: 'bold' },
  canvasWrapper: { flex: 1, backgroundColor: '#000000' },
  webView: { flex: 1, backgroundColor: 'transparent' },
  footer: {
    padding: 16,
    backgroundColor: '#1e1e1e',
    alignItems: 'center',
    gap: 10,
  },
  hintText: { color: '#adb5bd', fontSize: 12 },
  confirmBtn: {
    backgroundColor: '#198754',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmBtnText: { color: '#ffffff', fontSize: 15, fontWeight: 'bold' },
});