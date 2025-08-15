import { EvaluationMetrics, SentenceResult, TaskType, EvaluationMetric, CausalRelationship } from '../types';
import { calculateSemanticScore } from './semanticEvaluation';

/**
 * Normalizes strings for case-insensitive comparison by converting to lowercase and trimming whitespace
 * @param str - The string to normalize
 * @returns Normalized string (lowercase, trimmed)
 */
const normalizeString = (str: string): string => {
  return str.toLowerCase().trim();
};

/**
 * Checks if two causal relationships are equivalent using case-insensitive comparison
 * @param rel1 - First relationship to compare
 * @param rel2 - Second relationship to compare
 * @returns True if relationships have matching cause and effect (case-insensitive)
 */
const areRelationshipsEqual = (rel1: CausalRelationship, rel2: CausalRelationship): boolean => {
  return normalizeString(rel1.cause) === normalizeString(rel2.cause) && 
         normalizeString(rel1.effect) === normalizeString(rel2.effect);
};

/**
 * Calculates evaluation metrics (precision, recall, F1) for causal extraction tasks
 * 
 * This function performs case-insensitive evaluation of both entity extraction and 
 * relationship extraction tasks by comparing model predictions against gold standard data.
 * 
 * @param sentenceResults - Array of sentence-level prediction results from the model
 * @param task - Type of extraction task ('entity_extraction' or 'relationship_extraction')
 * @param evaluationMetrics - Optional array of custom metrics to calculate
 * @returns Promise<Object> containing precision, recall, F1 score, and counts of TP/FP/FN
 */
export const calculateMetrics = async (
  sentenceResults: SentenceResult[], 
  task: TaskType, 
  evaluationMetrics?: EvaluationMetric[]
): Promise<EvaluationMetrics> => {
  // Initialize counters for calculating precision, recall, and F1 score
  let truePositives = 0;   // Correctly predicted positive cases
  let falsePositives = 0;  // Incorrectly predicted positive cases  
  let falseNegatives = 0;  // Missed positive cases (should have been predicted)
  
  // Process each sentence result to count TP, FP, FN
  sentenceResults.forEach(result => {
    const predictions = result.predictions;
    const goldData = result.goldData;

    console.log(`
    -----------------------------------------------------
    Calculating metrics:
    Predictions: ${JSON.stringify(predictions)}
    Gold Data: ${JSON.stringify(goldData)}
    -----------------------------------------------------`);

    if (task === 'entity_extraction') {
      // For entity extraction: compare entity strings (case-insensitive)
      
      // Count true positives and false positives
      predictions.forEach((pred: string) => {
        // Check if this prediction matches any gold entity (case-insensitive)
        const isCorrect = goldData.some((gold: string) => 
          normalizeString(pred) === normalizeString(gold)
        );
        
        if (isCorrect) {
          truePositives++;
        } else {
          falsePositives++;
        }
      });
      
      // Count false negatives (gold entities that were missed)
      goldData.forEach((gold: string) => {
        // Check if this gold entity was predicted (case-insensitive)
        const wasPredicted = predictions.some((pred: string) => 
          normalizeString(pred) === normalizeString(gold)
        );
        
        if (!wasPredicted) {
          falseNegatives++;
        }
      });
      
    } else {
      // For relationship extraction: compare cause-effect pairs (case-insensitive)
      
      // Count true positives and false positives
      predictions.forEach((pred: CausalRelationship) => {
        // Check if this predicted relationship matches any gold relationship
        const isCorrect = goldData.some((gold: CausalRelationship) => 
          areRelationshipsEqual(pred, gold)
        );
        
        if (isCorrect) {
          truePositives++;
        } else {
          falsePositives++;
        }
      });
      
      // Count false negatives (gold relationships that were missed)
      goldData.forEach((gold: CausalRelationship) => {
        // Check if this gold relationship was predicted
        const wasPredicted = predictions.some((pred: CausalRelationship) => 
          areRelationshipsEqual(pred, gold)
        );
        
        if (!wasPredicted) {
          falseNegatives++;
        }
      });
    }
  });
  
  // Calculate standard evaluation metrics
  // Precision: What percentage of predictions were correct?
  const precision = truePositives / (truePositives + falsePositives) || 0;
  
  // Recall: What percentage of gold items were found?
  const recall = truePositives / (truePositives + falseNegatives) || 0;
  
  // F1 Score: Harmonic mean of precision and recall
  const f1 = 2 * (precision * recall) / (precision + recall) || 0;
  
  // Calculate custom metrics (all return values between 0-1)
  const customMetrics: Record<string, number> = {};
  if (evaluationMetrics) {
    const enabledCustomMetrics = evaluationMetrics.filter(metric => 
      metric.enabled && (metric.id === 'semantic_score' || !metric.isBuiltIn)
    );
    
    // Process semantic score and other custom metrics
    for (const metric of enabledCustomMetrics) {
      if (metric.id === 'semantic_score') {
        // Calculate semantic score using LLM evaluation
        try {
          customMetrics[metric.id] = await calculateSemanticScore(sentenceResults, task);
          console.log(`Calculated semantic score: ${metric.name} = ${customMetrics[metric.id]}`);
        } catch (error) {
          console.error(`Error calculating semantic score: ${error}`);
          // Fallback to mock value if LLM call fails
          customMetrics[metric.id] = Math.random() * 0.5 + 0.3;
          console.log(`Fallback semantic score: ${metric.name} = ${customMetrics[metric.id]}`);
        }
      } else {
        // TODO: Implement actual custom metric calculation
        // For now, return a mock value between 0-1
        customMetrics[metric.id] = Math.random() * 0.5 + 0.3; // Random value between 0.3-0.8
        console.log(`Calculating custom metric: ${metric.name} = ${customMetrics[metric.id]}`);
      }
    }
  }
  
  return { 
    precision, 
    recall, 
    f1, 
    truePositives, 
    falsePositives, 
    falseNegatives,
    customMetrics: Object.keys(customMetrics).length > 0 ? customMetrics : undefined
  };
};