/**
 * Plugin/Extension Registry
 *
 * The registry is the backbone of the extension system.
 * Extensions register their tile types, and the designer
 * renders whatever is registered.
 *
 * Each tile type definition:
 * @typedef {Object} TileType
 * @property {string} id - unique identifier
 * @property {string} label - display name
 * @property {string} color - hex color or CSS color
 * @property {string} [textColor] - label text color
 * @property {string} [icon] - emoji or SVG string
 * @property {string} [category] - grouping in palette
 * @property {string} [extensionId] - which extension provides this
 * @property {number} [defaultCount] - default quantity in palette
 * @property {boolean} [isEdgeTile] - if true, placed on hex edges, not hexes
 * @property {Object} [meta] - arbitrary extension metadata
 */

import { writable } from 'svelte/store';

// Reactive stores — updated whenever extensions are toggled
export const tileListStore = writable(/** @type {TileType[]} */ ([]));
export const extensionListStore = writable(/** @type {Extension[]} */ ([]));

class TileRegistry {
  constructor() {
    /** @type {Map<string, TileType>} */
    this._tiles = new Map();

    /** @type {Map<string, Extension>} */
    this._extensions = new Map();

    /** @type {Set<string>} */
    this._activeExtensions = new Set();
  }

  /** Sync Svelte stores with current state */
  _notifyStores() {
    tileListStore.set(this.getAllTiles());
    extensionListStore.set(this.getExtensions());
  }

  /**
   * Register an extension plugin
   * @param {Extension} extension
   */
  registerExtension(extension) {
    if (this._extensions.has(extension.id)) {
      console.warn(`Extension "${extension.id}" already registered`);
      return;
    }
    this._extensions.set(extension.id, extension);

    if (extension.activeByDefault !== false) {
      this.activateExtension(extension.id);
    } else {
      this._notifyStores();
    }
  }

  /**
   * Activate an extension and register its tiles
   * @param {string} extensionId
   */
  activateExtension(extensionId) {
    const ext = this._extensions.get(extensionId);
    if (!ext) throw new Error(`Extension "${extensionId}" not found`);

    this._activeExtensions.add(extensionId);

    for (const tile of ext.tiles) {
      this._tiles.set(tile.id, { ...tile, extensionId });
    }
    this._notifyStores();
  }

  /**
   * Deactivate an extension and remove its tiles
   * @param {string} extensionId
   */
  deactivateExtension(extensionId) {
    const ext = this._extensions.get(extensionId);
    if (!ext) return;

    this._activeExtensions.delete(extensionId);

    for (const tile of ext.tiles) {
      this._tiles.delete(tile.id);
    }
    this._notifyStores();
  }

  /**
   * Get a tile type by id
   * @param {string} id
   * @returns {TileType | undefined}
   */
  getTile(id) {
    return this._tiles.get(id);
  }

  /**
   * Get all registered tile types
   * @returns {TileType[]}
   */
  getAllTiles() {
    return Array.from(this._tiles.values());
  }

  /**
   * Get only hex-placeable tiles (non-edge)
   * @returns {TileType[]}
   */
  getHexTiles() {
    return Array.from(this._tiles.values()).filter((t) => !t.isEdgeTile);
  }

  /**
   * Get only edge tiles (ports, etc.)
   * @returns {TileType[]}
   */
  getEdgeTiles() {
    return Array.from(this._tiles.values()).filter((t) => t.isEdgeTile);
  }

  /**
   * Get tiles grouped by category
   * @returns {Map<string, TileType[]>}
   */
  getTilesByCategory() {
    const groups = new Map();
    for (const tile of this._tiles.values()) {
      const cat = tile.category || 'General';
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat).push(tile);
    }
    return groups;
  }

  /**
   * Get all registered extensions
   * @returns {Extension[]}
   */
  getExtensions() {
    return Array.from(this._extensions.values());
  }

  /**
   * Check if an extension is active
   * @param {string} extensionId
   * @returns {boolean}
   */
  isExtensionActive(extensionId) {
    return this._activeExtensions.has(extensionId);
  }

  /**
   * Collect combined tileCountModifiers from all currently active extensions.
   * @returns {Record<string, number>}
   */
  getActiveCountModifiers() {
    const result = {};
    for (const id of this._activeExtensions) {
      const ext = this._extensions.get(id);
      if (!ext?.tileCountModifiers) continue;
      for (const [tileId, delta] of Object.entries(ext.tileCountModifiers)) {
        result[tileId] = (result[tileId] ?? 0) + delta;
      }
    }
    return result;
  }
}

/**
 * @typedef {Object} Extension
 * @property {string} id
 * @property {string} name
 * @property {string} [description]
 * @property {string} [icon]
 * @property {boolean} [activeByDefault]
 * @property {TileType[]} tiles
 * @property {Record<string, number>} [tileCountModifiers] - additive bonuses to existing tile counts
 */

export const registry = new TileRegistry();
