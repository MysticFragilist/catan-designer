/**
 * App-level store for cross-route navigation state.
 * The landing page sets `pendingMapConfig` before navigating to the designer,
 * and the designer consumes + clears it on mount.
 */
import { writable } from 'svelte/store';

/**
 * @typedef {Object} PendingMapConfig
 * @property {'new' | 'load'} type
 * @property {string} [name]           - for type='new'
 * @property {string} [preset]         - 'standard' | '5-6player' | 'seafarers-medium' | 'seafarers-large'
 * @property {number} [gridRadius]       - for type='new', initial grid radius
 * @property {string[]} [extensions]    - for type='new', extension IDs to auto-activate
 * @property {boolean} [includePirate]  - for type='new'
 * @property {object} [loadedState]    - for type='load', already-parsed map state
 */

/** @type {import('svelte/store').Writable<PendingMapConfig | null>} */
export const pendingMapConfig = writable(null);
