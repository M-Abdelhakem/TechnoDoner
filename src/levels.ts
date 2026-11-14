// Difficulty, shared by TechnoDöner · Regulars and TechnoDöner (the 1:1 original keeps its own copy in rules.json).
export type LevelId = 'chill' | 'normal' | 'rave';
export const LEVELS = {
  chill: { name: 'Chill', bpm: 112, danceLen: 2, beatsPerPose: 2, patience: 120, queue: 2, spawn: 18, mixPatience: 140, mixRules: 3, strobe: 0.5 },
  normal: { name: 'Normal', bpm: 122, danceLen: 3, beatsPerPose: 2, patience: 95, queue: 3, spawn: 16, mixPatience: 100, mixRules: 6, strobe: 1 },
  rave: { name: 'Rave', bpm: 132, danceLen: 4, beatsPerPose: 1, patience: 75, queue: 3, spawn: 12, mixPatience: 75, mixRules: 8, strobe: 2 },
} as const;
export const lv = (id: string) => LEVELS[id as LevelId] || LEVELS.normal;
/** seconds left -> 0 calm, 1 impatient (60 s), 2 annoyed (30 s), 3 about to leave (10 s) */
export const urgency = (sec: number) => (sec <= 10 ? 3 : sec <= 30 ? 2 : sec <= 60 ? 1 : 0);
export const URGENCY_TEXT = ['', 'Getting impatient', 'Annoyed!', 'About to leave!'];
export const URGENCY_COL = ['#3fbf5f', '#f0d030', '#ff7a30', '#ff2040'];
