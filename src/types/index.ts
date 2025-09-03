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
  textBlocks: Sentence[];
}

export interface Prompt {
  id: string;
  name: string;
  template: string;
  isCustom: boolean;
}

export interface MetricsResult {
  precision: number;
  recall: number;
  f1: number;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  // Optional detailed match categorization (only for semantic matching)
  exact?: string[];
  semantic?: string[];
  partial?: string[];
  noMatch?: string[];
}

export interface MetricDisplayValue {
  metricType: string;
  values: string[]; // e.g., ['precision'], ['f1'], ['precision', 'recall']
}

export interface EvaluationMetrics {
  precision: number;
  recall: number;
  f1: number;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  // Specifies which values each metric type wants to display in charts
  displayedValues: MetricDisplayValue[];
  // Optional additional metrics for when multiple types are calculated
  standard?: MetricsResult;
  semanticMatching?: MetricsResult;
  // Future metrics can be added here (e.g., fuzzy?, weighted?, etc.)
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
  task: 'entity_extraction' | 'relation_classification' | 'single_prompt_full_causal_extraction';
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

export type TaskType = 'entity_extraction' | 'relation_classification' | 'single_prompt_full_causal_extraction';
export interface EvaluationMetric {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

export type TabType = 'setup' | 'evaluation' | 'progress' | 'results' | 'database';

export type ModelProvider = 'anthropic' | 'openai' | 'google' | 'deepseek';

export interface ModelConfig {
  id: string;
  name: string;
  provider: ModelProvider;
  modelId: string;
  maxTokens?: number;
  temperature?: number;
  supportedTasks: TaskType[];
  pricing?: {
    input: number;  // Price per million input tokens
    output: number; // Price per million output tokens
  };
  description?: string;
  // GPT-5 specific parameters for Responses API
  reasoningEffort?: 'low' | 'medium' | 'high';
  verbosity?: 'low' | 'medium' | 'high';
}

// OpenAI Responses API response structure
export interface ResponsesAPIResponse {
  output_text?: string;
  content?: string;
  text?: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
  error?: {
    message: string;
    type: string;
  };
}

// OpenAI Chat Completions API response structure
export interface ChatCompletionsResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  error?: {
    message: string;
    type: string;
  };
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

export interface ExactMatchResult {
  exactMatches: Array<{goldIndex: number, predIndex: number}>;
  unmatchedGold: string[];
  unmatchedPredictions: string[];
}

export interface StandardSemanticMetricsResult {
  precision: number;
  recall: number;
  f1: number;
  TPw: number;  // True positives weighted
  FPw: number;  // False positives weighted
  FNw: number;  // False negatives weighted
  exact: string[];      // Entities with exact matches
  semantic: string[];   // Entities with semantic matches
  partial: string[];    // Entities with partial matches
  noMatch: string[];    // Entities with no matches
}