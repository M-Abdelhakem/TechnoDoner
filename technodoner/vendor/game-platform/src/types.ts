/** Where the game is running. Detected at load from what the host injects. */
export type PlatformName = 'web' | 'wavedash' | 'remix';

export interface User {
  id: string;
  name: string;
  avatar?: string;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  mine?: boolean;
}

export interface Leaderboard {
  /** Submit a finished run. Keeps the player's best; resolves with the saved standing when known. */
  submit(score: number): Promise<{ rank?: number; best?: number } | null>;
  /** The top of the board, best first. */
  top(count?: number): Promise<LeaderboardEntry[]>;
}

export interface LeaderboardOptions {
  /** 'desc' ranks higher scores first (points); 'asc' lower first (times). */
  order?: 'asc' | 'desc';
  /** How a score reads on the host's own leaderboard page. */
  display?: 'number' | 'seconds' | 'millis';
}

export interface Saves {
  read(key: string): Promise<string | null>;
  write(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export interface Platform {
  readonly name: PlatformName;
  /** True when another site frames the game (Wavedash, Remix): no own URL bar, no redirects. */
  readonly hosted: boolean;
  /** Report loading, 0..1. Hosts with a loading screen show it; others ignore it. */
  progress(fraction: number): void;
  /** The game is loaded and visible. Call once, before the first interactive screen. */
  ready(): Promise<void>;
  /** A scored run ended. Reported once per run; a second call before play again is ignored. */
  gameOver(score: number): void;
  /** The host asked for a new run (Remix's Play Again). Returns an unsubscribe. */
  onPlayAgain(listener: () => void): () => void;
  /** The host muted or unmuted the game. Returns an unsubscribe. */
  onMute(listener: (muted: boolean) => void): () => void;
  /** Who is playing, when the host knows. */
  user(): Promise<User | null>;
  /** Per-player saves: the host's cloud when it has one, this browser otherwise. */
  readonly saves: Saves;
  /** A named leaderboard, or null when this host has none. */
  leaderboard(name: string, options?: LeaderboardOptions): Leaderboard | null;
  /** Share a link: the device's share sheet, else the clipboard. */
  share(data: { title: string; text: string; url: string }): Promise<'shared' | 'copied' | 'unavailable'>;
}
