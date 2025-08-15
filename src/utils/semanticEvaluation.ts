import { SentenceResult, TaskType} from '../types';
import { LLMServiceFactory } from '../services/llmService';
import { SEMANTIC_EVAL_ENTITY_PROMPT, SEMANTIC_EVAL_RELATIONSHIP_PROMPT, SEMANTIC_EVAL_MODEL_CONFIG } from '../constants';
// TODO imports for when constants are defined:
// import { SEMANTIC_EVAL_PROMPT, SEMANTIC_EVAL_MODEL } from '../constants';

/**
 * Calculates semantic score using LLM evaluation
 * @param sentenceResults - Array of sentence-level prediction results
 * @param task - Type of extraction task (unused for now)
 * @returns Promise<number> - Semantic score between 0 and 1
 */
export const calculateSemanticScore = async (
  sentenceResults: SentenceResult[], 
  task: TaskType
): Promise<number> => {
  
  const evalModelConfig = SEMANTIC_EVAL_MODEL_CONFIG;

  let totalScore = 0;
  let validSentences = 0;
  
  for (const result of sentenceResults) {
    try {
      // Prepare predicted and gold data as strings for LLM evaluation
      const predicted = JSON.stringify(result.predictions);
      const gold = JSON.stringify(result.goldData);

      let semEvalPrompt: string;
      if (task === 'entity_extraction') {
        semEvalPrompt = SEMANTIC_EVAL_ENTITY_PROMPT
          .replace('{predicted}', predicted)
          .replace('{gold}', gold);
      } else {
        semEvalPrompt = SEMANTIC_EVAL_RELATIONSHIP_PROMPT
          .replace('{predicted}', predicted)
          .replace('{gold}', gold);
      }

      // Call LLM service
      const llmService = LLMServiceFactory.getService(evalModelConfig);
      const response = await llmService.callModel({
        prompt: semEvalPrompt,
        model: evalModelConfig,
        temperature: 0.0,
        maxTokens: 1000
      });
      
      if (response.success && response.content) {
        // Parse the score from LLM response
        const scoreMatch = response.content.match(/\d*\.?\d+/);
        if (scoreMatch) {
          const score = parseFloat(scoreMatch[0]);
          if (score >= 0 && score <= 1) {
            totalScore += score;
            validSentences++;
          }
        }
      }
    } catch (error) {
      console.error('Error calculating semantic score for sentence:', result.sentenceId, error);
      // Continue processing other sentences even if one fails
    }
  }
  
  // Return average score across all sentences
  return validSentences > 0 ? totalScore / validSentences : 0;
};

/**
 * Formats prediction and gold data for semantic evaluation
 * @param predictions - Model predictions
 * @param goldData - Gold standard data
 * @param task - Extraction task type
 * @returns Formatted strings for LLM comparison
 */
export const formatDataForSemanticEval = (
  predictions: any[], 
  goldData: any[], 
  task: TaskType
): { predicted: string; gold: string } => {
  if (task === 'entity_extraction') {
    return {
      predicted: predictions.join(', '),
      gold: goldData.join(', ')
    };
  } else {
    // relationship_extraction
    const formatRelationships = (rels: any[]) => 
      rels.map(rel => `${rel.cause} -> ${rel.effect}`).join('; ');
    
    return {
      predicted: formatRelationships(predictions),
      gold: formatRelationships(goldData)
    };
  }
};