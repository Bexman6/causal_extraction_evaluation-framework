import { Dataset } from '../types';
import { DatasetValidationResult } from './datasetStorage';

export interface FileSystemDatasetInfo {
  name: string;
  filename: string;
  size: number;
  lastModified: number;
  isValid: boolean;
}

export interface FileSystemStorageResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * File System Storage Service
 * Frontend service that communicates with the backend file system API
 * Handles large dataset storage and provides persistent local file storage
 */
export class FileSystemStorageService {
  private static apiBase = '/api/datasets';

  /**
   * Check if file system storage is available
   */
  static async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBase}/info`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * List all datasets stored in the file system
   */
  static async listDatasets(): Promise<FileSystemStorageResult<FileSystemDatasetInfo[]>> {
    try {
      const response = await fetch(`${this.apiBase}/list`);
      const result = await response.json();
      
      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to list datasets'
        };
      }
      
      return {
        success: true,
        data: result.data || []
      };
    } catch (error) {
      return {
        success: false,
        error: `Network error: ${error}`
      };
    }
  }

  /**
   * Load a specific dataset from file system
   */
  static async loadDataset(name: string): Promise<FileSystemStorageResult<Dataset>> {
    try {
      const response = await fetch(`${this.apiBase}/${encodeURIComponent(name)}`);
      const result = await response.json();
      
      if (!result.success) {
        return {
          success: false,
          error: result.error || `Failed to load dataset "${name}"`
        };
      }
      
      return {
        success: true,
        data: result.data
      };
    } catch (error) {
      return {
        success: false,
        error: `Network error loading dataset "${name}": ${error}`
      };
    }
  }

  /**
   * Save a dataset to the file system
   */
  static async saveDataset(
    name: string, 
    dataset: Dataset, 
    originalFilename?: string
  ): Promise<FileSystemStorageResult<{ filepath: string; size: number }>> {
    try {
      const response = await fetch(`${this.apiBase}/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          dataset,
          originalFilename
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        return {
          success: false,
          error: result.error || `Failed to save dataset "${name}"`
        };
      }
      
      console.log(`📁 Dataset "${name}" saved to file system (${result.data?.size} bytes)`);
      
      return {
        success: true,
        data: result.data
      };
    } catch (error) {
      return {
        success: false,
        error: `Network error saving dataset "${name}": ${error}`
      };
    }
  }

  /**
   * Delete a dataset from file system
   */
  static async deleteDataset(name: string): Promise<FileSystemStorageResult<boolean>> {
    try {
      const response = await fetch(`${this.apiBase}/${encodeURIComponent(name)}`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      
      if (!result.success) {
        return {
          success: false,
          error: result.error || `Failed to delete dataset "${name}"`
        };
      }
      
      console.log(`🗑️ Dataset "${name}" deleted from file system`);
      
      return {
        success: true,
        data: true
      };
    } catch (error) {
      return {
        success: false,
        error: `Network error deleting dataset "${name}": ${error}`
      };
    }
  }

  /**
   * Get file system storage information
   */
  static async getStorageInfo(): Promise<FileSystemStorageResult<{ totalFiles: number; totalSizeKB: number }>> {
    try {
      const response = await fetch(`${this.apiBase}/info`);
      const result = await response.json();
      
      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to get storage info'
        };
      }
      
      return {
        success: true,
        data: result.data
      };
    } catch (error) {
      return {
        success: false,
        error: `Network error getting storage info: ${error}`
      };
    }
  }

  /**
   * Validate a dataset before saving (frontend validation)
   */
  static validateDataset(data: any, filename: string = 'dataset'): DatasetValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic structure validation
    if (!data || typeof data !== 'object') {
      errors.push(`${filename}: Root level must be a JSON object`);
      return { isValid: false, errors, warnings };
    }

    if (!data.textBlocks) {
      errors.push(`${filename}: Missing required property 'textBlocks'`);
      return { isValid: false, errors, warnings };
    }

    if (!Array.isArray(data.textBlocks)) {
      errors.push(`${filename}: 'textBlocks' must be an array`);
      return { isValid: false, errors, warnings };
    }

    if (data.textBlocks.length === 0) {
      errors.push(`${filename}: 'textBlocks' array cannot be empty`);
      return { isValid: false, errors, warnings };
    }

    // Validate each text block (basic validation - full validation done on backend)
    data.textBlocks.forEach((textBlock: any, index: number) => {
      const blockContext = `${filename}: textBlocks[${index}]`;

      if (!textBlock || typeof textBlock !== 'object') {
        errors.push(`${blockContext}: Must be an object`);
        return;
      }

      const requiredFields = ['id', 'text', 'gold_entities', 'gold_relationships'];
      requiredFields.forEach(field => {
        if (!(field in textBlock)) {
          errors.push(`${blockContext}: Missing required field '${field}'`);
        }
      });
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Check if file system storage should be used based on dataset size
   */
  static shouldUseFileSystem(datasetSize: number): boolean {
    const LARGE_DATASET_THRESHOLD = 1024 * 1024; // 1MB
    return datasetSize >= LARGE_DATASET_THRESHOLD;
  }

  /**
   * Estimate dataset size in bytes (approximate)
   */
  static estimateDatasetSize(dataset: Dataset): number {
    try {
      return new Blob([JSON.stringify(dataset, null, 2)]).size;
    } catch {
      // Fallback estimation
      return JSON.stringify(dataset).length * 2; // Rough estimate
    }
  }

  /**
   * Batch load multiple datasets from file system
   */
  static async loadMultipleDatasets(names: string[]): Promise<Record<string, Dataset>> {
    const results: Record<string, Dataset> = {};
    
    await Promise.allSettled(
      names.map(async (name) => {
        const result = await this.loadDataset(name);
        if (result.success && result.data) {
          results[name] = result.data;
        } else {
          console.warn(`Failed to load dataset "${name}":`, result.error);
        }
      })
    );
    
    return results;
  }

  /**
   * Sync a dataset from localStorage to file system (backup)
   */
  static async backupToFileSystem(name: string, dataset: Dataset): Promise<boolean> {
    try {
      const result = await this.saveDataset(name, dataset);
      if (result.success) {
        console.log(`✅ Backed up dataset "${name}" to file system`);
        return true;
      } else {
        console.warn(`⚠️ Failed to backup dataset "${name}":`, result.error);
        return false;
      }
    } catch (error) {
      console.error(`❌ Error backing up dataset "${name}":`, error);
      return false;
    }
  }
}