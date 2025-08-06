import { TaskType, Sentence, SentenceResult, ModelConfig, APIResponse, LLMRequest } from '../types';
import { LLMServiceFactory, substitutePromptVariables, retryWithBackoff } from '../services/llmService';
import { parseResponse, validateParsedResponse } from './responseParser';

export const generateMockPredictions = (sentence: Sentence, task: TaskType): any[] => {
  if (task === 'entity_extraction') {
    const allEntities = ["heavy rain", "flooding", "city", "weather", "damage", "smoking", "risk", "lung cancer", "health"];
    return sentence.gold_entities.filter(() => Math.random() > 0.1)
      .concat(allEntities.filter(() => Math.random() > 0.8).slice(0, 2));
  } else {
    return sentence.gold_relationships.map(rel => ({
      ...rel,
      confidence: Math.random()
    })).filter(() => Math.random() > 0.2);
  }
};

export const processEvaluationData = (
  sentences: Sentence[], 
  task: TaskType
): SentenceResult[] => {
  return sentences.map(sentence => ({
    sentenceId: sentence.id,
    text: sentence.text,
    predictions: generateMockPredictions(sentence, task),
    goldData: task === 'entity_extraction' ? sentence.gold_entities : sentence.gold_relationships
  }));
};

export const processEvaluationWithLLM = async (
  sentences: Sentence[],
  task: TaskType,
  model: ModelConfig,
  promptTemplate: string,
  onProgress?: (current: number, total: number, currentSentence?: string) => void
): Promise<SentenceResult[]> => {
  const results: SentenceResult[] = [];
  const service = LLMServiceFactory.getService(model);

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    
    // Update progress
    if (onProgress) {
      onProgress(i, sentences.length, sentence.text);
    }

    try {
      // Substitute variables in prompt template
      const prompt = substitutePromptVariables(promptTemplate, {
        text: sentence.text,
        task: task === 'entity_extraction' ? 'entities' : 'relationships'
      });

      const request: LLMRequest = {
        prompt,
        model,
        temperature: model.temperature,
        maxTokens: model.maxTokens
      };

      // Call LLM with retry logic
      const apiResponse = await retryWithBackoff(
        () => service.callModel(request),
        3, // max retries
        1000 // base delay
      );

      let predictions: any[] = [];
      
      if (apiResponse.success && apiResponse.content) {
        try {
          predictions = parseResponse(apiResponse.content, task);
          
          // Validate parsed response
          if (!validateParsedResponse(predictions, task)) {
            console.warn(`Invalid parsed response for sentence ${sentence.id}, falling back to empty array`);
            predictions = [];
          }
        } catch (parseError) {
          console.warn(`Failed to parse response for sentence ${sentence.id}:`, parseError);
          predictions = [];
        }
      }

      const result: SentenceResult = {
        sentenceId: sentence.id,
        text: sentence.text,
        predictions,
        goldData: task === 'entity_extraction' ? sentence.gold_entities : sentence.gold_relationships,
        apiResponse
      };

      results.push(result);

      // Add delay between requests to avoid rate limiting
      if (i < sentences.length - 1) {
        await delay(500);
      }

    } catch (error) {
      // Create result with error information
      const errorResponse: APIResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        latency: 0
      };

      const result: SentenceResult = {
        sentenceId: sentence.id,
        text: sentence.text,
        predictions: [],
        goldData: task === 'entity_extraction' ? sentence.gold_entities : sentence.gold_relationships,
        apiResponse: errorResponse
      };

      results.push(result);
      console.error(`Error processing sentence ${sentence.id}:`, error);
    }
  }

  // Final progress update
  if (onProgress) {
    onProgress(sentences.length, sentences.length);
  }

  return results;
};

export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};