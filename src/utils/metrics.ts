import { EvaluationMetrics, SentenceResult, TaskType, EvaluationMetric, CausalRelationship, MetricsResult, MetricDisplayValue } from '../types';
import { calculateStandardSemanticMetrics } from './standardSemanticMetrics';

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
 * Calculates evaluation metrics based on selected metric types
 * 
 * This function determines which metrics are enabled and uses the appropriate calculation method.
 * Both standard and semantic matching metrics return the same 6-field structure.
 * 
 * @param sentenceResults - Array of sentence-level prediction results from the model
 * @param task - Type of extraction task ('entity_extraction', 'relation_classification', or 'single_prompt_full_causal_extraction')
 * @param evaluationMetrics - Array of metric configurations with enabled/disabled status
 * @returns Promise<Object> containing precision, recall, F1 score, and counts of TP/FP/FN
 */
export const calculateMetrics = async (
  sentenceResults: SentenceResult[], 
  task: TaskType, 
  evaluationMetrics: EvaluationMetric[]
): Promise<EvaluationMetrics> => {
  // Get all enabled metrics
  const enabledMetrics = evaluationMetrics.filter(m => m.enabled);
  
  console.log(`
  =====================================================
  Metrics Calculation for ${task}
  Enabled metrics: ${enabledMetrics.map(m => m.id).join(', ')}
  =====================================================`);
  
  if (enabledMetrics.length === 0) {
    console.log('⚠️ No metrics enabled, returning defaults');
    return getDefaultMetrics();
  }
  
  // Calculate all enabled metrics independently (no prioritization)
  const calculatedResults: Record<string, MetricsResult> = {};
  const displayedValues: MetricDisplayValue[] = [];
  
  for (const metric of enabledMetrics) {

    console.log(`📊 Calculating ${metric.id} metrics`);
    
    if (metric.id === 'standard_semantic_matching') {
      calculatedResults.semanticMatching = await calculateSemanticMatchingMetrics(sentenceResults, task);
      // Semantic matching displays F1 by default
      displayedValues.push({
        metricType: 'semanticMatching',
        values: ['f1']
      });
    } else if (metric.id === 'standard') {
      calculatedResults.standard = calculateStandardMetrics(sentenceResults, task);
      // Standard metrics display F1 by default
      displayedValues.push({
        metricType: 'standard',
        values: ['f1']
      });
    } 
    // Future metric types can be added here with their own display preferences
  }
  
  // Use first calculated result for primary fields (backward compatibility)
  const primaryResult = Object.values(calculatedResults)[0] || getDefaultMetrics();
  
  console.log(`📈 Display values: ${JSON.stringify(displayedValues)}`);
  
  // Return combined results with display specifications
  return {
    // Primary fields (for backward compatibility)
    ...primaryResult,
    // Specifies which values each metric type wants to display
    displayedValues,
    // Individual metric results (all calculated independently)
    standard: calculatedResults.standard,
    semanticMatching: calculatedResults.semanticMatching
  };
};

/**
 * Calculates standard evaluation metrics using traditional TP/FP/FN exact matching
 * @param sentenceResults - Array of sentence-level prediction results
 * @param task - Type of extraction task
 * @returns MetricsResult object with all 6 standard fields
 */
const calculateStandardMetrics = (
  sentenceResults: SentenceResult[], 
  task: TaskType
): MetricsResult => {
  // Initialize counters for calculating precision, recall, and F1 score
  let truePositives = 0;   // Correctly predicted positive cases
  let falsePositives = 0;  // Incorrectly predicted positive cases  
  let falseNegatives = 0;  // Missed positive cases (should have been predicted)
  
  // Process each sentence result to count TP, FP, FN
  sentenceResults.forEach(result => {
    const predictions = result.predictions;
    const goldData = result.goldData;

    console.log(`
    Processing sentence: ${result.sentenceId}
    Predictions: ${JSON.stringify(predictions)}
    Gold Data: ${JSON.stringify(goldData)}`);

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
  
  console.log(`📊 Standard Metrics Results:
    - Precision: ${precision.toFixed(4)}
    - Recall: ${recall.toFixed(4)}
    - F1: ${f1.toFixed(4)}
    - TP: ${truePositives}, FP: ${falsePositives}, FN: ${falseNegatives}`);
  
  return { 
    precision, 
    recall, 
    f1, 
    truePositives, 
    falsePositives, 
    falseNegatives
  };
};

/**
 * Wrapper function for semantic matching metrics calculation
 * @param sentenceResults - Array of sentence-level prediction results
 * @param task - Type of extraction task  
 * @returns MetricsResult object with standard metrics plus detailed match categorization arrays
 */
const calculateSemanticMatchingMetrics = async (
  sentenceResults: SentenceResult[], 
  task: TaskType
): Promise<MetricsResult> => {
  try {
    // Call the weighted bipartite matching calculation
    const result = await calculateStandardSemanticMetrics(sentenceResults, task);
    
    // Extract metrics from the detailed result including match categorization
    return {
      precision: result.precision,
      recall: result.recall,
      f1: result.f1,
      truePositives: result.TPw,
      falsePositives: result.FPw,
      falseNegatives: result.FNw,
      exact: result.exact,
      semantic: result.semantic,
      partial: result.partial,
      noMatch: result.noMatch
    };
  } catch (error) {
    console.error(`Error in semantic matching calculation: ${error}`);
    // Fallback to standard metrics if semantic matching fails
    return calculateStandardMetrics(sentenceResults, task);
  }
};

/**
 * Returns default/zero metrics when no metrics are enabled
 * @returns EvaluationMetrics object with zero values
 */
const getDefaultMetrics = (): EvaluationMetrics => {
  return {
    precision: 0,
    recall: 0,
    f1: 0,
    truePositives: 0,
    falsePositives: 0,
    falseNegatives: 0,
    displayedValues: []
  };
};