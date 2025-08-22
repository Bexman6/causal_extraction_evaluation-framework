import { TaskType, Sentence, SentenceResult, ModelConfig, APIResponse, LLMRequest } from '../types';
import { LLMServiceFactory, substitutePromptVariables, retryWithBackoff } from '../services/llmService';
import { parseResponse, validateParsedResponse } from './responseParser';


export const processEvaluationWithLLM = async (
  sentences: Sentence[],
  task: TaskType,
  model: ModelConfig,
  promptTemplate: string,
  promptName: string,
  onProgress?: (current: number, total: number, currentSentence?: string) => void
): Promise<SentenceResult[]> => {
  const results: SentenceResult[] = [];
  const service = LLMServiceFactory.getService(model);


  console.log(`🔍 Processing ${sentences.length} sentences for task: ${task}
    Using model: ${model.name}
    Using prompt: ${promptName}`);



  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    
    try {
      // Substitute variables in prompt template
      const variables: Record<string, string> = {
        text: sentence.text,
        task: task === 'entity_extraction' ? 'entities' : 'relationships'
      };

      // Add entities variable for relationship extraction
      if (task === 'relationship_extraction') {
        variables.entities = sentence.gold_entities.join(', ');
      }

      const prompt = substitutePromptVariables(promptTemplate, variables);

      console.log("This prompt will be sent to the LLM:\n" + prompt)
      
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

      // Update progress after successful API response
      if (onProgress) {
        onProgress(i + 1, sentences.length, sentence.text);
      }

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
      
      // Update progress after error response
      if (onProgress) {
        onProgress(i + 1, sentences.length, sentence.text);
      }
      
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