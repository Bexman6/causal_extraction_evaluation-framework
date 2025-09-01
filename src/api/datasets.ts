import fs from 'fs';
import path from 'path';
import { Dataset } from '../types';

// Path to the datasets directory
const DATASETS_DIR = path.resolve(process.cwd(), 'data', 'datasets');

// Ensure datasets directory exists
if (!fs.existsSync(DATASETS_DIR)) {
  fs.mkdirSync(DATASETS_DIR, { recursive: true });
}

export interface DatasetFileInfo {
  name: string;
  filename: string;
  size: number;
  lastModified: number;
  isValid: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Dataset File System API
 * Handles reading/writing datasets to the data/datasets folder
 */
export class DatasetFileSystemAPI {
  
  /**
   * Get list of all datasets in the data/datasets folder
   */
  static async listDatasets(): Promise<ApiResponse<DatasetFileInfo[]>> {
    try {
      const files = fs.readdirSync(DATASETS_DIR);
      const jsonFiles = files.filter(file => file.match(/\\.json$/i));
      
      const datasets: DatasetFileInfo[] = [];
      
      for (const filename of jsonFiles) {
        const filepath = path.join(DATASETS_DIR, filename);
        const stats = fs.statSync(filepath);
        const name = filename.replace(/\\.json$/i, '');
        
        // Quick validation check
        let isValid = true;
        try {
          const content = fs.readFileSync(filepath, 'utf8');
          const data = JSON.parse(content);
          isValid = !!(data && typeof data === 'object' && data.textBlocks);
        } catch {
          isValid = false;
        }
        
        datasets.push({
          name,
          filename,
          size: stats.size,
          lastModified: stats.mtime.getTime(),
          isValid
        });
      }
      
      // Sort by last modified (newest first)
      datasets.sort((a, b) => b.lastModified - a.lastModified);
      
      return {
        success: true,
        data: datasets
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to list datasets: ${error}`
      };
    }
  }
  
  /**
   * Load a specific dataset from file system
   */
  static async loadDataset(name: string): Promise<ApiResponse<Dataset>> {
    try {
      const filename = name.endsWith('.json') ? name : `${name}.json`;
      const filepath = path.join(DATASETS_DIR, filename);
      
      if (!fs.existsSync(filepath)) {
        return {
          success: false,
          error: `Dataset "${name}" not found`
        };
      }
      
      const content = fs.readFileSync(filepath, 'utf8');
      const dataset = JSON.parse(content);
      
      return {
        success: true,
        data: dataset
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to load dataset "${name}": ${error}`
      };
    }
  }
  
  /**
   * Save a dataset to the file system
   */
  static async saveDataset(name: string, dataset: Dataset, originalFilename?: string): Promise<ApiResponse<{ filepath: string; size: number }>> {
    try {
      // Sanitize filename
      const sanitizedName = name.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `${sanitizedName}.json`;
      const filepath = path.join(DATASETS_DIR, filename);
      
      // Convert dataset to JSON string
      const jsonContent = JSON.stringify(dataset, null, 2);
      
      // Write to file
      fs.writeFileSync(filepath, jsonContent, 'utf8');
      
      // Get file size
      const stats = fs.statSync(filepath);
      
      console.log(`✅ Dataset saved: ${filepath} (${stats.size} bytes)`);
      
      return {
        success: true,
        data: {
          filepath,
          size: stats.size
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to save dataset "${name}": ${error}`
      };
    }
  }
  
  /**
   * Delete a dataset from the file system
   */
  static async deleteDataset(name: string): Promise<ApiResponse<boolean>> {
    try {
      const filename = name.endsWith('.json') ? name : `${name}.json`;
      const filepath = path.join(DATASETS_DIR, filename);
      
      if (!fs.existsSync(filepath)) {
        return {
          success: false,
          error: `Dataset "${name}" not found`
        };
      }
      
      fs.unlinkSync(filepath);
      
      console.log(`🗑️ Dataset deleted: ${filepath}`);
      
      return {
        success: true,
        data: true
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to delete dataset "${name}": ${error}`
      };
    }
  }
  
  /**
   * Check if a dataset exists in the file system
   */
  static async datasetExists(name: string): Promise<boolean> {
    const filename = name.endsWith('.json') ? name : `${name}.json`;
    const filepath = path.join(DATASETS_DIR, filename);
    return fs.existsSync(filepath);
  }
  
  /**
   * Get storage information
   */
  static async getStorageInfo(): Promise<ApiResponse<{ totalFiles: number; totalSizeKB: number }>> {
    try {
      const files = fs.readdirSync(DATASETS_DIR);
      const jsonFiles = files.filter(file => file.match(/\\.json$/i));
      
      let totalSize = 0;
      for (const filename of jsonFiles) {
        const filepath = path.join(DATASETS_DIR, filename);
        const stats = fs.statSync(filepath);
        totalSize += stats.size;
      }
      
      return {
        success: true,
        data: {
          totalFiles: jsonFiles.length,
          totalSizeKB: Math.round(totalSize / 1024 * 100) / 100
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get storage info: ${error}`
      };
    }
  }
}

/**
 * Express-like API handler for Vite dev server
 * This will handle HTTP requests to /api/datasets/*
 */
export async function handleDatasetAPI(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const pathname = url.pathname.replace('/api/datasets', '');
  const method = request.method;
  
  try {
    // GET /api/datasets/list - List all datasets
    if (method === 'GET' && pathname === '/list') {
      const result = await DatasetFileSystemAPI.listDatasets();
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // GET /api/datasets/{name} - Load specific dataset
    if (method === 'GET' && pathname.startsWith('/') && pathname !== '/list') {
      const name = pathname.substring(1);
      const result = await DatasetFileSystemAPI.loadDataset(name);
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // POST /api/datasets/save - Save dataset
    if (method === 'POST' && pathname === '/save') {
      const body = await request.json();
      const { name, dataset, originalFilename } = body;
      
      if (!name || !dataset) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Missing required fields: name and dataset'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      const result = await DatasetFileSystemAPI.saveDataset(name, dataset, originalFilename);
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // DELETE /api/datasets/{name} - Delete dataset
    if (method === 'DELETE' && pathname.startsWith('/')) {
      const name = pathname.substring(1);
      const result = await DatasetFileSystemAPI.deleteDataset(name);
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // GET /api/datasets/info - Get storage info
    if (method === 'GET' && pathname === '/info') {
      const result = await DatasetFileSystemAPI.getStorageInfo();
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Unknown endpoint
    return new Response(JSON.stringify({
      success: false,
      error: `Unknown endpoint: ${method} ${pathname}`
    }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: `Internal server error: ${error}`
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}