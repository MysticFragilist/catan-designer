/**
 * Base Catan Extension
 * Provides the standard Catan tile types.
 * Ports are marked isEdgeTile: true — they are placed on hex edges, not hexes.
 */

/** @type {import('../../core/registry.js').Extension} */
export const baseCatanExtension = {
  id: 'base',
  name: 'Catan Base Game',
  description: 'Standard Catan resource tiles, desert, sea, and ports',
  icon: '🏝️',
  activeByDefault: true,
  tiles: [
    // ── Resource tiles ─────────────────────────────────────────────
    {
      id: 'forest',
      label: 'Forest',
      color: '#2d6a4f',
      textColor: '#d8f3dc',
      icon: '🌲',
      category: 'Resources',
      defaultCount: 4
    },
    {
      id: 'pasture',
      label: 'Pasture',
      color: '#95d5b2',
      textColor: '#1b4332',
      icon: '🐑',
      category: 'Resources',
      defaultCount: 4
    },
    {
      id: 'fields',
      label: 'Fields',
      color: '#f9c74f',
      textColor: '#4a3728',
      icon: '🌾',
      category: 'Resources',
      defaultCount: 4
    },
    {
      id: 'hills',
      label: 'Hills',
      color: '#bc4749',
      textColor: '#fde8d8',
      icon: '🧱',
      category: 'Resources',
      defaultCount: 3
    },
    {
      id: 'mountains',
      label: 'Mountains',
      color: '#6c757d',
      textColor: '#f8f9fa',
      icon: '⛰️',
      category: 'Resources',
      defaultCount: 3
    },
    // ── Special tiles ──────────────────────────────────────────────
    {
      id: 'sea',
      label: 'Sea',
      color: '#4895ef',
      textColor: '#ffffff',
      icon: '🌊',
      category: 'Special',
      defaultCount: 18
    },
    {
      id: 'desert',
      label: 'Desert',
      color: '#e9c46a',
      textColor: '#4a3728',
      icon: '🏜️',
      category: 'Special',
      defaultCount: 1
    },
    // ── Ports (edge tiles) ─────────────────────────────────────────
    {
      id: 'port-generic',
      label: '3:1 Port',
      color: '#f4a261',
      textColor: '#1a1a2e',
      icon: '⚓',
      category: 'Ports',
      defaultCount: 4,
      isEdgeTile: true
    },
    {
      id: 'port-wood',
      label: 'Wood 2:1',
      color: '#1b4332',
      textColor: '#d8f3dc',
      icon: '⚓',
      category: 'Ports',
      defaultCount: 1,
      isEdgeTile: true
    },
    {
      id: 'port-wool',
      label: 'Wool 2:1',
      color: '#74c69d',
      textColor: '#1b4332',
      icon: '⚓',
      category: 'Ports',
      defaultCount: 1,
      isEdgeTile: true
    },
    {
      id: 'port-grain',
      label: 'Grain 2:1',
      color: '#f9c74f',
      textColor: '#4a3728',
      icon: '⚓',
      category: 'Ports',
      defaultCount: 1,
      isEdgeTile: true
    },
    {
      id: 'port-brick',
      label: 'Brick 2:1',
      color: '#9b2335',
      textColor: '#fde8d8',
      icon: '⚓',
      category: 'Ports',
      defaultCount: 1,
      isEdgeTile: true
    },
    {
      id: 'port-ore',
      label: 'Ore 2:1',
      color: '#495057',
      textColor: '#f8f9fa',
      icon: '⚓',
      category: 'Ports',
      defaultCount: 1,
      isEdgeTile: true
    }
  ]
};
