/**
 * Seafarers Extension
 * Adds gold fields, fog, and additional sea/port tiles for Seafarers scenarios.
 * Seafarer ports can be placed on ANY edge, even interior ones.
 */

/** @type {import('../../core/registry.js').Extension} */
export const seafarersExtension = {
  id: 'seafarers',
  name: 'Seafarers',
  description: 'Gold fields, fog tiles, and edge ports for any scenario layout',
  icon: '⛵',
  activeByDefault: false,
  // Extra copies of base tiles added by the Seafarers expansion
  tileCountModifiers: {
    forest: 2,
    pasture: 2,
    fields: 2,
    hills: 2,
    mountains: 2,
    desert: 2,
    sea: 25
  },
  tiles: [
    // ── Hex tiles ──────────────────────────────────────────────────
    {
      id: 'gold-field',
      label: 'Gold Field',
      color: '#ffd700',
      textColor: '#4a3728',
      icon: '🪙',
      category: 'Seafarers',
      defaultCount: 2
    },
    {
      id: 'fog',
      label: 'Fog',
      color: '#adb5bd',
      textColor: '#212529',
      icon: '🌫️',
      category: 'Seafarers',
      defaultCount: 6
    },
    {
      id: 'pirate-lair',
      label: 'Pirate Lair',
      color: '#212529',
      textColor: '#ffd700',
      icon: '☠️',
      category: 'Seafarers',
      defaultCount: 1
    },
    // ── Edge tiles (ports) ─────────────────────────────────────────
    {
      id: 'port-gold',
      label: 'Gold 2:1',
      color: '#ffd700',
      textColor: '#4a3728',
      icon: '⚓',
      category: 'Seafarers Ports',
      defaultCount: 1,
      isEdgeTile: true
    },
    // ── Vertex tokens ──────────────────────────────────────────────
    {
      id: 'village',
      label: 'Cloth Village',
      color: '#c8a97e',
      textColor: '#4a2c11',
      icon: '🏘️',
      category: 'Seafarers',
      defaultCount: 5,
      isVertexTile: true
    }
  ]
};
