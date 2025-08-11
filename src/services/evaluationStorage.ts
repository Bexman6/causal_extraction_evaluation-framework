import { EvaluationResult } from '../types';

/**
 * Interface for the data structure stored in localStorage
 */
interface StoredEvaluations {
  version: string;              // Version for data migration compatibility
  timestamp: number;            // When the data was last saved
  evaluationResults: EvaluationResult[];  // The actual evaluation results
  metadata: {                   // Additional metadata for management
    totalRuns: number;
    lastRunId: string;
    createdAt: number;
  };
}

// localStorage key for storing evaluation data
const STORAGE_KEY = 'causal-extraction-evaluations';
// Current version for data migration handling
const CURRENT_VERSION = '1.0';

/**
 * Service for managing persistent storage of evaluation results in localStorage
 * Handles saving, loading, and managing evaluation data across browser sessions
 */
export class EvaluationStorageService {
  private static storageKey = STORAGE_KEY;
  private static version = CURRENT_VERSION;

  /**
   * Saves evaluation results to localStorage with version and timestamp metadata
   * @param results - The evaluation results to save
   */
  static saveResults(results: EvaluationResult[]): void {
    try {
      const lastRunId = results.length > 0 ? results[results.length - 1].runId : '';
      
      const dataToStore: StoredEvaluations = {
        version: this.version,
        timestamp: Date.now(),
        evaluationResults: results,
        metadata: {
          totalRuns: new Set(results.map(r => r.runId)).size,
          lastRunId,
          createdAt: Date.now()
        }
      };
      
      localStorage.setItem(this.storageKey, JSON.stringify(dataToStore));
    } catch (error) {
      console.error('Failed to save evaluation results to localStorage:', error);
    }
  }

  /**
   * Loads evaluation results from localStorage
   * @returns Array of evaluation results, empty array if none found or error
   */
  static loadResults(): EvaluationResult[] {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) {
        // First time user or no stored data
        return [];
      }

      const parsedData: StoredEvaluations = JSON.parse(stored);
      
      // Check version compatibility for future migrations
      if (parsedData.version !== this.version) {
        console.warn('Evaluation storage version mismatch, using empty results');
        return [];
      }

      return parsedData.evaluationResults || [];
    } catch (error) {
      console.error('Failed to load evaluation results from localStorage:', error);
      return [];
    }
  }

  /**
   * Adds new evaluation results to existing stored results
   * @param newResults - New evaluation results to append
   */
  static addResults(newResults: EvaluationResult[]): void {
    try {
      const existingResults = this.loadResults();
      const allResults = [...existingResults, ...newResults];
      this.saveResults(allResults);
    } catch (error) {
      console.error('Failed to add evaluation results:', error);
    }
  }

  /**
   * Gets metadata about stored evaluation results
   * @returns Metadata about the stored evaluations
   */
  static getMetadata(): { totalResults: number; totalRuns: number; lastUpdated: number | null } {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) {
        return { totalResults: 0, totalRuns: 0, lastUpdated: null };
      }

      const parsedData: StoredEvaluations = JSON.parse(stored);
      return {
        totalResults: parsedData.evaluationResults?.length || 0,
        totalRuns: parsedData.metadata?.totalRuns || 0,
        lastUpdated: parsedData.timestamp || null
      };
    } catch (error) {
      console.error('Failed to get evaluation metadata:', error);
      return { totalResults: 0, totalRuns: 0, lastUpdated: null };
    }
  }

  /**
   * Removes evaluation results for a specific run ID
   * @param runId - The run ID to remove
   */
  static removeRun(runId: string): void {
    try {
      const existingResults = this.loadResults();
      const filteredResults = existingResults.filter(r => r.runId !== runId);
      this.saveResults(filteredResults);
    } catch (error) {
      console.error('Failed to remove evaluation run:', error);
    }
  }

  /**
   * Removes old evaluation results, keeping only the most recent N runs
   * @param keepRecentRuns - Number of recent runs to keep
   */
  static pruneOldResults(keepRecentRuns: number = 50): void {
    try {
      const existingResults = this.loadResults();
      
      // Group by runId and sort by timestamp
      const runGroups = new Map<string, EvaluationResult[]>();
      existingResults.forEach(result => {
        if (!runGroups.has(result.runId)) {
          runGroups.set(result.runId, []);
        }
        runGroups.get(result.runId)!.push(result);
      });

      // Sort runs by timestamp (most recent first)
      const sortedRuns = Array.from(runGroups.entries())
        .sort((a, b) => {
          const aTime = new Date(a[1][0].timestamp).getTime();
          const bTime = new Date(b[1][0].timestamp).getTime();
          return bTime - aTime;
        });

      // Keep only the most recent runs
      const recentRuns = sortedRuns.slice(0, keepRecentRuns);
      const prunedResults = recentRuns.flatMap(([, results]) => results);
      
      this.saveResults(prunedResults);
    } catch (error) {
      console.error('Failed to prune old evaluation results:', error);
    }
  }

  /**
   * Clears all stored evaluation data from localStorage
   */
  static clearResults(): void {
    try {
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      console.error('Failed to clear evaluation storage:', error);
    }
  }

  /**
   * Resets evaluation results to empty state by clearing storage
   */
  static resetToDefaults(): void {
    this.clearResults();
  }

  /**
   * Exports all evaluation results as a JSON string
   * @returns JSON string of all evaluation results
   */
  static exportToJSON(): string {
    try {
      const results = this.loadResults();
      const metadata = this.getMetadata();
      
      return JSON.stringify({
        exportTimestamp: new Date().toISOString(),
        metadata,
        evaluationResults: results
      }, null, 2);
    } catch (error) {
      console.error('Failed to export evaluation results:', error);
      return '{"error": "Failed to export results"}';
    }
  }

  /**
   * Imports evaluation results from a JSON string
   * @param jsonData - JSON string containing evaluation results
   * @param replace - Whether to replace existing data or append to it
   */
  static importFromJSON(jsonData: string, replace: boolean = false): boolean {
    try {
      const importData = JSON.parse(jsonData);
      
      if (!importData.evaluationResults || !Array.isArray(importData.evaluationResults)) {
        throw new Error('Invalid import data format');
      }

      const importedResults = importData.evaluationResults as EvaluationResult[];
      
      if (replace) {
        this.saveResults(importedResults);
      } else {
        this.addResults(importedResults);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to import evaluation results:', error);
      return false;
    }
  }

  /**
   * Gets storage usage information
   * @returns Object with storage usage details
   */
  static getStorageInfo(): { usedBytes: number; usedKB: number; itemCount: number } {
    try {
      const stored = localStorage.getItem(this.storageKey);
      const usedBytes = stored ? new Blob([stored]).size : 0;
      const results = this.loadResults();
      
      return {
        usedBytes,
        usedKB: Math.round(usedBytes / 1024 * 100) / 100,
        itemCount: results.length
      };
    } catch (error) {
      console.error('Failed to get storage info:', error);
      return { usedBytes: 0, usedKB: 0, itemCount: 0 };
    }
  }
}