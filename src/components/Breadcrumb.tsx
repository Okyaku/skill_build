import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';

interface BreadcrumbProps {
  path: string[];
  onNavigate: (index: number) => void;
}

export default function Breadcrumb({ path, onNavigate }: BreadcrumbProps): React.ReactElement {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {path.map((segment, index) => (
        <View key={index} style={styles.item}>
          <Pressable
            onPress={() => onNavigate(index)}
            accessibilityLabel={`${segment}に移動`}
          >
            <Text
              style={[
                styles.text,
                index === path.length - 1 ? styles.textActive : styles.textInactive
              ]}
              numberOfLines={1}
            >
              {segment}
            </Text>
          </Pressable>
          {index < path.length - 1 && (
            <Text style={styles.separator}>›</Text>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
    maxWidth: 120,
  },
  textActive: {
    color: '#111827',
  },
  textInactive: {
    color: '#6B7280',
  },
  separator: {
    fontSize: 16,
    color: '#9CA3AF',
    marginHorizontal: 8,
    fontWeight: '300',
  },
});
