import { StyleSheet } from 'react-native';

// 簡易的な Tailwind風ユーティリティマッピング
const utils = StyleSheet.create({
  'flex-1': { flex: 1 },
  'items-center': { alignItems: 'center' },
  'justify-center': { justifyContent: 'center' },
  'p-4': { padding: 16 },
  'bg-white': { backgroundColor: '#FFFFFF' },
});

export default function tw(classNames: string): any {
  const keys = classNames.split(/\s+/).filter(Boolean);
  return keys.map(k => (utils as any)[k]).filter(Boolean);
}
