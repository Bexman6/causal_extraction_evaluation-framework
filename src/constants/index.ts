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

// Semantic evaluation configuration for entity extraction
export const SEMANTIC_EVAL_ENTITY_PROMPT = `Compare the semantic similarity between the predicted output and the gold standard output. Rate the similarity on a scale from 0.0 to 1.0, where 1.0 means perfect semantic match and 0.0 means completely different.

Predicted: {predicted}
Gold: {gold}

Return only a decimal number between 0.0 and 1.0 representing the semantic similarity score.`;
      
// Semantic evaluation configuration for relationship extraction
export const SEMANTIC_EVAL_RELATIONSHIP_PROMPT = `Compare the semantic similarity between the predicted output and the gold standard output. Rate the similarity on a scale from 0.0 to 1.0, where 1.0 means perfect semantic match and 0.0 means completely different.

Predicted: {predicted}
Gold: {gold}

Return only a decimal number between 0.0 and 1.0 representing the semantic similarity score.`;

export const SEMANTIC_EVAL_MODEL_CONFIG: ModelConfig = {
  id: 'claude-3-haiku',
  name: 'Claude 3 Haiku',
  provider: 'anthropic',
  modelId: 'claude-3-haiku-20240307',
  maxTokens: 1000,
  temperature: 0.0,
  supportedTasks: ['entity_extraction', 'relationship_extraction']
};

// Legacy support - keeping for backward compatibility
export const mockModels = modelConfigs.map(config => config.id);