import React from 'react';
import { Pressable, Text, StyleSheet, View } from 'react-native';
import { TreeNode } from '../utils/treeBuilder';

interface FileCardProps {
  node: TreeNode;
  onPress: () => void;
}

export default function FileCard({ node, onPress }: FileCardProps): React.ReactElement {
  const itemType = node.item?.item_type;

  const getIcon = (): string => {
    switch (itemType) {
      case 'term': return '📖';
      case 'memo': return '📝';
      case 'question': return '❓';
      default: return '📄';
    }
  };

  const getTypeLabel = (): string => {
    switch (itemType) {
      case 'term': return '用語';
      case 'memo': return 'メモ';
      case 'question': return '問題';
      default: return 'ノート';
    }
  };

  const getTypeColor = (): string => {
    switch (itemType) {
      case 'term': return '#06B6D4';
      case 'memo': return '#34D399';
      case 'question': return '#FB923C';
      default: return '#94A3B8';
    }
  };

  const typeColor = getTypeColor();

  return (
    <Pressable
      style={styles.card}
      onPress={onPress}
      accessibilityLabel={`${getTypeLabel()}: ${node.name}`}
    >
      <View style={[styles.iconContainer, { backgroundColor: `${typeColor}15` }]}>
        <Text style={styles.icon}>{getIcon()}</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {node.name}
        </Text>
        <View style={[styles.typeBadge, { backgroundColor: `${typeColor}20` }]}>
          <Text style={[styles.typeText, { color: typeColor }]}>{getTypeLabel()}</Text>
        </View>
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
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
