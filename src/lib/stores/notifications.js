import { writable } from 'svelte/store';

let nextId = 0;

/** @type {import('svelte/store').Writable<Array<{id: number, message: string, type: 'success'|'info'|'error'}>>} */
export const notifications = writable([]);

/**
 * @param {string} message
 * @param {'success'|'info'|'error'} [type]
 * @param {number} [duration] ms, 0 = persistent
 */
export function notify(message, type = 'info', duration = 3500) {
  const id = ++nextId;
  notifications.update((n) => [...n, { id, message, type }]);
  if (duration > 0) {
    setTimeout(() => dismiss(id), duration);
  }
}

/** @param {number} id */
export function dismiss(id) {
  notifications.update((n) => n.filter((x) => x.id !== id));
}
