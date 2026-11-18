import type { Saves } from './types';

export function localSaves(prefix: string): Saves {
  const k = (key: string) => `${prefix}:${key}`;
  return {
    async read(key) { try { return localStorage.getItem(k(key)); } catch { return null; } },
    async write(key, value) { try { localStorage.setItem(k(key), value); } catch { /* private mode: play without saves */ } },
    async remove(key) { try { localStorage.removeItem(k(key)); } catch { /* ignore */ } },
  };
}

export async function shareOrCopy(data: { title: string; text: string; url: string }): Promise<'shared' | 'copied' | 'unavailable'> {
  if (typeof navigator !== 'undefined' && navigator.share) {
    try { await navigator.share(data); return 'shared'; } catch { /* dismissed: fall through to the clipboard */ }
  }
  try { await navigator.clipboard.writeText(data.url); return 'copied'; } catch { return 'unavailable'; }
}

export class Listeners<T> {
  private set = new Set<(value: T) => void>();
  add(listener: (value: T) => void): () => void { this.set.add(listener); return () => this.set.delete(listener); }
  emit(value: T): void { for (const l of [...this.set]) l(value); }
}
