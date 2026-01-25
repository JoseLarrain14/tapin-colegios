/**
 * Storage utility wrapper for localStorage
 * Handles SSR safely by checking for window object
 */

const isClient = typeof window !== 'undefined';

/**
 * Get an item from localStorage
 * @param key - Storage key
 * @returns The stored value or null if not found
 */
export function getItem(key: string): string | null {
  if (!isClient) {
    return null;
  }
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.error(`Error reading from localStorage: ${key}`, error);
    return null;
  }
}

/**
 * Set an item in localStorage
 * @param key - Storage key
 * @param value - Value to store
 */
export function setItem(key: string, value: string): void {
  if (!isClient) {
    return;
  }
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.error(`Error writing to localStorage: ${key}`, error);
  }
}

/**
 * Remove an item from localStorage
 * @param key - Storage key
 */
export function removeItem(key: string): void {
  if (!isClient) {
    return;
  }
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error removing from localStorage: ${key}`, error);
  }
}

/**
 * Get a JSON-parsed item from localStorage
 * @param key - Storage key
 * @returns The parsed value or null if not found or invalid
 */
export function getJSON<T>(key: string): T | null {
  const value = getItem(key);
  if (!value) {
    return null;
  }
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.error(`Error parsing JSON from localStorage: ${key}`, error);
    return null;
  }
}

/**
 * Set a JSON-stringified item in localStorage
 * @param key - Storage key
 * @param value - Value to store (will be JSON stringified)
 */
export function setJSON<T>(key: string, value: T): void {
  try {
    setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error stringifying JSON for localStorage: ${key}`, error);
  }
}

/**
 * Storage keys used in the application
 */
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER: 'user',
} as const;
