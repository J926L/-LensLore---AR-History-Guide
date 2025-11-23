export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

export interface LandmarkAnalysisResult {
  name: string;
  visualDescription: string;
}

export interface LandmarkFullDetails {
  description: string;
  sources: { title: string; uri: string }[];
}

export enum AppStatus {
  IDLE = 'IDLE',
  ANALYZING_IMAGE = 'ANALYZING_IMAGE',
  SEARCHING_INFO = 'SEARCHING_INFO',
  GENERATING_AUDIO = 'GENERATING_AUDIO',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR',
}

export interface AppError {
  message: string;
}
