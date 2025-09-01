import { SentenceResult, TaskType, CausalRelationship, StandardSemanticMetricsResult } from '../types';
import {SEMANTIC_EVAL_MODEL_CONFIG, STANDARD_SEMANTIC_ENTITY_PROMPT, STANDARD_SEMANTIC_RELATIONSHIP_PROMPT} from '../constants';
import { LLMServiceFactory } from '../services/llmService';


/**
 * Interface for a weighted match between gold and predicted entities
 */
interface MatchPair {
  goldIndex: number;
  predIndex: number;  
  weight: number;
  type: 'exact' | 'semantic' | 'partial';
  goldEntity: string;
  predEntity: string;
}

/**
 * Interface for a weighted match between gold and predicted relationships
 */
interface RelationshipMatchPair {
  goldIndex: number;
  predIndex: number;
  weight: number;
  type: 'exact' | 'semantic' | 'partial';
  goldRelationship: CausalRelationship;
  predRelationship: CausalRelationship;
}

/**
 * Result of weighted bipartite matching algorithm
 */
interface WeightedMatchingResult {
  totalWeight: number;
  matches: MatchPair[];
  unmatchedGoldIndices: number[];
  unmatchedPredIndices: number[];
}

/**
 * Structured result from parsing semantic evaluation response
 */
interface SemanticMatchingResult {
  semanticPairs: Array<{ gold: string; predicted: string }>;
  partialPairs: Array<{ gold: string; predicted: string }>;
}

/**
 * Result of exact matching calculation with separated matched and unmatched entities
 */
interface ExactMatchResult {
  exactMatches: MatchPair[];
  unmatchedGold: string[];
  unmatchedPredicted: string[];
  goldIndices: number[];
  predIndices: number[];
}

/**
 * Result of exact matching calculation with separated matched and unmatched relationships
 */
interface RelationshipExactMatchResult {
  exactMatches: RelationshipMatchPair[];
  unmatchedGold: CausalRelationship[];
  unmatchedPredicted: CausalRelationship[];
  goldIndices: number[];
  predIndices: number[];
}

/**
 * Extracts JSON content from responses that may have prefixed text or code block formatting
 * (Based on responseParser.ts extractJsonFromResponse logic)
 */
const extractJsonFromResponse = (response: string): string | null => {
  // First, try to extract from code blocks (```json ... ``` or ``` ... ```)
  const codeBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }
  
  // Look for JSON objects in the response
  const objectMatch = response.match(/(\{[\s\S]*?\})/);
  if (objectMatch) {
    const candidate = objectMatch[1];
    if (candidate.includes('"')) {
      return candidate.trim();
    }
  }
  
  // Try to find JSON after common prefixes
  const prefixPatterns = [
    /(?:Here is|Here's|The output is|Output:|Result:|The result is|Below is)[\s\S]*?(\{[\s\S]*?\})/i
  ];
  
  for (const pattern of prefixPatterns) {
    const match = response.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  
  return null;
};

/**
 * Parses semantic evaluation response from LLM and returns structured match pairs
 * @param response - Raw LLM response string
 * @returns Structured semantic and partial match pairs
 */
const parseSemanticEvaluationResponse = (response: string): SemanticMatchingResult => {
  console.log("Parsing semantic evaluation response:\n", response);
  
  try {
    // First, try to extract JSON from prefixed text or code blocks
    const extractedJson = extractJsonFromResponse(response);
    let jsonParsed: any;
    
    if (extractedJson) {
      try {
        jsonParsed = JSON.parse(extractedJson);
      } catch {
        // If extracted JSON parsing fails, try parsing entire response
        jsonParsed = JSON.parse(response);
      }
    } else {
      // Try parsing the entire response as JSON directly
      jsonParsed = JSON.parse(response);
    }
    
    // Validate the expected structure
    if (jsonParsed && typeof jsonParsed === 'object') {
      const semanticPairs = Array.isArray(jsonParsed.semantic_match_pairs) ? jsonParsed.semantic_match_pairs : [];
      const partialPairs = Array.isArray(jsonParsed.partial_match_pairs) ? jsonParsed.partial_match_pairs : [];
      
      console.log(`✓ Parsed semantic evaluation:
        - Semantic matches: ${semanticPairs.length}
        - Partial matches: ${partialPairs.length}
        - Total matches: ${semanticPairs.length + partialPairs.length}`);
      
      return {
        semanticPairs,
        partialPairs
      };
    }
    
    console.log('⚠️ Invalid JSON structure in response');
    return { semanticPairs: [], partialPairs: [] };
    
  } catch (error) {
    console.error('Error parsing semantic evaluation response:', error);
    console.log('❌ Could not parse semantic evaluation response, returning empty pairs');
    return { semanticPairs: [], partialPairs: [] };
  }
};

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
 * Calculates exact matches between predicted and gold relationships and removes them from pools
 * This optimization avoids sending already-matched relationships to LLM for semantic evaluation
 * @param predictions - Array of predicted relationships
 * @param goldData - Array of gold standard relationships
 * @returns RelationshipExactMatchResult with exact matches and remaining unmatched relationships
 */
const calculateExactRelationshipMatches = (predictions: CausalRelationship[], goldData: CausalRelationship[]): RelationshipExactMatchResult => {
  const exactMatches: RelationshipMatchPair[] = [];
  const matchedGoldIndices = new Set<number>();
  const matchedPredIndices = new Set<number>();
  
  console.log(`🎯 Pre-calculating exact relationship matches:`);
  console.log(`  - Gold relationships: ${goldData.length}`);
  console.log(`  - Predicted relationships: ${predictions.length}`);
  
  // Find all exact matches using greedy approach (first match wins)
  for (let g = 0; g < goldData.length; g++) {
    if (matchedGoldIndices.has(g)) continue;
    
    for (let p = 0; p < predictions.length; p++) {
      if (matchedPredIndices.has(p)) continue;
      
      // Check for exact match using existing areRelationshipsEqual function
      if (areRelationshipsEqual(goldData[g], predictions[p])) {
        exactMatches.push({
          goldIndex: g,
          predIndex: p,
          weight: 1.0,
          type: 'exact',
          goldRelationship: goldData[g],
          predRelationship: predictions[p]
        });
        
        matchedGoldIndices.add(g);
        matchedPredIndices.add(p);
        
        console.log(`  ✓ Exact match: "${goldData[g].cause}→${goldData[g].effect}" ↔ "${predictions[p].cause}→${predictions[p].effect}"`);
        break; // Move to next gold relationship
      }
    }
  }
  
  // Collect unmatched relationships and their indices
  const unmatchedGold: CausalRelationship[] = [];
  const goldIndices: number[] = [];
  for (let g = 0; g < goldData.length; g++) {
    if (!matchedGoldIndices.has(g)) {
      unmatchedGold.push(goldData[g]);
      goldIndices.push(g);
    }
  }
  
  const unmatchedPredicted: CausalRelationship[] = [];
  const predIndices: number[] = [];
  for (let p = 0; p < predictions.length; p++) {
    if (!matchedPredIndices.has(p)) {
      unmatchedPredicted.push(predictions[p]);
      predIndices.push(p);
    }
  }
  
  console.log(`📊 Exact relationship matching results:
    - Exact matches found: ${exactMatches.length}
    - Remaining unmatched gold: ${unmatchedGold.length}
    - Remaining unmatched predicted: ${unmatchedPredicted.length}
  `);
  
  return {
    exactMatches,
    unmatchedGold,
    unmatchedPredicted,
    goldIndices,
    predIndices
  };
};

/**
 * Calculates similarity between two relationships using word overlap heuristics
 * This is a mockup function that simulates semantic similarity without LLM calls
 * @param rel1 - First relationship to compare
 * @param rel2 - Second relationship to compare  
 * @returns Similarity score between 0.0 and 1.0
 */
const calculateRelationshipSimilarity = (rel1: CausalRelationship, rel2: CausalRelationship): number => {
  // Helper function to calculate word overlap
  const calculateWordOverlap = (words1: string[], words2: string[]): number => {
    const set1 = new Set(words1.map(w => w.toLowerCase()));
    const set2 = new Set(words2.map(w => w.toLowerCase()));
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return union.size > 0 ? intersection.size / union.size : 0;
  };

  // Split cause and effect into words
  const cause1Words = normalizeString(rel1.cause).split(/\s+/).filter(w => w.length > 2);
  const cause2Words = normalizeString(rel2.cause).split(/\s+/).filter(w => w.length > 2);
  const effect1Words = normalizeString(rel1.effect).split(/\s+/).filter(w => w.length > 2);
  const effect2Words = normalizeString(rel2.effect).split(/\s+/).filter(w => w.length > 2);
  
  // Calculate overlap for cause and effect separately
  const causeOverlap = calculateWordOverlap(cause1Words, cause2Words);
  const effectOverlap = calculateWordOverlap(effect1Words, effect2Words);
  
  // Average the overlaps
  return (causeOverlap + effectOverlap) / 2;
};

/**
 * Mockup semantic evaluation for relationships using heuristic similarity
 * Simulates LLM-based semantic matching without actual API calls
 * @param unmatchedPredictions - Predicted relationships that weren't exactly matched
 * @param unmatchedGoldData - Gold standard relationships that weren't exactly matched
 * @returns Promise<SemanticMatchingResult> - Structured semantic and partial match pairs
 */
const evaluateRelationshipSemanticMatches = async (
  unmatchedPredictions: CausalRelationship[], 
  unmatchedGoldData: CausalRelationship[]
): Promise<SemanticMatchingResult> => {
  console.log(`🔍 Starting relationship semantic evaluation (MOCKUP):
    - Unmatched predictions: ${unmatchedPredictions.length}
    - Unmatched gold data: ${unmatchedGoldData.length}
  `);

  // Early return if no unmatched relationships to evaluate
  if (unmatchedPredictions.length === 0 || unmatchedGoldData.length === 0) {
    console.log(`⚡ No unmatched relationships to evaluate - skipping mockup evaluation`);
    return { semanticPairs: [], partialPairs: [] };
  }

  const semanticPairs: Array<{ gold: string; predicted: string }> = [];
  const partialPairs: Array<{ gold: string; predicted: string }> = [];
  const usedPredIndices = new Set<number>();
  const usedGoldIndices = new Set<number>();

  // Find the best matching pairs using greedy approach
  for (let p = 0; p < unmatchedPredictions.length; p++) {
    if (usedPredIndices.has(p)) continue;
    
    let bestMatch: { goldIndex: number; similarity: number } | null = null;
    
    for (let g = 0; g < unmatchedGoldData.length; g++) {
      if (usedGoldIndices.has(g)) continue;
      
      const similarity = calculateRelationshipSimilarity(unmatchedPredictions[p], unmatchedGoldData[g]);
      
      if (!bestMatch || similarity > bestMatch.similarity) {
        bestMatch = { goldIndex: g, similarity };
      }
    }
    
    if (bestMatch && bestMatch.similarity > 0.7) {
      // High similarity - semantic match
      semanticPairs.push({
        gold: JSON.stringify(unmatchedGoldData[bestMatch.goldIndex]),
        predicted: JSON.stringify(unmatchedPredictions[p])
      });
      usedPredIndices.add(p);
      usedGoldIndices.add(bestMatch.goldIndex);
      console.log(`  ✓ Semantic match (${bestMatch.similarity.toFixed(3)}): "${unmatchedPredictions[p].cause}→${unmatchedPredictions[p].effect}" ↔ "${unmatchedGoldData[bestMatch.goldIndex].cause}→${unmatchedGoldData[bestMatch.goldIndex].effect}"`);
    } else if (bestMatch && bestMatch.similarity > 0.4) {
      // Medium similarity - partial match
      partialPairs.push({
        gold: JSON.stringify(unmatchedGoldData[bestMatch.goldIndex]),
        predicted: JSON.stringify(unmatchedPredictions[p])
      });
      usedPredIndices.add(p);
      usedGoldIndices.add(bestMatch.goldIndex);
      console.log(`  ≈ Partial match (${bestMatch.similarity.toFixed(3)}): "${unmatchedPredictions[p].cause}→${unmatchedPredictions[p].effect}" ↔ "${unmatchedGoldData[bestMatch.goldIndex].cause}→${unmatchedGoldData[bestMatch.goldIndex].effect}"`);
    }
  }

  console.log(`🔍 Relationship semantic evaluation (MOCKUP): ${semanticPairs.length} semantic + ${partialPairs.length} partial matches`);
  return { semanticPairs, partialPairs };
};

/**
 * Calculates exact matches between predicted and gold entities and removes them from pools
 * This optimization avoids sending already-matched entities to LLM for semantic evaluation
 * @param predictions - Array of predicted entities
 * @param goldData - Array of gold standard entities
 * @returns ExactMatchResult with exact matches and remaining unmatched entities
 */
const calculateExactMatches = (predictions: string[], goldData: string[]): ExactMatchResult => {
  const exactMatches: MatchPair[] = [];
  const matchedGoldIndices = new Set<number>();
  const matchedPredIndices = new Set<number>();
  
  console.log(`🎯 Pre-calculating exact matches:`);
  console.log(`  - Gold entities: ${JSON.stringify(goldData)}`);
  console.log(`  - Predicted entities: ${JSON.stringify(predictions)}`);
  
  // Find all exact matches using greedy approach (first match wins)
  for (let g = 0; g < goldData.length; g++) {
    if (matchedGoldIndices.has(g)) continue;
    
    for (let p = 0; p < predictions.length; p++) {
      if (matchedPredIndices.has(p)) continue;
      
      // Check for exact match (case-insensitive)
      if (normalizeString(goldData[g]) === normalizeString(predictions[p])) {
        exactMatches.push({
          goldIndex: g,
          predIndex: p,
          weight: 1.0,
          type: 'exact',
          goldEntity: goldData[g],
          predEntity: predictions[p]
        });
        
        matchedGoldIndices.add(g);
        matchedPredIndices.add(p);
        
        console.log(`  ✓ Exact match: "${goldData[g]}" ↔ "${predictions[p]}"`);
        break; // Move to next gold entity
      }
    }
  }
  
  // Collect unmatched entities and their indices
  const unmatchedGold: string[] = [];
  const goldIndices: number[] = [];
  for (let g = 0; g < goldData.length; g++) {
    if (!matchedGoldIndices.has(g)) {
      unmatchedGold.push(goldData[g]);
      goldIndices.push(g);
    }
  }
  
  const unmatchedPredicted: string[] = [];
  const predIndices: number[] = [];
  for (let p = 0; p < predictions.length; p++) {
    if (!matchedPredIndices.has(p)) {
      unmatchedPredicted.push(predictions[p]);
      predIndices.push(p);
    }
  }
  
  console.log(`📊 Exact matching results:
    - Exact matches found: ${exactMatches.length}
    - Remaining unmatched gold: ${unmatchedGold.length} (${JSON.stringify(unmatchedGold)})
    - Remaining unmatched predicted: ${unmatchedPredicted.length} (${JSON.stringify(unmatchedPredicted)})
  `);
  
  return {
    exactMatches,
    unmatchedGold,
    unmatchedPredicted,
    goldIndices,
    predIndices
  };
};

/**
 * Builds optimized weight matrix by combining pre-calculated exact matches with semantic matches
 * @param allPredictions - Complete array of predicted entities
 * @param allGoldData - Complete array of gold standard entities
 * @param exactMatches - Pre-calculated exact matches
 * @param semanticPairs - Semantic match pairs from LLM (for unmatched entities only)
 * @param partialPairs - Partial match pairs from LLM (for unmatched entities only)
 * @param unmatchedGoldIndices - Original indices of unmatched gold entities
 * @param unmatchedPredIndices - Original indices of unmatched predicted entities
 * @returns G×P weight matrix combining exact and semantic matches
 */
const buildOptimizedWeightMatrix = (
  allPredictions: string[],
  allGoldData: string[],
  exactMatches: MatchPair[],
  semanticPairs: Array<{ gold: string; predicted: string }>,
  partialPairs: Array<{ gold: string; predicted: string }>,
  unmatchedGoldIndices: number[],
  unmatchedPredIndices: number[]
): number[][] => {
  const G = allGoldData.length;
  const P = allPredictions.length;
  
  // Initialize G×P weight matrix with zeros
  const weights = Array(G).fill(null).map(() => Array(P).fill(0));
  
  console.log(`🔧 Building optimized ${G}×${P} weight matrix`);
  
  // Step 1: Add pre-calculated exact matches (weight = 1.0)
  exactMatches.forEach(match => {
    weights[match.goldIndex][match.predIndex] = 1.0;
    console.log(`✓ Exact match: "${match.goldEntity}" ↔ "${match.predEntity}" (weight: 1.0)`);
  });
  
  // Step 2: Add semantic matches for unmatched entities (weight = 0.75)
  semanticPairs.forEach(pair => {
    // Find original indices in the unmatched arrays
    const unmatchedGoldIdx = unmatchedGoldIndices.findIndex(idx => 
      normalizeString(allGoldData[idx]) === normalizeString(pair.gold)
    );
    const unmatchedPredIdx = unmatchedPredIndices.findIndex(idx => 
      normalizeString(allPredictions[idx]) === normalizeString(pair.predicted)
    );
    
    if (unmatchedGoldIdx !== -1 && unmatchedPredIdx !== -1) {
      const originalGoldIndex = unmatchedGoldIndices[unmatchedGoldIdx];
      const originalPredIndex = unmatchedPredIndices[unmatchedPredIdx];
      
      weights[originalGoldIndex][originalPredIndex] = 0.75;
      console.log(`✓ Semantic match: "${pair.gold}" ↔ "${pair.predicted}" (weight: 0.75)`);
    }
  });
  
  // Step 3: Add partial matches for unmatched entities (weight = 0.5)
  partialPairs.forEach(pair => {
    const unmatchedGoldIdx = unmatchedGoldIndices.findIndex(idx => 
      normalizeString(allGoldData[idx]) === normalizeString(pair.gold)
    );
    const unmatchedPredIdx = unmatchedPredIndices.findIndex(idx => 
      normalizeString(allPredictions[idx]) === normalizeString(pair.predicted)
    );
    
    if (unmatchedGoldIdx !== -1 && unmatchedPredIdx !== -1) {
      const originalGoldIndex = unmatchedGoldIndices[unmatchedGoldIdx];
      const originalPredIndex = unmatchedPredIndices[unmatchedPredIdx];
      
      // Only set partial weight if no semantic match exists
      if (weights[originalGoldIndex][originalPredIndex] < 0.75) {
        weights[originalGoldIndex][originalPredIndex] = 0.5;
        console.log(`✓ Partial match: "${pair.gold}" ↔ "${pair.predicted}" (weight: 0.5)`);
      }
    }
  });
  
  return weights;
};

/**
 * Builds optimized weight matrix by combining pre-calculated exact matches with semantic matches (for relationships)
 * @param allPredictions - Complete array of predicted relationships
 * @param allGoldData - Complete array of gold standard relationships
 * @param exactMatches - Pre-calculated exact matches
 * @param semanticPairs - Semantic match pairs from mockup evaluation (for unmatched relationships only)
 * @param partialPairs - Partial match pairs from mockup evaluation (for unmatched relationships only)
 * @param unmatchedGoldIndices - Original indices of unmatched gold relationships
 * @param unmatchedPredIndices - Original indices of unmatched predicted relationships
 * @returns G×P weight matrix combining exact and semantic matches
 */
const buildRelationshipWeightMatrix = (
  allPredictions: CausalRelationship[],
  allGoldData: CausalRelationship[],
  exactMatches: RelationshipMatchPair[],
  semanticPairs: Array<{ gold: string; predicted: string }>,
  partialPairs: Array<{ gold: string; predicted: string }>,
  unmatchedGoldIndices: number[],
  unmatchedPredIndices: number[]
): number[][] => {
  const G = allGoldData.length;
  const P = allPredictions.length;
  
  // Initialize G×P weight matrix with zeros
  const weights = Array(G).fill(null).map(() => Array(P).fill(0));
  
  console.log(`🔧 Building optimized ${G}×${P} relationship weight matrix`);
  
  // Step 1: Add pre-calculated exact matches (weight = 1.0)
  exactMatches.forEach(match => {
    weights[match.goldIndex][match.predIndex] = 1.0;
    console.log(`✓ Exact relationship match: "${match.goldRelationship.cause}→${match.goldRelationship.effect}" ↔ "${match.predRelationship.cause}→${match.predRelationship.effect}" (weight: 1.0)`);
  });
  
  // Step 2: Add semantic matches for unmatched relationships (weight = 0.75)
  semanticPairs.forEach(pair => {
    // Parse JSON strings back to relationship objects for comparison
    const goldRel: CausalRelationship = JSON.parse(pair.gold);
    const predRel: CausalRelationship = JSON.parse(pair.predicted);
    
    // Find original indices in the unmatched arrays
    const unmatchedGoldIdx = unmatchedGoldIndices.findIndex(idx => 
      areRelationshipsEqual(allGoldData[idx], goldRel)
    );
    const unmatchedPredIdx = unmatchedPredIndices.findIndex(idx => 
      areRelationshipsEqual(allPredictions[idx], predRel)
    );
    
    if (unmatchedGoldIdx !== -1 && unmatchedPredIdx !== -1) {
      const originalGoldIndex = unmatchedGoldIndices[unmatchedGoldIdx];
      const originalPredIndex = unmatchedPredIndices[unmatchedPredIdx];
      
      weights[originalGoldIndex][originalPredIndex] = 0.75;
      console.log(`✓ Semantic relationship match: "${predRel.cause}→${predRel.effect}" ↔ "${goldRel.cause}→${goldRel.effect}" (weight: 0.75)`);
    }
  });
  
  // Step 3: Add partial matches for unmatched relationships (weight = 0.5)
  partialPairs.forEach(pair => {
    const goldRel: CausalRelationship = JSON.parse(pair.gold);
    const predRel: CausalRelationship = JSON.parse(pair.predicted);
    
    const unmatchedGoldIdx = unmatchedGoldIndices.findIndex(idx => 
      areRelationshipsEqual(allGoldData[idx], goldRel)
    );
    const unmatchedPredIdx = unmatchedPredIndices.findIndex(idx => 
      areRelationshipsEqual(allPredictions[idx], predRel)
    );
    
    if (unmatchedGoldIdx !== -1 && unmatchedPredIdx !== -1) {
      const originalGoldIndex = unmatchedGoldIndices[unmatchedGoldIdx];
      const originalPredIndex = unmatchedPredIndices[unmatchedPredIdx];
      
      // Only set partial weight if no semantic match exists
      if (weights[originalGoldIndex][originalPredIndex] < 0.75) {
        weights[originalGoldIndex][originalPredIndex] = 0.5;
        console.log(`✓ Partial relationship match: "${predRel.cause}→${predRel.effect}" ↔ "${goldRel.cause}→${goldRel.effect}" (weight: 0.5)`);
      }
    }
  });
  
  return weights;
};

/**
 * Finds maximum weight bipartite matching using greedy algorithm (for relationships)
 * @param weightMatrix - G×P weight matrix
 * @param goldData - Array of gold relationships (for logging)
 * @param predictions - Array of predicted relationships (for logging)
 * @returns Optimal matching result with total weight and match details
 */
const findMaxWeightRelationshipMatching = (
  weightMatrix: number[][], 
  goldData: CausalRelationship[], 
  predictions: CausalRelationship[]
): { totalWeight: number; matches: RelationshipMatchPair[]; unmatchedGoldIndices: number[]; unmatchedPredIndices: number[] } => {
  const G = goldData.length;
  const P = predictions.length;
  
  // Collect all potential matches with their weights
  const potentialMatches: Array<{ goldIndex: number; predIndex: number; weight: number }> = [];
  
  for (let g = 0; g < G; g++) {
    for (let p = 0; p < P; p++) {
      if (weightMatrix[g][p] > 0) {
        potentialMatches.push({ goldIndex: g, predIndex: p, weight: weightMatrix[g][p] });
      }
    }
  }
  
  // Sort by weight descending (greedy: take highest weights first)
  potentialMatches.sort((a, b) => b.weight - a.weight);
  
  // Track which gold relationships and predictions are already matched
  const matchedGold = new Set<number>();
  const matchedPred = new Set<number>();
  const selectedMatches: RelationshipMatchPair[] = [];
  
  console.log(`\nFinding optimal relationship matching from ${potentialMatches.length} potential matches:`);
  
  // Greedily select matches (1↔1 constraint)
  for (const match of potentialMatches) {
    const { goldIndex, predIndex, weight } = match;
    
    // Skip if either relationship is already matched
    if (matchedGold.has(goldIndex) || matchedPred.has(predIndex)) {
      continue;
    }
    
    // Add this match to the solution
    const matchType: 'exact' | 'semantic' | 'partial' = 
      weight === 1.0 ? 'exact' : weight === 0.75 ? 'semantic' : 'partial';
    
    selectedMatches.push({
      goldIndex,
      predIndex,
      weight,
      type: matchType,
      goldRelationship: goldData[goldIndex],
      predRelationship: predictions[predIndex]
    });
    
    matchedGold.add(goldIndex);
    matchedPred.add(predIndex);
    
    console.log(`✓ Selected: "${goldData[goldIndex].cause}→${goldData[goldIndex].effect}" ↔ "${predictions[predIndex].cause}→${predictions[predIndex].effect}" (${matchType}, weight: ${weight})`);
  }
  
  // Calculate total weight and unmatched relationships
  const totalWeight = selectedMatches.reduce((sum, match) => sum + match.weight, 0);
  const unmatchedGoldIndices = Array.from({ length: G }, (_, i) => i).filter(i => !matchedGold.has(i));
  const unmatchedPredIndices = Array.from({ length: P }, (_, i) => i).filter(i => !matchedPred.has(i));
  
  console.log(`\n🎯 Optimal relationship matching results:
    - Total weight (TPw): ${totalWeight}
    - Matched pairs: ${selectedMatches.length}
    - Unmatched gold relationships: ${unmatchedGoldIndices.length}
    - Unmatched predictions: ${unmatchedPredIndices.length}`);
  
  return {
    totalWeight,
    matches: selectedMatches,
    unmatchedGoldIndices,
    unmatchedPredIndices
  };
};

/**
 * Finds maximum weight bipartite matching using greedy algorithm
 * @param weightMatrix - G×P weight matrix
 * @param goldData - Array of gold entities (for logging)
 * @param predictions - Array of predicted entities (for logging)
 * @returns Optimal matching result with total weight and match details
 */
const findMaxWeightMatching = (
  weightMatrix: number[][], 
  goldData: string[], 
  predictions: string[]
): WeightedMatchingResult => {
  const G = goldData.length;
  const P = predictions.length;
  
  // Collect all potential matches with their weights
  const potentialMatches: Array<{ goldIndex: number; predIndex: number; weight: number }> = [];
  
  for (let g = 0; g < G; g++) {
    for (let p = 0; p < P; p++) {
      if (weightMatrix[g][p] > 0) {
        potentialMatches.push({ goldIndex: g, predIndex: p, weight: weightMatrix[g][p] });
      }
    }
  }
  
  // Sort by weight descending (greedy: take highest weights first)
  potentialMatches.sort((a, b) => b.weight - a.weight);
  
  // Track which gold entities and predictions are already matched
  const matchedGold = new Set<number>();
  const matchedPred = new Set<number>();
  const selectedMatches: MatchPair[] = [];
  
  console.log(`\nFinding optimal matching from ${potentialMatches.length} potential matches:`);
  
  // Greedily select matches (1↔1 constraint)
  for (const match of potentialMatches) {
    const { goldIndex, predIndex, weight } = match;
    
    // Skip if either entity is already matched
    if (matchedGold.has(goldIndex) || matchedPred.has(predIndex)) {
      continue;
    }
    
    // Add this match to the solution
    const matchType: 'exact' | 'semantic' | 'partial' = 
      weight === 1.0 ? 'exact' : weight === 0.75 ? 'semantic' : 'partial';
    
    selectedMatches.push({
      goldIndex,
      predIndex,
      weight,
      type: matchType,
      goldEntity: goldData[goldIndex],
      predEntity: predictions[predIndex]
    });
    
    matchedGold.add(goldIndex);
    matchedPred.add(predIndex);
    
    console.log(`✓ Selected: "${goldData[goldIndex]}" ↔ "${predictions[predIndex]}" (${matchType}, weight: ${weight})`);
  }
  
  // Calculate total weight and unmatched entities
  const totalWeight = selectedMatches.reduce((sum, match) => sum + match.weight, 0);
  const unmatchedGoldIndices = Array.from({ length: G }, (_, i) => i).filter(i => !matchedGold.has(i));
  const unmatchedPredIndices = Array.from({ length: P }, (_, i) => i).filter(i => !matchedPred.has(i));
  
  console.log(`\n🎯 Optimal matching results:
    - Total weight (TPw): ${totalWeight}
    - Matched pairs: ${selectedMatches.length}
    - Unmatched gold entities: ${unmatchedGoldIndices.length}
    - Unmatched predictions: ${unmatchedPredIndices.length}`);
  
  return {
    totalWeight,
    matches: selectedMatches,
    unmatchedGoldIndices,
    unmatchedPredIndices
  };
};

/**
 * Calculates standard metrics using weighted bipartite matching with semantic evaluation
 * Implements conservation laws: TPw ≤ min(G, P) through 1↔1 matching constraint
 * 
 * @param sentenceResults - Array of sentence-level prediction results from the model
 * @param task - Type of extraction task ('entity_extraction' or 'relation_classification')
 * @returns Promise<StandardSemanticMetricsResult> Detailed results with metrics and categorized match lists
 */
export const calculateStandardSemanticMetrics = async (
  sentenceResults: SentenceResult[], 
  task: TaskType
): Promise<StandardSemanticMetricsResult> => {

  console.log(`Using the model ${SEMANTIC_EVAL_MODEL_CONFIG.name} to evaluate the semantic similarity of the predictions for ${task}`);

  if (task === 'entity_extraction') {
    // === OPTIMIZED ENTITY EXTRACTION: Pre-filter exact matches ===
    
    // Collect all predictions and gold data across sentences
    const allPredictions: string[] = [];
    const allGoldData: string[] = [];
    
    sentenceResults.forEach(result => {
      allPredictions.push(...result.predictions);
      allGoldData.push(...result.goldData);
    });
    
    const G = allGoldData.length;
    const P = allPredictions.length;
    
    console.log(`🚀 Optimized entity extraction setup:
      - Gold entities (G): ${G}
      - Predicted entities (P): ${P}
      - Gold entities: ${JSON.stringify(allGoldData)}
      - Predicted entities: ${JSON.stringify(allPredictions)}
    `);

    if (P === 0 || G === 0) {
      console.log(`⚠️ Empty predictions or gold data - returning zeros`);
      return {
        precision: 0,
        recall: 0,
        f1: 0,
        TPw: 0,
        FPw: P,
        FNw: G,
        exact: [],
        semantic: [],
        partial: [],
        noMatch: [...allPredictions]
      };
    }

    // Step 1: Calculate exact matches and filter out matched entities
    const exactMatchResult = calculateExactMatches(allPredictions, allGoldData);
    const { 
      exactMatches, 
      unmatchedGold, 
      unmatchedPredicted, 
      goldIndices: unmatchedGoldIndices, 
      predIndices: unmatchedPredIndices 
    } = exactMatchResult;

    // Step 2: Get semantic and partial matches from LLM for unmatched entities only
    let semanticPairs: Array<{ gold: string; predicted: string }> = [];
    let partialPairs: Array<{ gold: string; predicted: string }> = [];
    
    if (unmatchedPredicted.length > 0 && unmatchedGold.length > 0) {
      try {
        console.log(`🔍 Evaluating semantic matches for ${unmatchedPredicted.length} unmatched predictions and ${unmatchedGold.length} unmatched gold entities`);
        const semanticResult = await evaluateSemanticMatches(unmatchedPredicted, unmatchedGold, task);
        semanticPairs = semanticResult.semanticPairs;
        partialPairs = semanticResult.partialPairs;
      } catch (error) {
        console.error('Error in semantic evaluation:', error);
        // Continue with exact matches only
      }
    } else {
      console.log(`⚡ All entities exactly matched or no entities to match - skipping semantic evaluation`);
    }

    // Step 3: Build optimized weight matrix combining exact and semantic matches
    const weightMatrix = buildOptimizedWeightMatrix(
      allPredictions, 
      allGoldData, 
      exactMatches,
      semanticPairs, 
      partialPairs,
      unmatchedGoldIndices,
      unmatchedPredIndices
    );
    
    // Step 4: Find optimal 1↔1 matching that maximizes total weight
    const matchingResult = findMaxWeightMatching(weightMatrix, allGoldData, allPredictions);
    
    // Apply conservation laws
    const TPw = matchingResult.totalWeight;  // Sum of weights in optimal matching
    const FNw = G - TPw;                     // Unmatched gold entities  
    const FPw = P - TPw;                     // Unmatched predictions
    
    console.log(`
    🎯 Optimized Weighted Bipartite Matching Results (Entity Extraction):
    - Exact matches pre-calculated: ${exactMatches.length}
    - Semantic matches evaluated: ${semanticPairs.length}
    - Partial matches evaluated: ${partialPairs.length}
    - TPw (weighted true positives): ${TPw}
    - FNw (weighted false negatives): ${FNw} 
    - FPw (weighted false positives): ${FPw}
    - Conservation check: G=${G}, P=${P}, TPw+FNw=${TPw + FNw}, TPw+FPw=${TPw + FPw}
    `);

    // Calculate weighted metrics
    const precision = TPw / P || 0;
    const recall = TPw / G || 0;  
    const f1 = 2 * (precision * recall) / (precision + recall) || 0;

    console.log(`📊 Final Optimized Entity Metrics:
      - Precision: ${precision.toFixed(4)}
      - Recall: ${recall.toFixed(4)} 
      - F1: ${f1.toFixed(4)}
    `);

    // Categorize entities by match type
    const exact: string[] = [];
    const semantic: string[] = [];
    const partial: string[] = [];
    const noMatch: string[] = [];
    
    // Process matched predictions
    matchingResult.matches.forEach(match => {
      const predEntity = match.predEntity;
      switch (match.type) {
        case 'exact':
          exact.push(predEntity);
          break;
        case 'semantic':
          semantic.push(predEntity);
          break;
        case 'partial':
          partial.push(predEntity);
          break;
      }
    });
    
    // Process unmatched predictions
    matchingResult.unmatchedPredIndices.forEach(predIndex => {
      noMatch.push(allPredictions[predIndex]);
    });

    return {
      precision,
      recall,
      f1,
      TPw,
      FPw,
      FNw,
      exact,
      semantic,
      partial,
      noMatch
    };

  } else {
    // === OPTIMIZED RELATIONSHIP EXTRACTION: Weighted Bipartite Matching ===
    console.log(`🚀 Implementing weighted bipartite matching for relationship extraction`);

    // Collect all predictions and gold data across sentences
    const allPredictionsPairs: CausalRelationship[] = [];
    const allGoldDataPairs: CausalRelationship[] = [];
    
    sentenceResults.forEach(result => {
      allPredictionsPairs.push(...result.predictions);
      allGoldDataPairs.push(...result.goldData);
    });

    const G = allGoldDataPairs.length;
    const P = allPredictionsPairs.length;
    
    console.log(`🚀 Optimized relationship extraction setup:
      - Gold relationships (G): ${G}
      - Predicted relationships (P): ${P}
    `);

    if (P === 0 || G === 0) {
      console.log(`⚠️ Empty predictions or gold data - returning zeros`);
      return {
        precision: 0,
        recall: 0,
        f1: 0,
        TPw: 0,
        FPw: P,
        FNw: G,
        exact: [],
        semantic: [],
        partial: [],
        noMatch: allPredictionsPairs.map(p => JSON.stringify(p))
      };
    }

    // Step 1: Calculate exact matches and filter out matched relationships
    const exactMatchResult = calculateExactRelationshipMatches(allPredictionsPairs, allGoldDataPairs);
    const { 
      exactMatches, 
      unmatchedGold, 
      unmatchedPredicted, 
      goldIndices: unmatchedGoldIndices, 
      predIndices: unmatchedPredIndices 
    } = exactMatchResult;

    // Step 2: Get semantic and partial matches from mockup evaluation for unmatched relationships only
    let semanticPairs: Array<{ gold: string; predicted: string }> = [];
    let partialPairs: Array<{ gold: string; predicted: string }> = [];
    
    if (unmatchedPredicted.length > 0 && unmatchedGold.length > 0) {
      try {
        console.log(`🔍 Evaluating semantic matches for ${unmatchedPredicted.length} unmatched predictions and ${unmatchedGold.length} unmatched gold relationships`);
        const semanticResult = await evaluateRelationshipSemanticMatches(unmatchedPredicted, unmatchedGold);
        semanticPairs = semanticResult.semanticPairs;
        partialPairs = semanticResult.partialPairs;
      } catch (error) {
        console.error('Error in relationship semantic evaluation:', error);
        // Continue with exact matches only
      }
    } else {
      console.log(`⚡ All relationships exactly matched or no relationships to match - skipping semantic evaluation`);
    }

    // Step 3: Build optimized weight matrix combining exact and semantic matches
    const weightMatrix = buildRelationshipWeightMatrix(
      allPredictionsPairs, 
      allGoldDataPairs, 
      exactMatches,
      semanticPairs, 
      partialPairs,
      unmatchedGoldIndices,
      unmatchedPredIndices
    );
    
    // Step 4: Find optimal 1↔1 matching that maximizes total weight
    const matchingResult = findMaxWeightRelationshipMatching(weightMatrix, allGoldDataPairs, allPredictionsPairs);
    
    // Apply conservation laws
    const TPw = matchingResult.totalWeight;  // Sum of weights in optimal matching
    const FNw = G - TPw;                     // Unmatched gold relationships  
    const FPw = P - TPw;                     // Unmatched predictions
    
    console.log(`
    🎯 Optimized Weighted Bipartite Matching Results (Relationship Extraction):
    - Exact matches pre-calculated: ${exactMatches.length}
    - Semantic matches evaluated: ${semanticPairs.length}
    - Partial matches evaluated: ${partialPairs.length}
    - TPw (weighted true positives): ${TPw}
    - FNw (weighted false negatives): ${FNw} 
    - FPw (weighted false positives): ${FPw}
    - Conservation check: G=${G}, P=${P}, TPw+FNw=${TPw + FNw}, TPw+FPw=${TPw + FPw}
    `);

    // Calculate weighted metrics
    const precision = TPw / P || 0;
    const recall = TPw / G || 0;  
    const f1 = 2 * (precision * recall) / (precision + recall) || 0;

    console.log(`📊 Final Optimized Relationship Metrics:
      - Precision: ${precision.toFixed(4)}
      - Recall: ${recall.toFixed(4)} 
      - F1: ${f1.toFixed(4)}
    `);

    // Categorize relationships by match type
    const exact: string[] = [];
    const semantic: string[] = [];
    const partial: string[] = [];
    const noMatch: string[] = [];
    
    // Process matched predictions
    matchingResult.matches.forEach(match => {
      const predRel = JSON.stringify(match.predRelationship);
      switch (match.type) {
        case 'exact':
          exact.push(predRel);
          break;
        case 'semantic':
          semantic.push(predRel);
          break;
        case 'partial':
          partial.push(predRel);
          break;
      }
    });
    
    // Process unmatched predictions
    matchingResult.unmatchedPredIndices.forEach(predIndex => {
      noMatch.push(JSON.stringify(allPredictionsPairs[predIndex]));
    });

    return {
      precision,
      recall,
      f1,
      TPw,
      FPw,
      FNw,
      exact,
      semantic,
      partial,
      noMatch
    };
  }
};

/**
 * Evaluates semantic matches between predictions and gold data using LLM
 * Only processes entities that don't have exact matches (optimized version)
 * @param unmatchedPredictions - Predicted entities/relationships that weren't exactly matched
 * @param unmatchedGoldData - Gold standard entities/relationships that weren't exactly matched
 * @param task - Extraction task type
 * @returns Promise<SemanticMatchingResult> - Structured semantic and partial match pairs
 */
async function evaluateSemanticMatches(
  unmatchedPredictions: any[], 
  unmatchedGoldData: any[], 
  task: TaskType
): Promise<SemanticMatchingResult> {
  
  console.log(`
  🔍 Starting semantic evaluation (optimized - exact matches already filtered):
  - Unmatched predictions: ${JSON.stringify(unmatchedPredictions)}
  - Unmatched gold data: ${JSON.stringify(unmatchedGoldData)}
  `);

  // Early return if no unmatched entities to evaluate
  if (unmatchedPredictions.length === 0 || unmatchedGoldData.length === 0) {
    console.log(`⚡ No unmatched entities to evaluate - skipping LLM call`);
    return { semanticPairs: [], partialPairs: [] };
  }

  const evalModelConfig = SEMANTIC_EVAL_MODEL_CONFIG;
  
  try {
    // Prepare prompt with unmatched predictions and gold data only
    const predicted = JSON.stringify(unmatchedPredictions);
    const gold = JSON.stringify(unmatchedGoldData);

    let prompt: string;
    if (task === 'entity_extraction') {
      prompt = STANDARD_SEMANTIC_ENTITY_PROMPT
        .replace('{predicted}', predicted)
        .replace('{gold}', gold);
    } else {
      prompt = STANDARD_SEMANTIC_RELATIONSHIP_PROMPT
        .replace('{predicted}', predicted)
        .replace('{gold}', gold);
    }

    // Call LLM service
    const llmService = LLMServiceFactory.getService(evalModelConfig);
    const response = await llmService.callModel({
      prompt,
      model: evalModelConfig,
      temperature: 0.0,
      maxTokens: 1000
    });
    
    if (response.success && response.content) {
      if (task === 'entity_extraction') {
        // Parse structured JSON response for entity extraction
        const result = parseSemanticEvaluationResponse(response.content);
        console.log(`🔍 Entity semantic evaluation: ${result.semanticPairs.length} semantic + ${result.partialPairs.length} partial matches`);
        return result;
      } else {
        // For relationship extraction, use mockup evaluation instead of LLM parsing
        console.log(`🔗 Relationship semantic evaluation: Using mockup evaluation instead of LLM parsing`);
        const result = await evaluateRelationshipSemanticMatches(unmatchedPredictions, unmatchedGoldData);
        return result;
      }
    }
  } catch (error) {
    console.error('Error in LLM semantic evaluation:', error);
  }
 
  return { semanticPairs: [], partialPairs: [] };
  
}