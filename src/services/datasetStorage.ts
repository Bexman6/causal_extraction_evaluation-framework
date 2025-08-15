import { Dataset } from '../types';

/**
 * Interface for the data structure stored in localStorage for datasets
 */
interface StoredDatasets {
  version: string;              // Version for data migration compatibility
  timestamp: number;            // When the data was last saved
  datasets: Record<string, {    // Dataset name -> dataset info
    data: Dataset;              // The actual dataset
    filename: string;           // Original filename
    uploadDate: number;         // When it was uploaded
    fileSize: number;           // Size in bytes
    isValid: boolean;           // Validation status
  }>;
  metadata: {                   // Additional metadata for management
    totalDatasets: number;
    lastUploadDate: number;
    createdAt: number;
  };
}

// localStorage key for storing dataset data
const STORAGE_KEY = 'causal-extraction-datasets';
// Current version for data migration handling
const CURRENT_VERSION = '1.0';

/**
 * Validation result interface
 */
export interface DatasetValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Service for managing persistent storage of datasets in localStorage
 * Handles saving, loading, and managing dataset data across browser sessions
 */
export class DatasetStorageService {
  private static storageKey = STORAGE_KEY;
  private static version = CURRENT_VERSION;

  /**
   * Validates a dataset structure
   * @param data - The data to validate
   * @param filename - The filename for context in error messages
   * @returns Validation result with specific errors
   */
  static validateDataset(data: any, filename: string = 'uploaded file'): DatasetValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if data is an object
    if (!data || typeof data !== 'object') {
      errors.push(`${filename}: Root level must be a JSON object`);
      return { isValid: false, errors, warnings };
    }

    // Check for textBlocks property
    if (!data.textBlocks) {
      errors.push(`${filename}: Missing required property 'textBlocks'`);
      return { isValid: false, errors, warnings };
    }

    // Check if textBlocks is an array
    if (!Array.isArray(data.textBlocks)) {
      errors.push(`${filename}: 'textBlocks' must be an array`);
      return { isValid: false, errors, warnings };
    }

    // Check if textBlocks is not empty
    if (data.textBlocks.length === 0) {
      errors.push(`${filename}: 'textBlocks' array cannot be empty`);
      return { isValid: false, errors, warnings };
    }

    // Validate each textBlock
    data.textBlocks.forEach((textBlock: any, index: number) => {
      const blockContext = `${filename}: textBlocks[${index}]`;

      // Check if textBlock is an object
      if (!textBlock || typeof textBlock !== 'object') {
        errors.push(`${blockContext}: Must be an object`);
        return;
      }

      // Required fields
      const requiredFields = ['id', 'text', 'gold_entities', 'gold_relationships'];
      requiredFields.forEach(field => {
        if (!(field in textBlock)) {
          errors.push(`${blockContext}: Missing required field '${field}'`);
        }
      });

      // Validate id
      if (textBlock.id && typeof textBlock.id !== 'string') {
        errors.push(`${blockContext}: 'id' must be a string`);
      }

      // Validate text
      if (textBlock.text && typeof textBlock.text !== 'string') {
        errors.push(`${blockContext}: 'text' must be a string`);
      }

      // Validate gold_entities
      if (textBlock.gold_entities) {
        if (!Array.isArray(textBlock.gold_entities)) {
          errors.push(`${blockContext}: 'gold_entities' must be an array`);
        } else {
          textBlock.gold_entities.forEach((entity: any, entityIndex: number) => {
            if (typeof entity !== 'string') {
              errors.push(`${blockContext}: gold_entities[${entityIndex}] must be a string`);
            }
          });
        }
      }

      // Validate gold_relationships
      if (textBlock.gold_relationships) {
        if (!Array.isArray(textBlock.gold_relationships)) {
          errors.push(`${blockContext}: 'gold_relationships' must be an array`);
        } else {
          textBlock.gold_relationships.forEach((rel: any, relIndex: number) => {
            const relContext = `${blockContext}: gold_relationships[${relIndex}]`;
            
            if (!rel || typeof rel !== 'object') {
              errors.push(`${relContext}: Must be an object`);
              return;
            }

            // Required relationship fields
            if (!('cause' in rel)) {
              errors.push(`${relContext}: Missing required field 'cause'`);
            } else if (typeof rel.cause !== 'string') {
              errors.push(`${relContext}: 'cause' must be a string`);
            }

            if (!('effect' in rel)) {
              errors.push(`${relContext}: Missing required field 'effect'`);
            } else if (typeof rel.effect !== 'string') {
              errors.push(`${relContext}: 'effect' must be a string`);
            }

            // Optional fields validation
            if ('location' in rel && typeof rel.location !== 'string') {
              warnings.push(`${relContext}: 'location' should be a string if provided`);
            }
            if ('confidence' in rel && typeof rel.confidence !== 'number') {
              warnings.push(`${relContext}: 'confidence' should be a number if provided`);
            }
          });
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Saves datasets to localStorage with version and timestamp metadata
   * @param datasets - Record of dataset name to dataset data
   */
  static saveDatasets(datasets: Record<string, { data: Dataset; filename: string; uploadDate: number; fileSize: number; isValid: boolean; }>): void {
    try {
      const dataToStore: StoredDatasets = {
        version: this.version,
        timestamp: Date.now(),
        datasets,
        metadata: {
          totalDatasets: Object.keys(datasets).length,
          lastUploadDate: Math.max(...Object.values(datasets).map(d => d.uploadDate), 0),
          createdAt: Date.now()
        }
      };
      
      localStorage.setItem(this.storageKey, JSON.stringify(dataToStore));
    } catch (error) {
      console.error('Failed to save datasets to localStorage:', error);
      throw new Error('Failed to save datasets. Storage may be full.');
    }
  }

  /**
   * Loads datasets from localStorage
   * @returns Record of dataset name to dataset data
   */
  static loadDatasets(): Record<string, { data: Dataset; filename: string; uploadDate: number; fileSize: number; isValid: boolean; }> {
    try {
      const storedData = localStorage.getItem(this.storageKey);
      if (!storedData) {
        return {};
      }
      
      const parsed: StoredDatasets = JSON.parse(storedData);
      
      // Version compatibility check
      if (parsed.version !== this.version) {
        console.warn(`Dataset storage version mismatch. Expected ${this.version}, got ${parsed.version}. May need migration.`);
      }
      
      return parsed.datasets || {};
    } catch (error) {
      console.error('Failed to load datasets from localStorage:', error);
      return {};
    }
  }

  /**
   * Adds a new dataset to storage
   * @param name - Dataset name
   * @param dataset - Dataset data
   * @param filename - Original filename
   * @param fileSize - File size in bytes
   */
  static addDataset(name: string, dataset: Dataset, filename: string, fileSize: number): void {
    const existingDatasets = this.loadDatasets();
    const validation = this.validateDataset(dataset, filename);
    
    existingDatasets[name] = {
      data: dataset,
      filename,
      uploadDate: Date.now(),
      fileSize,
      isValid: validation.isValid
    };
    
    this.saveDatasets(existingDatasets);
  }

  /**
   * Removes a dataset from storage
   * @param name - Dataset name to remove
   */
  static removeDataset(name: string): void {
    const existingDatasets = this.loadDatasets();
    delete existingDatasets[name];
    this.saveDatasets(existingDatasets);
  }

  /**
   * Clears all stored datasets
   */
  static clearDatasets(): void {
    try {
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      console.error('Failed to clear datasets from localStorage:', error);
    }
  }

  /**
   * Gets storage information
   * @returns Storage statistics
   */
  static getStorageInfo(): { usedKB: number; datasetCount: number; } {
    try {
      const storedData = localStorage.getItem(this.storageKey);
      const usedBytes = storedData ? new Blob([storedData]).size : 0;
      const datasets = this.loadDatasets();
      
      return {
        usedKB: Math.round(usedBytes / 1024 * 100) / 100,
        datasetCount: Object.keys(datasets).length
      };
    } catch (error) {
      return { usedKB: 0, datasetCount: 0 };
    }
  }

  /**
   * Gets metadata about stored datasets
   * @returns Metadata object
   */
  static getMetadata(): { totalDatasets: number; lastUploadDate: number | null; } {
    try {
      const storedData = localStorage.getItem(this.storageKey);
      if (!storedData) {
        return { totalDatasets: 0, lastUploadDate: null };
      }
      
      const parsed: StoredDatasets = JSON.parse(storedData);
      return {
        totalDatasets: parsed.metadata?.totalDatasets || 0,
        lastUploadDate: parsed.metadata?.lastUploadDate || null
      };
    } catch (error) {
      return { totalDatasets: 0, lastUploadDate: null };
    }
  }

  /**
   * Exports all datasets to JSON
   * @returns JSON string of all datasets
   */
  static exportToJSON(): string {
    const datasets = this.loadDatasets();
    return JSON.stringify(datasets, null, 2);
  }

  /**
   * Imports datasets from JSON string
   * @param jsonData - JSON string containing dataset data
   * @returns Success status and any errors
   */
  static importFromJSON(jsonData: string): { success: boolean; errors: string[]; imported: number; } {
    try {
      const importedData = JSON.parse(jsonData);
      const errors: string[] = [];
      let imported = 0;
      
      if (typeof importedData === 'object' && importedData !== null) {
        Object.entries(importedData).forEach(([name, datasetInfo]: [string, any]) => {
          if (datasetInfo && typeof datasetInfo === 'object' && datasetInfo.data) {
            try {
              this.addDataset(name, datasetInfo.data, datasetInfo.filename || name, datasetInfo.fileSize || 0);
              imported++;
            } catch (error) {
              errors.push(`Failed to import dataset "${name}": ${error}`);
            }
          } else {
            errors.push(`Invalid dataset format for "${name}"`);
          }
        });
      } else {
        errors.push('Invalid import data format');
      }
      
      return { success: errors.length === 0, errors, imported };
    } catch (error) {
      return { success: false, errors: [`JSON parsing error: ${error}`], imported: 0 };
    }
  }
}