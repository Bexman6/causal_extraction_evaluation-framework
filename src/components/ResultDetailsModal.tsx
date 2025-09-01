import React from 'react';
import { EvaluationResult, MetricsResult, CausalRelationship } from '../types';

interface ResultDetailsModalProps {
  selectedResult: EvaluationResult;
  onClose: () => void;
}

// Helper function for case-insensitive comparison
const normalizeString = (str: string): string => {
  return str.toLowerCase().trim();
};

const includesCaseInsensitive = (array: string[], searchValue: string): boolean => {
  return array.some(item => normalizeString(item) === normalizeString(searchValue));
};

// Enhanced entity classification using semantic matching data
type EntityMatchType = 'exact' | 'semantic' | 'partial' | 'nomatch';

const getEntityMatchType = (
  entity: string, 
  semanticMatching: MetricsResult | undefined,
  goldData: string[]
): EntityMatchType => {
  if (!semanticMatching) {
    // Fallback to old exact matching logic when semantic data unavailable
    return includesCaseInsensitive(goldData, entity) ? 'exact' : 'nomatch';
  }
  
  // Check semantic matching categorization arrays
  if (semanticMatching.exact?.includes(entity)) return 'exact';
  if (semanticMatching.semantic?.includes(entity)) return 'semantic';
  if (semanticMatching.partial?.includes(entity)) return 'partial';
  return 'nomatch';
};

// Color mapping for different match types
const getEntityColorClasses = (matchType: EntityMatchType): string => {
  switch (matchType) {
    case 'exact': return 'bg-green-100 text-green-800';      // Green: Perfect match
    case 'semantic': return 'bg-blue-100 text-blue-800';     // Blue: Semantic match  
    case 'partial': return 'bg-yellow-100 text-yellow-800';  // Yellow: Partial match
    case 'nomatch': return 'bg-red-100 text-red-800';        // Red: No match
  }
};

// Enhanced relationship classification using semantic matching data
type RelationshipMatchType = 'exact' | 'semantic' | 'partial' | 'nomatch';

const areRelationshipsEqualInModal = (rel1: CausalRelationship, rel2: CausalRelationship): boolean => {
  return normalizeString(rel1.cause) === normalizeString(rel2.cause) && 
         normalizeString(rel1.effect) === normalizeString(rel2.effect);
};

const getRelationshipMatchType = (
  relationship: CausalRelationship, 
  semanticMatching: MetricsResult | undefined,
  goldData: CausalRelationship[]
): RelationshipMatchType => {
  if (!semanticMatching) {
    // Fallback: check if relationship exists in gold data using exact matching
    const hasExactMatch = goldData.some(goldRel => areRelationshipsEqualInModal(relationship, goldRel));
    return hasExactMatch ? 'exact' : 'nomatch';
  }
  
  // Check semantic matching categorization arrays (relationships are stored as JSON strings)
  const relationshipStr = JSON.stringify(relationship);
  if (semanticMatching.exact?.includes(relationshipStr)) return 'exact';
  if (semanticMatching.semantic?.includes(relationshipStr)) return 'semantic';
  if (semanticMatching.partial?.includes(relationshipStr)) return 'partial';
  return 'nomatch';
};

// Color mapping for relationship match types (same colors as entities)
const getRelationshipColorClasses = (matchType: RelationshipMatchType): string => {
  switch (matchType) {
    case 'exact': return 'bg-green-100 text-green-800 border-green-200';      // Green: Perfect match
    case 'semantic': return 'bg-blue-100 text-blue-800 border-blue-200';     // Blue: Semantic match  
    case 'partial': return 'bg-yellow-100 text-yellow-800 border-yellow-200'; // Yellow: Partial match
    case 'nomatch': return 'bg-red-100 text-red-800 border-red-200';         // Red: No match
  }
};

export const ResultDetailsModal: React.FC<ResultDetailsModalProps> = ({
  selectedResult,
  onClose
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold">Detailed Results</h3>
            <p className="text-sm text-gray-600 mt-1">
              Model: {selectedResult.model} | Prompt: {selectedResult.promptName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4 p-4 bg-gray-50 rounded">
          <h4 className="font-medium mb-2">Configuration:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h5 className="font-medium text-sm text-gray-700 mb-1">Prompt Template:</h5>
              <p className="text-sm font-mono bg-white p-2 rounded border">{selectedResult.promptTemplate}</p>
            </div>
            <div>
              <h5 className="font-medium text-sm text-gray-700 mb-1">Output Format:</h5>
              <p className="text-sm bg-white p-2 rounded border">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  selectedResult.outputFormat === 'json' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {selectedResult.outputFormat === 'json' ? 'JSON' : 'Plain Text'}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="mb-4 p-4 bg-blue-50 rounded">
          <h4 className="font-medium mb-2">Overall Metrics:</h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Precision:</span>
              <span className="ml-2 font-medium">{selectedResult.metrics.precision.toFixed(3)}</span>
            </div>
            <div>
              <span className="text-gray-600">Recall:</span>
              <span className="ml-2 font-medium">{selectedResult.metrics.recall.toFixed(3)}</span>
            </div>
            <div>
              <span className="text-gray-600">F1 Score:</span>
              <span className="ml-2 font-medium">{selectedResult.metrics.f1.toFixed(3)}</span>
            </div>
          </div>
        </div>

        {/* Show detailed breakdown if both metric types were calculated */}
        {selectedResult.metrics.standard && selectedResult.metrics.semanticMatching && (
          <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded">
              <h4 className="font-medium mb-2 text-gray-700">Standard Metrics (Exact Matching):</h4>
              <div className="space-y-1 text-sm">
                <div>
                  <span className="text-gray-600">Precision:</span>
                  <span className="ml-2 font-medium">{selectedResult.metrics.standard.precision.toFixed(3)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Recall:</span>
                  <span className="ml-2 font-medium">{selectedResult.metrics.standard.recall.toFixed(3)}</span>
                </div>
                <div>
                  <span className="text-gray-600">F1 Score:</span>
                  <span className="ml-2 font-medium">{selectedResult.metrics.standard.f1.toFixed(3)}</span>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-green-50 rounded">
              <h4 className="font-medium mb-2 text-green-700">Semantic Matching Metrics:</h4>
              <div className="space-y-1 text-sm">
                <div>
                  <span className="text-gray-600">Precision:</span>
                  <span className="ml-2 font-medium">{selectedResult.metrics.semanticMatching.precision.toFixed(3)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Recall:</span>
                  <span className="ml-2 font-medium">{selectedResult.metrics.semanticMatching.recall.toFixed(3)}</span>
                </div>
                <div>
                  <span className="text-gray-600">F1 Score:</span>
                  <span className="ml-2 font-medium">{selectedResult.metrics.semanticMatching.f1.toFixed(3)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <h4 className="font-medium">Textblock-by-Textblock Results:</h4>
          {selectedResult.sentenceResults.map((sentenceResult, idx) => (
            <div key={idx} className="border rounded-lg p-4">
              <div className="mb-3">
                <span className="text-sm font-medium text-gray-500">Textblock {idx + 1}:</span>
                <p className="mt-1">{sentenceResult.text}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h5 className="text-sm font-medium text-green-700 mb-2">Gold Standard:</h5>
                  <div className="text-sm space-y-1">
                    {selectedResult.task === 'entity_extraction' ? (
                      <div className="flex flex-wrap gap-1">
                        {sentenceResult.goldData.map((entity, i) => (
                          <span key={i} className="px-2 py-1 bg-green-100 text-green-800 rounded">
                            {entity}
                          </span>
                        ))}
                      </div>
                    ) : (
                      sentenceResult.goldData.map((rel, i) => (
                        <div key={i} className="p-2 bg-green-50 rounded">
                          <span className="font-medium">Cause:</span> {rel.cause} → 
                          <span className="font-medium ml-1">Effect:</span> {rel.effect}
                          {rel.location && <span className="ml-1">(Location: {rel.location})</span>}
                        </div>
                      ))
                    )}
                  </div>
                </div>
                
                <div>
                  <h5 className="text-sm font-medium text-blue-700 mb-2">Model Predictions:</h5>
                  
                  {/* Color coding legend for semantic matching */}
                  {selectedResult.metrics.semanticMatching && selectedResult.task === 'entity_extraction' && (
                    <div className="mb-2 text-xs text-gray-600 flex gap-3 flex-wrap">
                      <span className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-green-100 rounded border border-green-200"></div>
                        Exact
                      </span>
                      <span className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-blue-100 rounded border border-blue-200"></div>  
                        Semantic
                      </span>
                      <span className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-yellow-100 rounded border border-yellow-200"></div>
                        Partial
                      </span>
                      <span className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-red-100 rounded border border-red-200"></div>
                        No Match
                      </span>
                    </div>
                  )}

                  {/* Color coding legend for relationship semantic matching */}
                  {selectedResult.metrics.semanticMatching && selectedResult.task === 'relation_classification' && (
                    <div className="mb-2 text-xs text-gray-600 flex gap-3 flex-wrap">
                      <span className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-green-100 rounded border border-green-200"></div>
                        Exact
                      </span>
                      <span className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-blue-100 rounded border border-blue-200"></div>  
                        Semantic
                      </span>
                      <span className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-yellow-100 rounded border border-yellow-200"></div>
                        Partial
                      </span>
                      <span className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-red-100 rounded border border-red-200"></div>
                        No Match
                      </span>
                    </div>
                  )}
                  
                  <div className="text-sm space-y-1">
                    {selectedResult.task === 'entity_extraction' ? (
                      <div className="flex flex-wrap gap-1">
                        {sentenceResult.predictions.map((entity, i) => {
                          const matchType = getEntityMatchType(
                            entity, 
                            selectedResult.metrics.semanticMatching,
                            sentenceResult.goldData
                          );
                          const colorClasses = getEntityColorClasses(matchType);
                          
                          return (
                            <span 
                              key={i} 
                              className={`px-2 py-1 rounded ${colorClasses}`}
                              title={`Match type: ${matchType}`}
                            >
                              {entity}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      sentenceResult.predictions.map((rel, i) => {
                        const matchType = getRelationshipMatchType(
                          rel,
                          selectedResult.metrics.semanticMatching,
                          sentenceResult.goldData
                        );
                        const colorClasses = getRelationshipColorClasses(matchType);
                        
                        return (
                          <div 
                            key={i} 
                            className={`p-2 rounded border ${colorClasses}`}
                            title={`Match type: ${matchType}`}
                          >
                            <span className="font-medium">Cause:</span> {rel.cause} → 
                            <span className="font-medium ml-1">Effect:</span> {rel.effect}
                            {rel.confidence && <span className="ml-1 text-xs opacity-75">(conf: {rel.confidence.toFixed(2)})</span>}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};