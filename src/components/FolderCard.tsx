import React from 'react';
import { Pressable, Text, StyleSheet, View } from 'react-native';
import { TreeNode } from '../utils/treeBuilder';

interface FolderCardProps {
  node: TreeNode;
  onPress: () => void;
}

export default function FolderCard({ node, onPress }: FolderCardProps): React.ReactElement {
  const fileCount = node.fileCount || 0;

  return (
    <Pressable
      style={styles.card}
      onPress={onPress}
      accessibilityLabel={`フォルダ: ${node.name}`}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>📁</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {node.name}
        </Text>
        <Text style={styles.subtitle}>{fileCount}件のアイテム</Text>
      </View>
      <View style={styles.arrow}>
        <Text style={styles.arrowIcon}>›</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 24,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '400',
  },
  arrow: {
    marginLeft: 8,
  },
  arrowIcon: {
    fontSize: 24,
    color: '#9CA3AF',
    fontWeight: '300',
  },
});
