/**
 * Cities & Knights Extension
 * Uses the standard Catan board. Adds knight tokens, metropolis markers,
 * and city-gate pieces as vertex tiles.
 */

/** @type {import('../../core/registry.js').Extension} */
export const citiesAndKnightsExtension = {
  id: 'cities-and-knights',
  name: 'Cities & Knights',
  description: 'Knights, metropolises, and city improvements',
  icon: '⚔️',
  activeByDefault: false,
  tiles: [
    // ── Knights (vertex tokens) ────────────────────────────────────
    {
      id: 'knight-basic',
      label: 'Knight (Basic)',
      color: '#c8b8a2',
      textColor: '#3d2b1f',
      icon: '🗡️',
      category: 'Cities & Knights',
      defaultCount: 4,
      isVertexTile: true
    },
    {
      id: 'knight-strong',
      label: 'Knight (Strong)',
      color: '#a07850',
      textColor: '#fff8f0',
      icon: '⚔️',
      category: 'Cities & Knights',
      defaultCount: 3,
      isVertexTile: true
    },
    {
      id: 'knight-mighty',
      label: 'Knight (Mighty)',
      color: '#5c3d1e',
      textColor: '#ffd700',
      icon: '🛡️',
      category: 'Cities & Knights',
      defaultCount: 2,
      isVertexTile: true
    },
    // ── Metropolises (vertex tokens) ───────────────────────────────
    {
      id: 'metropolis-cloth',
      label: 'Metropolis (Cloth)',
      color: '#2d6a4f',
      textColor: '#d8f3dc',
      icon: '🏛️',
      category: 'Cities & Knights',
      defaultCount: 1,
      isVertexTile: true
    },
    {
      id: 'metropolis-coin',
      label: 'Metropolis (Coin)',
      color: '#b5830a',
      textColor: '#fff8dc',
      icon: '🏛️',
      category: 'Cities & Knights',
      defaultCount: 1,
      isVertexTile: true
    },
    {
      id: 'metropolis-paper',
      label: 'Metropolis (Paper)',
      color: '#1d3557',
      textColor: '#a8dadc',
      icon: '🏛️',
      category: 'Cities & Knights',
      defaultCount: 1,
      isVertexTile: true
    },
    // ── City gate (vertex token) ───────────────────────────────────
    {
      id: 'city-gate',
      label: 'City Gate',
      color: '#495057',
      textColor: '#f8f9fa',
      icon: '🏰',
      category: 'Cities & Knights',
      defaultCount: 6,
      isVertexTile: true
    }
  ]
};
