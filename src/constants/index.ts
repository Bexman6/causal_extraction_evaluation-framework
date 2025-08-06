import { Dataset, Prompt, ModelConfig, TaskType } from '../types';

export const modelConfigs: ModelConfig[] = [
  {
    id: 'claude-3-opus',
    name: 'Claude 3 Opus',
    provider: 'anthropic',
    modelId: 'claude-3-opus-20240229',
    maxTokens: 4000,
    temperature: 0.0,
    supportedTasks: ['entity_extraction', 'relationship_extraction'] as TaskType[]
  },
  {
    id: 'claude-3-sonnet',
    name: 'Claude 3 Sonnet',
    provider: 'anthropic',
    modelId: 'claude-3-sonnet-20240229',
    maxTokens: 4000,
    temperature: 0.0,
    supportedTasks: ['entity_extraction', 'relationship_extraction'] as TaskType[]
  },
  {
    id: 'claude-3-haiku',
    name: 'Claude 3 Haiku',
    provider: 'anthropic',
    modelId: 'claude-3-haiku-20240307',
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
  "dataset1": {
    "sentences": [
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
      "template": "Identify and extract all entities involved in causal relationships in this text: {text}. Format as JSON array.",
      "isCustom": false
    }
  ],
  "relationship_extraction": [
    {
      "id": "re_prompt_1",
      "name": "Basic Relationship Extraction",
      "template": "Extract causal relationships from: {text}",
      "isCustom": false
    },
    {
      "id": "re_prompt_2",
      "name": "Structured Relationship Extraction",
      "template": "Find all cause-effect relationships in: {text}. Return as JSON with 'cause' and 'effect' fields.",
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
    instructions: '\n\n// TODO: Add JSON format instructions for relationship extraction',
    example: {
      // TODO: Add example structure for relationship extraction
      relationships: [
        {
          cause: "TODO",
          effect: "TODO", 
          confidence: "TODO"
        }
      ]
    },
    description: "TODO: Relationship extraction format - structure not yet implemented"
  }
};

// Legacy support - keeping for backward compatibility
export const mockModels = modelConfigs.map(config => config.id);