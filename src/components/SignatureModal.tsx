import React, { useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  SafeAreaView,
} from 'react-native';
import { WebView } from 'react-native-webview';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (signatureBase64: string) => void;
}

export default function SignatureModal({ visible, onClose, onSave }: Props) {
  const webViewRef = useRef<WebView>(null);

  if (!visible) return null;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body, html { width: 100vw; height: 100vh; overflow: hidden; background-color: #f8f9fa; display: flex; flex-direction: column; }
          #canvasContainer { flex: 1; position: relative; width: 100%; height: 100%; }
          canvas { width: 100%; height: 100%; touch-action: none; background-color: #ffffff; }
        </style>
      </head>
      <body>
        <div id="canvasContainer">
          <canvas id="signCanvas"></canvas>
        </div>
        <script>
          const canvas = document.getElementById('signCanvas');
          const ctx = canvas.getContext('2d');
          let isDrawing = false;

          function resize() {
            canvas.width = canvas.parentElement.clientWidth;
            canvas.height = canvas.parentElement.clientHeight;
            ctx.strokeStyle = '#002b5c';
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
          }
          window.onload = resize;

          function getPos(e) {
            const rect = canvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            return { x: clientX - rect.left, y: clientY - rect.top };
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

          canvas.addEventListener('touchend', () => { isDrawing = false; });

          window.clearSignature = function() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          };

          window.saveSignature = function() {
            const dataUrl = canvas.toDataURL('image/png');
            const base64 = dataUrl.split(',')[1];
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SAVE_SIGN', base64: base64 }));
            }
          };
        </script>
      </body>
    </html>
  `;

  const handleMessage = (event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'SAVE_SIGN' && msg.base64) {
        onSave(msg.base64);
      }
    } catch (err) {
      console.error('İmza Hatası:', err);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>✕ Kapat</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>✍️ Dijital Onay İmzası</Text>
          <TouchableOpacity
            onPress={() => webViewRef.current?.injectJavaScript('window.clearSignature(); true;')}
            style={styles.headerBtn}
          >
            <Text style={styles.clearBtnText}>Temizle</Text>
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
            javaScriptEnabled={true}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.hintText}>Lütfen kutu içine yetkili imzanızı atınız.</Text>
          <TouchableOpacity
            style={styles.confirmBtn}
            onPress={() => webViewRef.current?.injectJavaScript('window.saveSignature(); true;')}
          >
            <Text style={styles.confirmBtnText}>✓ İmzayı Onayla ve Kaydet</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
  },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#212529' },
  headerBtn: { padding: 6 },
  headerBtnText: { color: '#6c757d', fontSize: 14, fontWeight: '600' },
  clearBtnText: { color: '#dc3545', fontSize: 14, fontWeight: 'bold' },
  canvasWrapper: { flex: 1, margin: 16, borderRadius: 12, borderWidth: 2, borderColor: '#ced4da', borderStyle: 'dashed', overflow: 'hidden' },
  webView: { flex: 1 },
  footer: { padding: 16, backgroundColor: '#ffffff', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: '#dee2e6' },
  hintText: { color: '#6c757d', fontSize: 13 },
  confirmBtn: { backgroundColor: '#198754', width: '100%', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  confirmBtnText: { color: '#ffffff', fontSize: 15, fontWeight: 'bold' },
});