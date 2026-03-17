/**
 * LocalStorage persistence for saved maps.
 * All operations are safe to call in SSR (server-side rendering) contexts —
 * they return graceful fallbacks when localStorage is unavailable.
 */

const STORAGE_KEY = 'catan-designer-maps';
const MAX_SAVED_MAPS = 30;

/**
 * @typedef {Object} SnapshotHex
 * @property {number} q
 * @property {number} r
 * @property {string} color
 */

/**
 * @typedef {Object} SavedMapEntry
 * @property {string} id
 * @property {string} name
 * @property {string} savedAt - ISO date string
 * @property {number} hexCount
 * @property {string[]} extensions - active extension ids
 * @property {string} gridMode
 * @property {number} gridRadius
 * @property {string} orientation
 * @property {SnapshotHex[]} [colorSnapshot] - compact color-only preview
 * @property {string} data - full JSON of the map state
 */

function isBrowser() {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

/**
 * Load all saved map entries from localStorage.
 * @returns {SavedMapEntry[]}
 */
export function getSavedMaps() {
  if (!isBrowser()) return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

/**
 * Save the current map to localStorage.
 * If a map with the same name exists, it is overwritten.
 * @param {object} mapState - the full MapState object
 * @param {string} mapJSON - serialised JSON string of the map
 * @param {string[]} activeExtensions - list of active extension ids
 * @param {SnapshotHex[]} [colorSnapshot] - compact color preview
 * @returns {string} the saved map id
 */
export function saveMap(mapState, mapJSON, activeExtensions = [], colorSnapshot = []) {
  if (!isBrowser()) return '';

  const maps = getSavedMaps();
  const existingIdx = maps.findIndex((m) => m.name === mapState.name);

  const id = existingIdx >= 0 ? maps[existingIdx].id : crypto.randomUUID();

  const hexCount =
    mapState.gridMode === 'custom'
      ? mapState.customHexes.size
      : countRadiusHexes(mapState.gridRadius);

  /** @type {SavedMapEntry} */
  const entry = {
    id,
    name: mapState.name,
    savedAt: new Date().toISOString(),
    hexCount,
    extensions: activeExtensions,
    gridMode: mapState.gridMode,
    gridRadius: mapState.gridRadius,
    orientation: mapState.orientation || 'flat',
    colorSnapshot,
    data: mapJSON
  };

  if (existingIdx >= 0) {
    maps[existingIdx] = entry;
  } else {
    maps.unshift(entry);
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(maps.slice(0, MAX_SAVED_MAPS)));
  } catch {
    // Storage quota exceeded — remove oldest and retry
    maps.splice(MAX_SAVED_MAPS - 1);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(maps));
  }

  return id;
}

/**
 * Delete a saved map by id.
 * @param {string} id
 */
export function deleteMap(id) {
  if (!isBrowser()) return;
  const maps = getSavedMaps().filter((m) => m.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(maps));
}

/**
 * Load a full map state by id.
 * @param {string} id
 * @returns {object | null}
 */
export function loadMap(id) {
  const entry = getSavedMaps().find((m) => m.id === id);
  if (!entry) return null;
  try {
    return JSON.parse(entry.data);
  } catch {
    return null;
  }
}

/** Number of hexes in a radial (perfect hexagon) grid of a given radius. */
function countRadiusHexes(radius) {
  return 3 * radius * radius + 3 * radius + 1;
}

/**
 * Format a saved-at ISO date string into a relative time or date label.
 * @param {string} iso
 * @returns {string}
 */
export function formatSavedAt(iso) {
  try {
    const d = new Date(iso);
    const now = Date.now();
    const diffMs = now - d.getTime();
    const diffMin = Math.floor(diffMs / 60_000);
    const diffH = Math.floor(diffMs / 3_600_000);
    const diffD = Math.floor(diffMs / 86_400_000);

    if (diffMin < 2) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffH < 24) return `${diffH}h ago`;
    if (diffD < 7) return `${diffD}d ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}
