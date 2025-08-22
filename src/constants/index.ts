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
    id: 'gpt-4',
    name: 'GPT-4',
    provider: 'openai',
    modelId: 'gpt-4',
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
    supportedTasks: ['entity_extraction', 'relationship_extraction'] as TaskType[]
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    modelId: 'gpt-3.5-turbo',
    maxTokens: 4000,
    temperature: 0.0,
    supportedTasks: ['entity_extraction', 'relationship_extraction'] as TaskType[]
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

export const STANDARD_SEMANTIC_RELATIONSHIP_PROMPT = `You are evaluating relationship extraction predictions that did not exactly match the gold standard relationships. Your task is to determine how many of the predicted relationships are semantically equivalent to relationships in the gold standard, even if they don't match exactly.

Non-matching Predicted Relationships: {predicted}  
Gold Standard Relationships: {gold}

Count how many predicted relationships are semantically equivalent to gold standard relationships (e.g., cause-effect pairs that express the same meaning with different wording).

Return only a single number representing the count of semantic matches. Do not include any explanation.`;

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