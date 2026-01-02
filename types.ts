
export enum ToolPreset {
  RUNWAY = 'runway',
  PIKA = 'pika',
  SORA = 'sora'
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
  // 4C Model components for UI display
  cameraAnalysis?: string;
  characterAnalysis?: string;
  contextAnalysis?: string;
  cinematicAnalysis?: string;
}
