import React from 'react';
import { Pressable, Text, StyleSheet, View } from 'react-native';
import { MapNode } from '../utils/mindMapLayout';
import { LinearGradient } from 'expo-linear-gradient';

interface MindMapNodeProps {
  mapNode: MapNode;
  onPress: (mapNode: MapNode) => void;
}

export default function MindMapNode({ mapNode, onPress }: MindMapNodeProps): React.ReactElement {
  const isFolder = mapNode.node.type === 'folder';
  const isRoot = mapNode.level === 0;
  const displayName = mapNode.node.name.length > 10
    ? mapNode.node.name.substring(0, 10) + '...'
    : mapNode.node.name;

  const getIcon = (): string => {
    if (isFolder || isRoot) {
      return mapNode.isExpanded ? '▼' : '▶';
    }

    const itemType = mapNode.node.item?.item_type;
    switch (itemType) {
      case 'term': return '□';
      case 'memo': return '◇';
      case 'question': return '△';
      default: return '○';
    }
  };

  const getBadgeCount = (): string | null => {
    if (!isFolder || !mapNode.node.fileCount) return null;
    return mapNode.node.fileCount.toString();
  };

  const getGlowColor = (): string => {
    return mapNode.color + '80'; // 半透明
  };

  const nodeSize = isRoot ? 140 : 100;
  const hexSize = isRoot ? 70 : 50;

  return (
    <Pressable
      style={[
        styles.container,
        {
          left: mapNode.x - (nodeSize / 2),
          top: mapNode.y - (nodeSize / 2),
          width: nodeSize,
          height: nodeSize,
        }
      ]}
      onPress={() => onPress(mapNode)}
      accessibilityLabel={`${isFolder ? 'フォルダ' : 'ファイル'}: ${mapNode.node.name}`}
    >
      {/* グロー効果 */}
      <View
        style={[
          styles.glow,
          {
            backgroundColor: getGlowColor(),
            width: hexSize + 20,
            height: hexSize + 20,
          }
        ]}
      />

      {/* ヘキサゴンノード */}
      <View
        style={[
          styles.hexagon,
          {
            width: hexSize,
            height: hexSize,
            borderColor: mapNode.color,
            backgroundColor: `${mapNode.color}15`,
          }
        ]}
      >
        <View style={styles.nodeContent}>
          <Text style={[styles.icon, { color: mapNode.color, fontSize: isRoot ? 28 : 20 }]}>
            {getIcon()}
          </Text>
          {getBadgeCount() && (
            <View style={[styles.badge, { backgroundColor: mapNode.color }]}>
              <Text style={styles.badgeText}>{getBadgeCount()}</Text>
            </View>
          )}
        </View>
      </View>

      {/* ラベル */}
      <View style={[styles.label, { backgroundColor: `${mapNode.color}20` }]}>
        <Text
          style={[styles.labelText, { color: mapNode.color }]}
          numberOfLines={1}
        >
          {displayName}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    borderRadius: 50,
    opacity: 0.3,
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  hexagon: {
    transform: [{ rotate: '45deg' }],
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(10px)',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  nodeContent: {
    transform: [{ rotate: '-45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontWeight: '900',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  badge: {
    position: 'absolute',
    top: -25,
    right: -25,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    transform: [{ rotate: '-45deg' }],
  },
  badgeText: {
    color: '#0a0e17',
    fontSize: 10,
    fontWeight: '900',
  },
  label: {
    position: 'absolute',
    bottom: -20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  labelText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
