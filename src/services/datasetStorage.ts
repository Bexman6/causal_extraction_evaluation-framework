import { Dataset } from '../types';
import { FileSystemStorageService, FileSystemDatasetInfo } from './fileSystemStorage';

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
    storageLocation?: string;   // Where the dataset is stored ('localStorage' | 'filesystem')
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
// Size threshold for using file system storage (1MB)
const LARGE_DATASET_THRESHOLD = 1024 * 1024;

/**
 * Validation result interface
 */
export interface DatasetValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Service for managing persistent storage of datasets with hybrid storage support
 * Handles saving, loading, and managing dataset data across browser sessions
 * Uses localStorage for small datasets and file system for large datasets
 */
export class DatasetStorageService {
  private static storageKey = STORAGE_KEY;
  private static version = CURRENT_VERSION;
  private static fileSystemAvailable: boolean | null = null;

  /**
   * Check if file system storage is available
   */
  private static async checkFileSystemAvailability(): Promise<boolean> {
    if (this.fileSystemAvailable === null) {
      this.fileSystemAvailable = await FileSystemStorageService.isAvailable();
    }
    return this.fileSystemAvailable;
  }

  /**
   * Determine storage method based on dataset size
   */
  private static shouldUseFileSystem(dataset: Dataset, fileSize?: number): boolean {
    const estimatedSize = fileSize || FileSystemStorageService.estimateDatasetSize(dataset);
    return estimatedSize >= LARGE_DATASET_THRESHOLD;
  }

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
  static saveDatasets(datasets: Record<string, { data: Dataset; filename: string; uploadDate: number; fileSize: number; isValid: boolean; storageLocation?: string; }>): void {
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
   * Loads datasets from both localStorage and file system (hybrid loading)
   * @returns Record of dataset name to dataset data
   */
  static async loadAllDatasets(): Promise<Record<string, { data: Dataset; filename: string; uploadDate: number; fileSize: number; isValid: boolean; storageLocation?: string }>> {
    const result: Record<string, { data: Dataset; filename: string; uploadDate: number; fileSize: number; isValid: boolean; storageLocation?: string }> = {};
    
    // Load from localStorage first
    const localStorageDatasets = this.loadDatasets();
    Object.entries(localStorageDatasets).forEach(([name, datasetInfo]) => {
      result[name] = {
        ...datasetInfo,
        storageLocation: datasetInfo.storageLocation || 'localStorage'
      };
    });
    
    // Load from file system if available
    const fileSystemAvailable = await this.checkFileSystemAvailability();
    if (fileSystemAvailable) {
      const fileSystemList = await FileSystemStorageService.listDatasets();
      
      if (fileSystemList.success && fileSystemList.data) {
        for (const fileInfo of fileSystemList.data) {
          const datasetResult = await FileSystemStorageService.loadDataset(fileInfo.name);
          
          if (datasetResult.success && datasetResult.data) {
            // Prefer file system version if it's newer or if localStorage version doesn't exist
            const localVersion = result[fileInfo.name];
            const shouldUseFileSystem = !localVersion || fileInfo.lastModified > localVersion.uploadDate;
            
            if (shouldUseFileSystem) {
              result[fileInfo.name] = {
                data: datasetResult.data,
                filename: fileInfo.filename,
                uploadDate: fileInfo.lastModified,
                fileSize: fileInfo.size,
                isValid: fileInfo.isValid,
                storageLocation: 'filesystem'
              };
            }
          }
        }
      }
    }
    
    return result;
  }

  /**
   * Loads datasets from localStorage (legacy method)
   * @returns Record of dataset name to dataset data
   */
  static loadDatasets(): Record<string, { data: Dataset; filename: string; uploadDate: number; fileSize: number; isValid: boolean; storageLocation?: string }> {
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
   * Adds a new dataset to storage using hybrid storage strategy
   * @param name - Dataset name
   * @param dataset - Dataset data
   * @param filename - Original filename
   * @param fileSize - File size in bytes
   */
  static async addDataset(name: string, dataset: Dataset, filename: string, fileSize: number): Promise<{ success: boolean; storageMethod: string; error?: string }> {
    try {
      const validation = this.validateDataset(dataset, filename);
      
      if (!validation.isValid) {
        return {
          success: false,
          storageMethod: 'none',
          error: `Validation failed: ${validation.errors.join(', ')}`
        };
      }

      const useFileSystem = this.shouldUseFileSystem(dataset, fileSize);
      const fileSystemAvailable = await this.checkFileSystemAvailability();

      if (useFileSystem && fileSystemAvailable) {
        // Large dataset: Use file system storage
        const result = await FileSystemStorageService.saveDataset(name, dataset, filename);
        
        if (result.success) {
          // Also save metadata to localStorage for quick access
          const existingDatasets = this.loadDatasets();
          existingDatasets[name] = {
            data: dataset, // Keep data for compatibility, but flag as file-system stored
            filename,
            uploadDate: Date.now(),
            fileSize,
            isValid: true,
            storageLocation: 'filesystem' // New field to track storage location
          };
          
          try {
            this.saveDatasets(existingDatasets);
          } catch (localStorageError) {
            // localStorage failed, but file system succeeded - that's okay
            console.warn('localStorage save failed, but dataset saved to file system:', localStorageError);
          }
          
          return {
            success: true,
            storageMethod: 'filesystem'
          };
        } else {
          // File system failed, fallback to localStorage if possible
          if (fileSize < 5 * 1024 * 1024) { // 5MB localStorage limit
            console.warn('File system storage failed, falling back to localStorage');
            return this.addToLocalStorageOnly(name, dataset, filename, fileSize);
          } else {
            return {
              success: false,
              storageMethod: 'none',
              error: `File system storage failed and dataset too large for localStorage: ${result.error}`
            };
          }
        }
      } else {
        // Small dataset or file system unavailable: Use localStorage
        const result = this.addToLocalStorageOnly(name, dataset, filename, fileSize);
        
        // If file system is available, also backup to file system
        if (fileSystemAvailable && result.success) {
          FileSystemStorageService.backupToFileSystem(name, dataset)
            .then(backed_up => {
              if (backed_up) {
                console.log(`📁 Dataset "${name}" backed up to file system`);
              }
            })
            .catch(error => {
              console.warn(`Failed to backup dataset "${name}" to file system:`, error);
            });
        }
        
        return result;
      }
    } catch (error) {
      return {
        success: false,
        storageMethod: 'none',
        error: `Storage error: ${error}`
      };
    }
  }

  /**
   * Add dataset to localStorage only (legacy method)
   */
  private static addToLocalStorageOnly(name: string, dataset: Dataset, filename: string, fileSize: number): { success: boolean; storageMethod: string; error?: string } {
    try {
      const existingDatasets = this.loadDatasets();
      
      existingDatasets[name] = {
        data: dataset,
        filename,
        uploadDate: Date.now(),
        fileSize,
        isValid: true,
        storageLocation: 'localStorage'
      };
      
      this.saveDatasets(existingDatasets);
      
      return {
        success: true,
        storageMethod: 'localStorage'
      };
    } catch (error) {
      return {
        success: false,
        storageMethod: 'none',
        error: `localStorage save failed: ${error}`
      };
    }
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