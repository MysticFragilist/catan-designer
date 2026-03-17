import { writable, derived } from 'svelte/store';
import { hexKey, generateHexGrid } from '../core/hex.js';

/**
 * @typedef {Object} PlacedTile
 * @property {string} tileTypeId
 * @property {number} q
 * @property {number} r
 * @property {number} [rotation] - 0-5, each = 60 degrees
 * @property {number} [number] - dice number token (2-12)
 */

/**
 * @typedef {Object} PlacedEdge
 * @property {string} portTypeId
 * @property {string} edgeKey - canonical edge key
 */

/**
 * @typedef {Object} PlacedVertex
 * @property {string} tokenTypeId
 * @property {string} vertexKey - canonical vertex key
 */

/**
 * @typedef {Object} MapState
 * @property {string} name
 * @property {number} gridRadius
 * @property {string} gridMode - 'auto' | 'custom'
 * @property {Set<string>} customHexes - active hex keys in custom mode
 * @property {string} orientation
 * @property {Map<string, PlacedTile>} tiles - hex tiles keyed by hexKey
 * @property {Map<string, PlacedEdge>} portEdges - port edges keyed by canonical edge key
 * @property {Map<string, PlacedVertex>} vertexTokens - vertex tokens keyed by canonical vertex key
 * @property {{q: number, r: number} | null} robberHex - robber position
 * @property {{q: number, r: number} | null} pirateHex - hex position for pirate boat
 * @property {boolean} includePirate - whether the pirate boat is part of this scenario
 * @property {number} canvasRotation - canvas rotation in degrees (multiples of 30)
 */

/** @returns {MapState} */
function makeInitialState() {
  return {
    name: 'New Map',
    gridRadius: 3,
    gridMode: 'auto',
    customHexes: new Set(),
    orientation: 'flat',
    tiles: new Map(),
    portEdges: new Map(),
    vertexTokens: new Map(),
    robberHex: null,
    pirateHex: null,
    includePirate: false,
    canvasRotation: 0
  };
}

function createMapStore() {
  const { subscribe, set, update } = writable(makeInitialState());

  return {
    subscribe,

    // ── Tile Placement ─────────────────────────────────────────────

    placeTile(q, r, tileTypeId) {
      update((state) => {
        const key = hexKey(q, r);
        const newTiles = new Map(state.tiles);
        newTiles.set(key, { tileTypeId, q, r, rotation: 0, number: null });
        return { ...state, tiles: newTiles };
      });
    },

    removeTile(q, r) {
      update((state) => {
        const key = hexKey(q, r);
        const newTiles = new Map(state.tiles);
        newTiles.delete(key);
        return { ...state, tiles: newTiles };
      });
    },

    setNumberToken(q, r, number) {
      update((state) => {
        const key = hexKey(q, r);
        const tile = state.tiles.get(key);
        if (!tile) return state;
        const newTiles = new Map(state.tiles);
        newTiles.set(key, { ...tile, number });
        return { ...state, tiles: newTiles };
      });
    },

    rotateTile(q, r) {
      update((state) => {
        const key = hexKey(q, r);
        const tile = state.tiles.get(key);
        if (!tile) return state;
        const newTiles = new Map(state.tiles);
        newTiles.set(key, { ...tile, rotation: ((tile.rotation || 0) + 1) % 6 });
        return { ...state, tiles: newTiles };
      });
    },

    // ── Port Edge Placement ────────────────────────────────────────

    placePortEdge(edgeKey, portTypeId) {
      update((state) => {
        const newEdges = new Map(state.portEdges);
        newEdges.set(edgeKey, { portTypeId, edgeKey });
        return { ...state, portEdges: newEdges };
      });
    },

    removePortEdge(edgeKey) {
      update((state) => {
        const newEdges = new Map(state.portEdges);
        newEdges.delete(edgeKey);
        return { ...state, portEdges: newEdges };
      });
    },

    // ── Vertex Token Placement ─────────────────────────────────────

    placeVertexToken(vertexKey, tokenTypeId) {
      update((state) => {
        const newTokens = new Map(state.vertexTokens);
        newTokens.set(vertexKey, { tokenTypeId, vertexKey });
        return { ...state, vertexTokens: newTokens };
      });
    },

    removeVertexToken(vertexKey) {
      update((state) => {
        const newTokens = new Map(state.vertexTokens);
        newTokens.delete(vertexKey);
        return { ...state, vertexTokens: newTokens };
      });
    },

    // ── Custom Grid ────────────────────────────────────────────────

    /**
     * Switch to custom grid mode, initialising from current auto grid
     */
    enableCustomGrid() {
      update((state) => {
        if (state.gridMode === 'custom') return state;
        // Seed custom hexes from current auto grid
        const autoHexes = generateHexGrid(state.gridRadius - 1);
        const customHexes = new Set(autoHexes.map((h) => hexKey(h.q, h.r)));
        return { ...state, gridMode: 'custom', customHexes };
      });
    },

    /**
     * Switch back to auto grid mode
     */
    disableCustomGrid() {
      update((state) => ({ ...state, gridMode: 'auto' }));
    },

    /**
     * Toggle a hex in/out of the custom active set
     * @param {number} q
     * @param {number} r
     */
    toggleCustomHex(q, r) {
      update((state) => {
        const key = hexKey(q, r);
        const newCustom = new Set(state.customHexes);
        if (newCustom.has(key)) {
          newCustom.delete(key);
          // Also remove any tile placed there
          const newTiles = new Map(state.tiles);
          newTiles.delete(key);
          return { ...state, customHexes: newCustom, tiles: newTiles };
        } else {
          newCustom.add(key);
          return { ...state, customHexes: newCustom };
        }
      });
    },

    // ── Grid settings ──────────────────────────────────────────────

    setGridRadius(radius) {
      update((state) => ({ ...state, gridRadius: radius }));
    },

    setName(name) {
      update((state) => ({ ...state, name }));
    },

    clearAll() {
      update((state) => ({
        ...state,
        tiles: new Map(),
        portEdges: new Map(),
        vertexTokens: new Map(),
        robberHex: null,
        pirateHex: null
      }));
    },

    // ── Robber & Pirate ────────────────────────────────────────────

    setRobber(q, r) {
      update((state) => ({ ...state, robberHex: { q, r } }));
    },

    clearRobber() {
      update((state) => ({ ...state, robberHex: null }));
    },

    setPirate(q, r) {
      update((state) => ({ ...state, pirateHex: { q, r } }));
    },

    clearPirate() {
      update((state) => ({ ...state, pirateHex: null }));
    },

    setIncludePirate(val) {
      update((state) => ({ ...state, includePirate: val }));
    },

    setCanvasRotation(degrees) {
      update((state) => ({ ...state, canvasRotation: degrees }));
    },

    // ── Reset (used when creating/loading from landing page) ───────

    /**
     * Reset the entire map to a new state.
     * @param {Partial<MapState>} overrides
     */
    resetMap(overrides = {}) {
      const base = makeInitialState();
      set({
        ...base,
        ...overrides,
        // Ensure proper types for collections
        customHexes:
          overrides.customHexes instanceof Set
            ? overrides.customHexes
            : new Set(overrides.customHexes ?? []),
        tiles:
          overrides.tiles instanceof Map
            ? overrides.tiles
            : new Map(
                (overrides.tiles ?? []).map(
                  /** @param {PlacedTile} t */ (t) => [hexKey(t.q, t.r), t]
                )
              ),
        portEdges:
          overrides.portEdges instanceof Map
            ? overrides.portEdges
            : new Map(
                (overrides.portEdges ?? []).map(/** @param {PlacedEdge} e */ (e) => [e.edgeKey, e])
              ),
        vertexTokens:
          overrides.vertexTokens instanceof Map
            ? overrides.vertexTokens
            : new Map(
                (overrides.vertexTokens ?? []).map(
                  /** @param {PlacedVertex} v */ (v) => [v.vertexKey, v]
                )
              )
      });
    },

    // ── Serialisation ──────────────────────────────────────────────

    /**
     * @param {MapState} state
     * @param {string[]} [extensions] - active extension ids to embed in the JSON
     */
    exportJSON(state, extensions = []) {
      return JSON.stringify(
        {
          name: state.name,
          gridRadius: state.gridRadius,
          gridMode: state.gridMode,
          customHexes: Array.from(state.customHexes),
          orientation: state.orientation,
          tiles: Array.from(state.tiles.values()),
          portEdges: Array.from(state.portEdges.values()),
          vertexTokens: Array.from(state.vertexTokens.values()),
          robberHex: state.robberHex,
          pirateHex: state.pirateHex,
          includePirate: state.includePirate,
          canvasRotation: state.canvasRotation,
          extensions
        },
        null,
        2
      );
    },

    /**
     * @param {string} json
     * @returns {{ success: boolean, extensions: string[] }}
     */
    importJSON(json) {
      try {
        const data = JSON.parse(json);
        const tiles = new Map();
        for (const tile of data.tiles || []) {
          tiles.set(hexKey(tile.q, tile.r), tile);
        }
        const portEdges = new Map();
        for (const edge of data.portEdges || []) {
          portEdges.set(edge.edgeKey, edge);
        }
        const vertexTokens = new Map();
        for (const vt of data.vertexTokens || []) {
          vertexTokens.set(vt.vertexKey, vt);
        }
        set({
          name: data.name || 'Imported Map',
          gridRadius: data.gridRadius || 3,
          gridMode: data.gridMode || 'auto',
          customHexes: new Set(data.customHexes || []),
          orientation: data.orientation || 'flat',
          tiles,
          portEdges,
          vertexTokens,
          robberHex: data.robberHex || null,
          pirateHex: data.pirateHex || null,
          includePirate: data.includePirate || false,
          canvasRotation: data.canvasRotation ?? 0
        });
        return { success: true, extensions: data.extensions ?? [] };
      } catch {
        return { success: false, extensions: [] };
      }
    }
  };
}

export const mapStore = createMapStore();

/**
 * Palette counts: how many of each tile type the user wants on the board.
 * @type {import('svelte/store').Writable<Map<string, number>>}
 */
export const paletteCounts = writable(new Map());

/**
 * Recompute palette counts from tile definitions + active extension modifiers.
 * Always overwrites — palette counts are never persisted, so a fresh recompute
 * is correct whenever the active tile set or extension modifiers change.
 * @param {import('../core/registry.js').TileType[]} tiles
 * @param {Record<string, number>} [modifiers] - additive bonuses from active extensions
 */
export function initPaletteCounts(tiles, modifiers = {}) {
  const counts = new Map();
  for (const t of tiles) {
    counts.set(t.id, t.defaultCount ?? 1);
  }
  for (const [tileId, delta] of Object.entries(modifiers)) {
    if (counts.has(tileId)) {
      counts.set(tileId, (counts.get(tileId) ?? 0) + delta);
    }
  }
  paletteCounts.set(counts);
}

export const activeTool = writable('paint'); // 'paint' | 'erase' | 'select' | 'number' | 'shape'
export const selectedTileType = writable(/** @type {string | null} */ (null));
export const selectedHex = writable(/** @type {{q: number, r: number} | null} */ (null));
export const hoveredHex = writable(/** @type {{q: number, r: number} | null} */ (null));
export const hoveredEdge = writable(/** @type {string | null} */ (null)); // canonical edge key
export const hoveredVertex = writable(/** @type {string | null} */ (null)); // canonical vertex key

/**
 * Tile placement mode.
 *  'locked'   — placement is blocked when placed count >= max (paletteCounts)
 *  'freeform' — no restriction, paint as many as you want
 */
export const tileMode = writable(/** @type {'locked' | 'freeform'} */ ('locked'));

/**
 * Reactive count of how many of each tile type are currently placed on the map.
 * Counts both hex tiles and port edges.
 * @type {import('svelte/store').Readable<Map<string, number>>}
 */
export const placedCounts = derived(mapStore, ($map) => {
  const counts = new Map();
  for (const tile of $map.tiles.values()) {
    counts.set(tile.tileTypeId, (counts.get(tile.tileTypeId) ?? 0) + 1);
  }
  for (const edge of $map.portEdges.values()) {
    counts.set(edge.portTypeId, (counts.get(edge.portTypeId) ?? 0) + 1);
  }
  for (const vt of $map.vertexTokens.values()) {
    counts.set(vt.tokenTypeId, (counts.get(vt.tokenTypeId) ?? 0) + 1);
  }
  return counts;
});
