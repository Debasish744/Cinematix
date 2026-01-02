
export enum ToolPreset {
  RUNWAY = 'runway',
  PIKA = 'pika',
  SORA = 'sora',
  VEO = 'veo'
}

export enum StylePreset {
  CINEMATIC = 'cinematic',
  ANIME = 'anime',
  REALISTIC = 'realistic',
  CYBERPUNK = 'cyberpunk',
  NOIR = 'noir'
}

export interface SceneBreakdown {
  duration: number;
  type: string;
  camera: string;
  lighting: string;
  description: string;
}

export interface PromptResult {
  id: string;
  concept: string;
  duration: number;
  style: string;
  aspectRatio: string;
  generatedPrompt: string;
  breakdown: SceneBreakdown[];
  createdAt: number;
  tool: ToolPreset;
  cameraAnalysis?: string;
  characterAnalysis?: string;
  contextAnalysis?: string;
  cinematicAnalysis?: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  isTranscription?: boolean;
}

export type ImageSize = '1K' | '2K' | '4K';
export type AspectRatio = '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '9:16' | '16:9' | '21:9';
