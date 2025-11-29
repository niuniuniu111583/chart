export enum VoiceName {
  Puck = 'Puck',
  Charon = 'Charon',
  Kore = 'Kore',
  Fenrir = 'Fenrir',
  Zephyr = 'Zephyr',
}

export interface AudioState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
}

export interface SummaryResult {
  script: string;
  audioBuffer: AudioBuffer | null;
}
