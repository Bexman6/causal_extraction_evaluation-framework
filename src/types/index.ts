export interface Sentence {
  id: string;
  text: string;
  gold_entities: string[];
  gold_relationships: CausalRelationship[];
}

export interface CausalRelationship {
  cause: string;
  effect: string;
  location?: string;
  confidence?: number;
}

export interface Dataset {
  sentences: Sentence[];
}

export interface Prompt {
  id: string;
  name: string;
  template: string;
  isCustom: boolean;
}

export interface EvaluationMetrics {
  precision: number;
  recall: number;
  f1: number;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  customMetrics?: Record<string, number>;
}

export interface SentenceResult {
  sentenceId: string;
  text: string;
  predictions: any[];
  goldData: any[];
  apiResponse?: APIResponse;
}

export interface EvaluationResult {
  runId: string;
  promptId: string;
  promptName: string;
  promptTemplate: string;
  model: string;
  dataset: string;
  task: 'entity_extraction' | 'relationship_extraction';
  timestamp: string;
  metrics: EvaluationMetrics;
  sentenceResults: SentenceResult[];
  selectedMetrics: string[];
  outputFormat: 'json' | 'raw';
}

export interface EvaluationRun {
  runId: string;
  results: EvaluationResult[];
}

export type TaskType = 'entity_extraction' | 'relationship_extraction';
export interface EvaluationMetric {
  id: string;
  name: string;
  description: string;
  template?: string;
  enabled: boolean;
  isBuiltIn: boolean;
}

export type TabType = 'setup' | 'evaluation' | 'progress' | 'results' | 'database';

export type ModelProvider = 'anthropic' | 'openai';

export interface ModelConfig {
  id: string;
  name: string;
  provider: ModelProvider;
  modelId: string;
  maxTokens?: number;
  temperature?: number;
  supportedTasks: TaskType[];
}

export interface APIResponse {
  success: boolean;
  content?: string;
  error?: string;
  tokens?: {
    input: number;
    output: number;
    total: number;
  };
  latency?: number;
}

export interface LLMRequest {
  prompt: string;
  model: ModelConfig;
  temperature?: number;
  maxTokens?: number;
}

export interface EvaluationProgress {
  current: number;
  total: number;
  currentSentence?: string;
  currentModel?: string;
  currentPrompt?: string;
  errors: Array<{
    sentenceId: string;
    model: string;
    prompt: string;
    error: string;
  }>;
}