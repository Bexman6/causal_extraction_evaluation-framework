import { TaskType, CausalRelationship } from '../types';

export interface ParsedEntityResponse {
  entities: string[];
  confidence?: number;
}

export interface ParsedRelationshipResponse {
  relationships: CausalRelationship[];
  confidence?: number;
}

/**
 * Extracts JSON content from responses that may have prefixed text or code block formatting
 */
const extractJsonFromResponse = (response: string): string | null => {
  // First, try to extract from code blocks (```json ... ``` or ``` ... ```)
  const codeBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }
  
  // Look for JSON arrays in the response
  const arrayMatch = response.match(/(\[[\s\S]*?\])/);
  if (arrayMatch) {
    // Validate it's likely JSON by checking for quotes and braces
    const candidate = arrayMatch[1];
    if (candidate.includes('{') && candidate.includes('"')) {
      return candidate.trim();
    }
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
    /(?:Here is|Here's|The output is|Output:|Result:|The result is|Below is)[\s\S]*?(\[[\s\S]*?\])/i,
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

export const parseEntityExtractionResponse = (response: string): ParsedEntityResponse => {
  console.log("Parsing entity extraction response:\n", response);
  
  // First, try to extract JSON from prefixed text or code blocks
  const extractedJson = extractJsonFromResponse(response);
  if (extractedJson) {
    try {
      const jsonParsed = JSON.parse(extractedJson);
      
      if (Array.isArray(jsonParsed)) {
        return { entities: jsonParsed.filter((item: any) => typeof item === 'string') };
      }
      
      if (jsonParsed.entities && Array.isArray(jsonParsed.entities)) {
        return {
          entities: jsonParsed.entities.filter((item: any) => typeof item === 'string'),
          confidence: jsonParsed.confidence
        };
      }
    } catch {
      // If extracted JSON parsing fails, continue to direct parsing attempt
    }
  }
  
  try {
    // Try parsing the entire response as JSON directly
    const jsonParsed = JSON.parse(response);
    
    if (Array.isArray(jsonParsed)) {
      return { entities: jsonParsed.filter((item: any) => typeof item === 'string') };
    }
    
    if (jsonParsed.entities && Array.isArray(jsonParsed.entities)) {
      return {
        entities: jsonParsed.entities.filter((item: any) => typeof item === 'string'),
        confidence: jsonParsed.confidence
      };
    }
  } catch {
    // If JSON parsing fails, try extracting entities using text patterns
  }

  // Fallback: Extract entities from text using various patterns
  const entities: string[] = [];
  
  // Pattern 1: Look for entities in quotes
  const quotedEntities = response.match(/"([^"]+)"/g);
  if (quotedEntities) {
    entities.push(...quotedEntities.map(entity => entity.slice(1, -1)));
  }
  
  // Pattern 2: Look for bullet points or numbered lists
  const listItems = response.match(/(?:^|\n)\s*[-*•]\s*(.+)$/gm);
  if (listItems) {
    entities.push(...listItems.map(item => item.replace(/^[\s\-*•]+/, '').trim()));
  }
  
  // Pattern 3: Look for numbered lists
  const numberedItems = response.match(/(?:^|\n)\s*\d+\.?\s*(.+)$/gm);
  if (numberedItems) {
    entities.push(...numberedItems.map(item => item.replace(/^[\s\d.]+/, '').trim()));
  }
  
  // Pattern 4: Look for entities separated by commas or newlines
  if (entities.length === 0) {
    const commaSeparated = response.split(/[,\n]/)
      .map(item => item.trim())
      .filter(item => item.length > 0 && item.length < 100); // Reasonable entity length
    entities.push(...commaSeparated);
  }
  
  // Clean up and deduplicate
  const cleanedEntities = [...new Set(
    entities
      .map(entity => entity.trim())
      .filter(entity => entity.length > 0 && entity.length < 100)
      .filter(entity => !entity.match(/^(the|a|an|and|or|but|in|on|at|to|for|of|with|by)$/i)) // Remove common stop words
  )];
  

  return { entities: cleanedEntities };
};

export const parseRelationshipExtractionResponse = (response: string): ParsedRelationshipResponse => {
  
  console.log("Parsing relationship extraction response:\n", response);
  
  // First, try to extract JSON from prefixed text or code blocks
  const extractedJson = extractJsonFromResponse(response);
  if (extractedJson) {
    try {
      const jsonParsed = JSON.parse(extractedJson);
      
      if (Array.isArray(jsonParsed)) {
        const relationships = jsonParsed
          .filter((item: any) => item && typeof item === 'object' && item.cause && item.effect)
          .map((item: any) => ({
            cause: String(item.cause),
            effect: String(item.effect)
          }));
        return { relationships };
      }
      
      if (jsonParsed.relationships && Array.isArray(jsonParsed.relationships)) {
        const relationships = jsonParsed.relationships
          .filter((item: any) => item && typeof item === 'object' && item.cause && item.effect)
          .map((item: any) => ({
            cause: String(item.cause),
            effect: String(item.effect)
          }));
        return {
          relationships,
          confidence: jsonParsed.confidence
        };
      }
    } catch {
      // If extracted JSON parsing fails, continue to direct parsing attempt
    }
  }
  
  try {
    // Try parsing the entire response as JSON directly
    const jsonParsed = JSON.parse(response);
    
    if (Array.isArray(jsonParsed)) {
      const relationships = jsonParsed
        .filter((item: any) => item && typeof item === 'object' && item.cause && item.effect)
        .map((item: any) => ({
          cause: String(item.cause),
          effect: String(item.effect)
        }));
      return { relationships };
    }
    
    if (jsonParsed.relationships && Array.isArray(jsonParsed.relationships)) {
      const relationships = jsonParsed.relationships
        .filter((item: any) => item && typeof item === 'object' && item.cause && item.effect)
        .map((item: any) => ({
          cause: String(item.cause),
          effect: String(item.effect)
        }));
      return {
        relationships,
        confidence: jsonParsed.confidence
      };
    }
  } catch {
    // If JSON parsing fails, try extracting relationships using text patterns
  }

  // Fallback: Extract relationships from text using patterns
  const relationships: CausalRelationship[] = [];
  
  // Pattern 1: "X causes Y" or "X leads to Y"
  const causePattern = /(.+?)\s+(?:causes?|leads? to|results? in|brings? about|triggers?)\s+(.+)/gi;
  let match;
  while ((match = causePattern.exec(response)) !== null) {
    relationships.push({
      cause: match[1].trim(),
      effect: match[2].trim()
    });
  }
  
  // Pattern 2: "Y is caused by X" or "Y results from X"
  const effectPattern = /(.+?)\s+(?:is caused by|results from|stems from|is due to)\s+(.+)/gi;
  while ((match = effectPattern.exec(response)) !== null) {
    relationships.push({
      cause: match[2].trim(),
      effect: match[1].trim()
    });
  }
  
  // Pattern 3: "If X, then Y" or "When X, Y"
  const conditionalPattern = /(?:if|when)\s+(.+?),?\s+(?:then\s+)?(.+)/gi;
  while ((match = conditionalPattern.exec(response)) !== null) {
    relationships.push({
      cause: match[1].trim(),
      effect: match[2].trim()
    });
  }
  
  // Pattern 4: Bullet points with arrows or "→"
  const arrowPattern = /(.+?)\s*(?:→|->|=>|leads to|causes)\s*(.+)/gi;
  while ((match = arrowPattern.exec(response)) !== null) {
    relationships.push({
      cause: match[1].trim(),
      effect: match[2].trim()
    });
  }
  
  // Clean up relationships
  const cleanedRelationships = relationships
    .filter(rel => rel.cause.length > 0 && rel.effect.length > 0)
    .filter(rel => rel.cause.length < 200 && rel.effect.length < 200) // Reasonable length
    .map(rel => ({
      cause: rel.cause.replace(/^[-.•*\s]+/, '').trim(),
      effect: rel.effect.replace(/[.!?]*$/, '').trim(),
      location: rel.location,
      confidence: rel.confidence
    }));
  
  // Remove duplicates
  const uniqueRelationships = cleanedRelationships.filter((rel, index, arr) => 
    arr.findIndex(r => r.cause === rel.cause && r.effect === rel.effect) === index
  );
  
  return { relationships: uniqueRelationships };
};

export const parseResponse = (response: string, task: TaskType): any[] => {
  if (task === 'entity_extraction') {
    const parsed = parseEntityExtractionResponse(response);
    return parsed.entities;
  } else {
    const parsed = parseRelationshipExtractionResponse(response);
    return parsed.relationships;
  }
};

export const validateParsedResponse = (parsed: any[], task: TaskType): boolean => {
  if (!Array.isArray(parsed)) return false;
  
  if (task === 'entity_extraction') {
    return parsed.every(item => typeof item === 'string' && item.length > 0);
  } else {
    return parsed.every(item => 
      item && 
      typeof item === 'object' && 
      typeof item.cause === 'string' && 
      typeof item.effect === 'string' &&
      item.cause.length > 0 && 
      item.effect.length > 0
    );
  }
};