/**
 * 5-6 Player Extension
 * Adds the extra terrain tiles, sea tiles, and ports for 5-6 player games.
 * These supplement the base Catan tiles — activate alongside the Base Game extension.
 */

/** @type {import('../../core/registry.js').Extension} */
export const fiveSixPlayerExtension = {
  id: '5-6player',
  name: '5-6 Player',
  description: 'Extra terrain and ports for 5-6 player games',
  icon: '👥',
  activeByDefault: false,
  // Extra copies of base tiles added by the 5-6 Player expansion
  tileCountModifiers: {
    forest: 2,
    pasture: 2,
    fields: 2,
    hills: 2,
    mountains: 2,
    desert: 1,
    sea: 13
  },
  tiles: [
    // ── Extra ports (edge tiles) ────────────────────────────────────
    {
      id: 'port-generic-56',
      label: '3:1 Port',
      color: '#f4a261',
      textColor: '#1a1a2e',
      icon: '⚓',
      category: '5-6 Ports',
      defaultCount: 2,
      isEdgeTile: true
    },
    {
      id: 'port-wool-56',
      label: 'Wool 2:1',
      color: '#74c69d',
      textColor: '#1b4332',
      icon: '⚓',
      category: '5-6 Ports',
      defaultCount: 1,
      isEdgeTile: true
    }
  ]
};
