import { Dataset, Prompt, ModelConfig, TaskType } from '../types';

export const modelConfigs: ModelConfig[] = [
  // Claude 4 Models (Latest)
  {
    id: 'claude-4-opus',
    name: 'Claude 4 Opus',
    provider: 'anthropic',
    modelId: 'claude-opus-4-20250514',
    maxTokens: 4000,
    temperature: 0.0,
    supportedTasks: ['entity_extraction', 'relationship_extraction'] as TaskType[]
  },
  {
    id: 'claude-4-sonnet',
    name: 'Claude 4 Sonnet',
    provider: 'anthropic',
    modelId: 'claude-sonnet-4-20250514',
    maxTokens: 4000,
    temperature: 0.0,
    supportedTasks: ['entity_extraction', 'relationship_extraction'] as TaskType[]
  },
  
  // Claude 3.5 Models
  {
    id: 'claude-3-5-opus',
    name: 'Claude 3.5 Opus',
    provider: 'anthropic',
    modelId: 'claude-3-5-opus-20241022',
    maxTokens: 4000,
    temperature: 0.0,
    supportedTasks: ['entity_extraction', 'relationship_extraction'] as TaskType[]
  },
  {
    id: 'claude-3-5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    modelId: 'claude-3-5-sonnet-20241022',
    maxTokens: 4000,
    temperature: 0.0,
    supportedTasks: ['entity_extraction', 'relationship_extraction'] as TaskType[]
  },
  {
    id: 'claude-3-5-haiku',
    name: 'Claude 3.5 Haiku',
    provider: 'anthropic',
    modelId: 'claude-3-5-haiku-20241022',
    maxTokens: 4000,
    temperature: 0.0,
    supportedTasks: ['entity_extraction', 'relationship_extraction'] as TaskType[]
  },
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    modelId: 'gpt-4-turbo-preview',
    maxTokens: 4000,
    temperature: 0.0,
    supportedTasks: ['entity_extraction', 'relationship_extraction'] as TaskType[],
    pricing: {
      input: 10,
      output: 30
    },
    description: 'High-performance model with 128k context window'
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    modelId: 'gpt-3.5-turbo',
    maxTokens: 4000,
    temperature: 0.0,
    supportedTasks: ['entity_extraction', 'relationship_extraction'] as TaskType[],
    pricing: {
      input: 0.50,
      output: 1.50
    },
    description: 'Fast and cost-effective model for simple tasks'
  },
  
  // New OpenAI Models
  {
    id: 'o1-pro',
    name: 'o1-Pro',
    provider: 'openai',
    modelId: 'o1-pro',
    maxTokens: 4000,
    temperature: 0.0,
    supportedTasks: ['entity_extraction', 'relationship_extraction'] as TaskType[],
    pricing: {
      input: 150,
      output: 600
    },
    description: 'Most advanced reasoning model'
  },
  {
    id: 'o3-pro',
    name: 'o3-Pro',
    provider: 'openai',
    modelId: 'o3-pro',
    maxTokens: 4000,
    temperature: 0.0,
    supportedTasks: ['entity_extraction', 'relationship_extraction'] as TaskType[],
    pricing: {
      input: 20,
      output: 80
    },
    description: 'Highest-tier dedicated reasoning model'
  },
  {
    id: 'o3',
    name: 'o3',
    provider: 'openai',
    modelId: 'o3',
    maxTokens: 4000,
    temperature: 0.0,
    supportedTasks: ['entity_extraction', 'relationship_extraction'] as TaskType[],
    pricing: {
      input: 2,
      output: 8
    },
    description: 'General-purpose, step-by-step reasoning model'
  },
  {
    id: 'o4-mini',
    name: 'o4-mini',
    provider: 'openai',
    modelId: 'o4-mini',
    maxTokens: 4000,
    temperature: 0.0,
    supportedTasks: ['entity_extraction', 'relationship_extraction'] as TaskType[],
    pricing: {
      input: 1.10,
      output: 4.40
    },
    description: 'Efficient, multimodal reasoning model'
  },
  {
    id: 'gpt-4-1',
    name: 'GPT-4.1',
    provider: 'openai',
    modelId: 'gpt-4.1',
    maxTokens: 4000,
    temperature: 0.0,
    supportedTasks: ['entity_extraction', 'relationship_extraction'] as TaskType[],
    pricing: {
      input: 2,
      output: 8
    },
    description: 'Long-context, general-purpose model'
  },
  {
    id: 'gpt-4-1-mini',
    name: 'GPT-4.1 mini',
    provider: 'openai',
    modelId: 'gpt-4.1-mini',
    maxTokens: 4000,
    temperature: 0.0,
    supportedTasks: ['entity_extraction', 'relationship_extraction'] as TaskType[],
    pricing: {
      input: 0.40,
      output: 1.60
    },
    description: 'More affordable variant of GPT-4.1'
  },
  {
    id: 'gpt-4-1-nano',
    name: 'GPT-4.1 nano',
    provider: 'openai',
    modelId: 'gpt-4.1-nano',
    maxTokens: 4000,
    temperature: 0.0,
    supportedTasks: ['entity_extraction', 'relationship_extraction'] as TaskType[],
    pricing: {
      input: 0.10,
      output: 0.40
    },
    description: 'Fastest and least expensive option'
  },
  
  // GPT-5 Models (Latest Generation)
  {
    id: 'gpt-5',
    name: 'GPT-5',
    provider: 'openai',
    modelId: 'gpt-5',
    maxTokens: 4000,
    temperature: 0.0,
    supportedTasks: ['entity_extraction', 'relationship_extraction'] as TaskType[],
    pricing: {
      input: 1.25,
      output: 10.00
    },
    description: 'OpenAI\'s most advanced general-purpose model with expert-level intelligence',
    reasoningEffort: 'high',
    verbosity: 'medium'
  },
  {
    id: 'gpt-5-mini',
    name: 'GPT-5 mini',
    provider: 'openai',
    modelId: 'gpt-5-mini',
    maxTokens: 4000,
    temperature: 0.0,
    supportedTasks: ['entity_extraction', 'relationship_extraction'] as TaskType[],
    pricing: {
      input: 0.25,
      output: 2.00
    },
    description: 'Faster, cost-effective variant of GPT-5 with ~85-95% performance',
    reasoningEffort: 'medium',
    verbosity: 'low'
  },
  {
    id: 'gpt-5-nano',
    name: 'GPT-5 nano',
    provider: 'openai',
    modelId: 'gpt-5-nano',
    maxTokens: 4000,
    temperature: 0.0,
    supportedTasks: ['entity_extraction', 'relationship_extraction'] as TaskType[],
    pricing: {
      input: 0.05,
      output: 0.40
    },
    description: 'Most efficient GPT-5 variant optimized for speed and cost',
    reasoningEffort: 'low',
    verbosity: 'low'
  },
  
  // DeepSeek Models
  {
    id: 'deepseek-v3-1-chat',
    name: 'DeepSeek-V3.1 (Non-thinking Mode)',
    provider: 'deepseek',
    modelId: 'deepseek-chat',
    maxTokens: 4000,
    temperature: 0.0,
    supportedTasks: ['entity_extraction', 'relationship_extraction'] as TaskType[],
    pricing: {
      input: 0.27,
      output: 1.10
    },
    description: 'Fast, cost-effective model for conventional tasks with 128K context window'
  },
  {
    id: 'deepseek-v3-1-reasoner',
    name: 'DeepSeek-V3.1 (Thinking Mode)',
    provider: 'deepseek',
    modelId: 'deepseek-reasoner',
    maxTokens: 4000,
    temperature: 0.0,
    supportedTasks: ['entity_extraction', 'relationship_extraction'] as TaskType[],
    pricing: {
      input: 0.55,
      output: 2.19
    },
    description: 'Advanced reasoning model with thinking capabilities and 128K context window'
  },
  
  // Google Gemini Models
  {
    id: 'gemini-2-5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'google',
    modelId: 'gemini-2.5-pro',
    maxTokens: 65536,
    temperature: 0.0,
    supportedTasks: ['entity_extraction', 'relationship_extraction'] as TaskType[]
  },
  {
    id: 'gemini-2-5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'google',
    modelId: 'gemini-2.5-flash',
    maxTokens: 65536,
    temperature: 0.0,
    supportedTasks: ['entity_extraction', 'relationship_extraction'] as TaskType[]
  },
  {
    id: 'gemini-2-5-flash-lite',
    name: 'Gemini 2.5 Flash Lite',
    provider: 'google',
    modelId: 'gemini-2.5-flash-lite',
    maxTokens: 65536,
    temperature: 0.0,
    supportedTasks: ['entity_extraction', 'relationship_extraction'] as TaskType[]
  }
];

export const mockTestData: Record<string, Dataset> = {
  "Mock_Dataset_1": {
    "textBlocks": [
      {
        "id": "s1",
        "text": "The heavy rain caused flooding in the city.",
        "gold_entities": ["heavy rain", "flooding"],
        "gold_relationships": [
          { "cause": "heavy rain", "effect": "flooding" }
        ]
      },
      {
        "id": "s2",
        "text": "Smoking increases the risk of lung cancer.",
        "gold_entities": ["Smoking", "lung cancer"],
        "gold_relationships": [
          { "cause": "Smoking", "effect": "lung cancer" }
        ]
      }
    ]
  },
  "Mock_Dataset_2": {
    "textBlocks": [
      {
        "id": "s1",
        "text": "The heavy rain caused flooding in the city.",
        "gold_entities": ["heavy rain", "flooding"],
        "gold_relationships": [
          { "cause": "heavy rain", "effect": "flooding" }
        ]
      },
      {
        "id": "s2",
        "text": "Smoking increases the risk of lung cancer.",
        "gold_entities": ["Smoking", "lung cancer"],
        "gold_relationships": [
          { "cause": "Smoking", "effect": "lung cancer" }
        ]
      }
    ]
  }
};

export const initialPrompts: Record<string, Prompt[]> = {
  "entity_extraction": [
    {
      "id": "ee_prompt_1",
      "name": "Basic Entity Extraction",
      "template": "Extract all causal entities from the following text: {text}",
      "isCustom": false
    },
    {
      "id": "ee_prompt_2",
      "name": "Detailed Entity Extraction",
      "template": "Identify and extract all entities involved in causal relationships in this text: {text}.",
      "isCustom": false
    }
  ],
  "relationship_extraction": [
    {
      "id": "re_prompt_1",
      "name": "Basic Relationship Extraction",
      "template": `Extract causal relationships from the following text based on the identified entities "{entities}": 
      {text}`,
      "isCustom": false
    },
    {
      "id": "re_prompt_2",
      "name": "Structured Relationship Extraction",
      "template": 
      `Text: "{text}"
      Entities: {entities}
      Based on the text and identified entities, extract causal relationships.`,
      "isCustom": false
    }
  ]
};

// JSON Output Format Templates
export const jsonFormatTemplates = {
  entity_extraction: {
    instructions: 'Response Format (strict JSON):\nReturn a JSON object with a single key "entities" whose value is an array of the extracted entity strings. Do not output any other text or explanation.',
    example: {
      entities: ["entity_1", "entity_2", "entity_3"]
    },
    description: "Entity extraction returns a JSON object with an 'entities' array containing all identified causal entities from the text."
  },
  relationship_extraction: {

    instructions: `Response Format (strict JSON): Return the output as a list of JSON objects with the following structure and do not output any other text or explanation.

  [
    {
      "cause": "<entity from list>",
      "effect": "<entity from list>"
    },
    ...
  ]`,
    example: {
      relationships: [
        {
          cause: "cause_entity",
          effect: "effect_entity"
        }
      ]
    },
    description: "Relationship extraction returns a JSON array of objects, each containing 'cause' and 'effect' keys representing the causal relationships identified in the given text."
  }
};

// Standard Semantic Matching prompts for hybrid evaluation
export const STANDARD_SEMANTIC_ENTITY_PROMPT = `You are an expert evaluator of causal-entity extraction.
  Given the following inputs:

  • gold_entities: {gold}  
  • predicted_entities: {predicted}  

  Your task is to compare predicted_entities against gold_entities and produce an evaluation. 
  Focus on *semantic* rather than purely lexical overlap.  
  Treat synonyms, inflections, acronyms, abbreviations, and clear hypernym ↔ hyponym cases as potential matches (e.g., “CO₂ emissions” ≈ “carbon dioxide emissions”; “heart attack” ≈ “myocardial infarction”).  
  When unsure, rely on domain knowledge and common usage.  
  Produce an evaluation with these fields:

  Evaluation procedure (think step-by-step privately, but show only the final JSON):
  
  1. **Normalize** entities  
   • lowercase, trim whitespace, remove punctuation that does not change meaning  
   • expand common abbreviations (e.g., “GDP” → “gross domestic product”)  

  2. **Match classes**  
    • **semantic_matches** — reasonable synonym / abbreviation / hypernym-hyponym pair  
    • **partial_matches**  — one list’s entity is a strict substring of the other *and* they denote the same concept  
    
  3. **Output format**  
  Return a single valid **JSON** object with these keys *in the exact order shown*:  

  {
  "semantic_match_pairs": [
    { "gold": "<gold entity>", "predicted": "<predicted entity>" }
  ],
  "partial_match_pairs": [
    { "gold": "<gold entity>", "predicted": "<predicted entity>" }
  ]
}`;

export const STANDARD_SEMANTIC_RELATIONSHIP_PROMPT = `You are an expert on evaluating causal relationships between entities based on their text of origin. You get relationship extraction predictions that did not exactly match the gold standard relationships. Your task is to determine is to compare predicted relationships against gold relationships and produce an evaluation. 

Focus on *semantic* rather than purely lexical overlap.  
Treat synonyms, inflections, acronyms, abbreviations, and clear hypernym ↔ hyponym cases as potential matches (e.g., “CO₂ emissions” ≈ “carbon dioxide emissions”; “heart attack” ≈ “myocardial infarction”).  
When unsure, rely on domain knowledge and common usage.  
Produce an evaluation with these fields:

Evaluation procedure (think step-by-step privately, but show only the final JSON):
  
  1. **Normalize** relationships  
   • lowercase, trim whitespace, remove punctuation that does not change meaning  
   • expand common abbreviations (e.g., “GDP” → “gross domestic product”)  

  2. **Match classes**  
    • **semantic_matches** — After normalization, the cause and the effect in the predicted pair each denote the same concept as the corresponding gold entities (e.g., synonym: "MI" ≈ "myocardial infarction"; abbreviation: "LDL" ≈ "low-density lipoprotein"; hypernym/hyponym: "antihypertensives" ≈ "ACE inhibitors"). The edge’s direction (cause → effect) is the same, and the polarity is consistent (e.g., "increases risk of" ≈ "is a risk factor for"; "reduces" ≈ "lowers"; but not "increases" vs "decreases").  
    • **partial_matches**  — On at least one side (cause or effect), one string is a strict substring of the other and both refer to the same underlying head concept (e.g., "acute myocardial infarction" vs "myocardial infarction"; "type 2 diabetes mellitus" vs "diabetes mellitus"). The other side is at least a semantic match (per rules above). Direction and polarity must be preserved.
    
  3. **Output format**  
  Return a single valid **JSON** object with these keys *in the exact order shown*:  

  {
  "semantic_match_pairs": [
    { "gold": "<gold relationship>", "predicted": "<predicted relationship>" }
  ],
  "partial_match_pairs": [
    { "gold": "<gold relationship>", "predicted": "<predicted relationship>" }
  ]
}`;

export const SEMANTIC_EVAL_MODEL_CONFIG: ModelConfig = {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    modelId: 'gpt-4-turbo-preview',
    maxTokens: 4000,
    temperature: 0.0,
    supportedTasks: ['entity_extraction', 'relationship_extraction'] as TaskType[]
  };



// Legacy support - keeping for backward compatibility
export const mockModels = modelConfigs.map(config => config.id);