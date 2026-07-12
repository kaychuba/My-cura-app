import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { apiClient } from './api.client';

/**
 * Offline-first support for care work in houses with no signal.
 *
 * - enqueue(): store a write (clock event, MAR record, care note) on the
 *   phone when the network fails; each keeps its original timestamp.
 * - flushQueue(): replays queued writes in order; runs automatically when
 *   connectivity returns and on app start.
 * - cacheSet/cacheGet: last-known-good copies of screens (MAR chart, care
 *   documentation) so they still open with no signal.
 */

const QUEUE_KEY = 'mycura.offline.queue.v1';

export interface QueuedRequest {
  id: string;
  method: 'post' | 'patch';
  url: string;
  body: unknown;
  label: string;
  queuedAt: string;
}

/** Network-level failure (no HTTP response) — as opposed to a server rejection. */
export function isNetworkError(e: unknown): boolean {
  return !(e as { response?: unknown })?.response;
}

export async function getQueue(): Promise<QueuedRequest[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueuedRequest[]) : [];
  } catch {
    return [];
  }
}

async function setQueue(queue: QueuedRequest[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function enqueue(req: Omit<QueuedRequest, 'id' | 'queuedAt'>): Promise<void> {
  const queue = await getQueue();
  queue.push({
    ...req,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    queuedAt: new Date().toISOString(),
  });
  await setQueue(queue);
}

let flushing = false;

/** Replay the queue in order. Stops at the first network failure (still
 *  offline); drops requests the server rejects (e.g. duplicates from an
 *  optimistic retry) so one bad row can never poison the queue. */
export async function flushQueue(): Promise<{ synced: number; remaining: number }> {
  if (flushing) return { synced: 0, remaining: (await getQueue()).length };
  flushing = true;
  let synced = 0;
  try {
    let queue = await getQueue();
    while (queue.length > 0) {
      const item = queue[0];
      try {
        await apiClient.request({ method: item.method, url: item.url, data: item.body });
        synced++;
      } catch (e) {
        if (isNetworkError(e)) break; // still offline — try again later
        // Server said no (validation/duplicate): drop it, keep going
      }
      queue = queue.slice(1);
      await setQueue(queue);
    }
    return { synced, remaining: queue.length };
  } finally {
    flushing = false;
  }
}

/** Call once (worker layout): sync whenever connectivity returns. */
export function initOfflineSync(): () => void {
  flushQueue().catch(() => {});
  return NetInfo.addEventListener((state) => {
    if (state.isConnected) flushQueue().catch(() => {});
  });
}

// ── Screen caches ────────────────────────────────────────────────────────────

export async function cacheSet(key: string, data: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(`mycura.cache.${key}`, JSON.stringify({ at: Date.now(), data }));
  } catch { /* cache is best-effort */ }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(`mycura.cache.${key}`);
    return raw ? (JSON.parse(raw).data as T) : null;
  } catch {
    return null;
  }
}
