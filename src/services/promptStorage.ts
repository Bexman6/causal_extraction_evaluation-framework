import { Prompt, TaskType } from '../types';
import { initialPrompts } from '../constants';

/**
 * Interface for the data structure stored in localStorage
 */
interface StoredPrompts {
  version: string;              // Version for data migration compatibility
  timestamp: number;            // When the data was last saved
  prompts: Record<string, Prompt[]>;  // The actual prompt data by task type
  deletedBuiltInPrompts: string[];    // IDs of built-in prompts that user deleted
}

// localStorage key for storing prompt data
const STORAGE_KEY = 'causal-extraction-prompts';
// Current version for data migration handling
const CURRENT_VERSION = '1.0';

/**
 * Service for managing persistent storage of prompts in localStorage
 * Handles saving, loading, and merging prompt data with built-in defaults
 */
export class PromptStorageService {
  private static storageKey = STORAGE_KEY;
  private static version = CURRENT_VERSION;

  /**
   * Saves prompts to localStorage with version and timestamp metadata
   * @param prompts - The prompt data to save, organized by task type
   * @param deletedBuiltInPrompts - Set of built-in prompt IDs that user has deleted
   */
  static savePrompts(prompts: Record<string, Prompt[]>, deletedBuiltInPrompts: Set<string> = new Set()): void {
    try {
      const dataToStore: StoredPrompts = {
        version: this.version,
        timestamp: Date.now(),
        prompts,
        // Convert Set to Array for JSON serialization
        deletedBuiltInPrompts: Array.from(deletedBuiltInPrompts)
      };
      localStorage.setItem(this.storageKey, JSON.stringify(dataToStore));
    } catch (error) {
      console.error('Failed to save prompts to localStorage:', error);
    }
  }

  /**
   * Loads prompts from localStorage and merges them with default prompts
   * @returns Merged prompt data with user customizations applied
   */
  static loadPrompts(): Record<string, Prompt[]> {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) {
        // First time user - return default prompts
        return this.getDefaultPrompts();
      }

      const parsedData: StoredPrompts = JSON.parse(stored);
      
      // Check version compatibility for future migrations
      if (parsedData.version !== this.version) {
        console.warn('Prompt storage version mismatch, using defaults');
        return this.getDefaultPrompts();
      }

      // Merge stored data with defaults, respecting user deletions
      return this.mergeWithDefaults(parsedData.prompts, new Set(parsedData.deletedBuiltInPrompts || []));
    } catch (error) {
      console.error('Failed to load prompts from localStorage:', error);
      return this.getDefaultPrompts();
    }
  }

  /**
   * Gets the set of built-in prompt IDs that the user has deleted
   * @returns Set of deleted built-in prompt IDs
   */
  static getDeletedBuiltInPrompts(): Set<string> {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) {
        return new Set();
      }

      const parsedData: StoredPrompts = JSON.parse(stored);
      // Convert Array back to Set
      return new Set(parsedData.deletedBuiltInPrompts || []);
    } catch (error) {
      console.error('Failed to load deleted prompts from localStorage:', error);
      return new Set();
    }
  }

  /**
   * Returns a copy of the default prompts from constants
   * @returns Default prompt configuration
   */
  private static getDefaultPrompts(): Record<string, Prompt[]> {
    return { ...initialPrompts };
  }

  /**
   * Merges stored prompts with default prompts, respecting user modifications
   * @param storedPrompts - User's stored prompt data
   * @param deletedBuiltInPrompts - Set of built-in prompts the user deleted
   * @returns Merged prompt configuration
   */
  private static mergeWithDefaults(
    storedPrompts: Record<string, Prompt[]>, 
    deletedBuiltInPrompts: Set<string>
  ): Record<string, Prompt[]> {
    const result: Record<string, Prompt[]> = {};

    // Process each task type from default prompts
    Object.keys(initialPrompts).forEach(taskType => {
      const defaultPrompts = initialPrompts[taskType as TaskType];
      const storedTaskPrompts = storedPrompts[taskType] || [];

      // Filter out deleted built-in prompts
      const filteredDefaults = defaultPrompts.filter(prompt => 
        !deletedBuiltInPrompts.has(prompt.id)
      );

      // Extract custom prompts (user-created)
      const customPrompts = storedTaskPrompts.filter(prompt => prompt.isCustom);

      // Extract updated built-in prompts (user-modified versions)
      const updatedBuiltInPrompts = storedTaskPrompts.filter(prompt => 
        !prompt.isCustom && !deletedBuiltInPrompts.has(prompt.id)
      );

      // Merge default and updated built-in prompts
      const mergedBuiltIns = this.mergeBuiltInPrompts(filteredDefaults, updatedBuiltInPrompts);

      // Combine built-in and custom prompts
      result[taskType] = [...mergedBuiltIns, ...customPrompts];
    });

    // Handle any task types that exist in storage but not in defaults
    Object.keys(storedPrompts).forEach(taskType => {
      if (!result[taskType]) {
        result[taskType] = storedPrompts[taskType];
      }
    });

    return result;
  }

  /**
   * Merges default built-in prompts with stored versions, preferring stored updates
   * @param defaults - Default built-in prompts
   * @param stored - User-modified versions of built-in prompts
   * @returns Merged array with user modifications applied
   */
  private static mergeBuiltInPrompts(defaults: Prompt[], stored: Prompt[]): Prompt[] {
    // Create lookup map for stored prompts by ID
    const storedById = new Map(stored.map(p => [p.id, p]));
    
    // Use stored version if exists, otherwise use default
    return defaults.map(defaultPrompt => {
      const storedVersion = storedById.get(defaultPrompt.id);
      return storedVersion || defaultPrompt;
    });
  }

  /**
   * Deletes a prompt from storage
   * @param promptId - ID of the prompt to delete
   * @param taskType - Task type the prompt belongs to
   * @param isBuiltIn - Whether this is a built-in prompt (affects deletion tracking)
   */
  static deletePrompt(promptId: string, taskType: TaskType, isBuiltIn: boolean): void {
    try {
      const currentPrompts = this.loadPrompts();
      const deletedBuiltInPrompts = this.getDeletedBuiltInPrompts();

      // Track built-in prompt deletions to prevent them from reappearing
      if (isBuiltIn) {
        deletedBuiltInPrompts.add(promptId);
      }

      // Remove prompt from current list
      currentPrompts[taskType] = currentPrompts[taskType].filter(p => p.id !== promptId);

      this.savePrompts(currentPrompts, deletedBuiltInPrompts);
    } catch (error) {
      console.error('Failed to delete prompt:', error);
    }
  }

  /**
   * Updates an existing prompt or adds it if not found
   * @param updatedPrompt - The prompt with updated content
   * @param taskType - Task type the prompt belongs to
   */
  static updatePrompt(updatedPrompt: Prompt, taskType: TaskType): void {
    try {
      const currentPrompts = this.loadPrompts();
      const deletedBuiltInPrompts = this.getDeletedBuiltInPrompts();

      const taskPrompts = currentPrompts[taskType] || [];
      const promptIndex = taskPrompts.findIndex(p => p.id === updatedPrompt.id);

      if (promptIndex >= 0) {
        // Update existing prompt
        taskPrompts[promptIndex] = updatedPrompt;
      } else {
        // Add new prompt if not found
        taskPrompts.push(updatedPrompt);
      }

      currentPrompts[taskType] = taskPrompts;
      this.savePrompts(currentPrompts, deletedBuiltInPrompts);
    } catch (error) {
      console.error('Failed to update prompt:', error);
    }
  }

  /**
   * Adds a new prompt to storage
   * @param newPrompt - The new prompt to add
   * @param taskType - Task type to add the prompt to
   */
  static addPrompt(newPrompt: Prompt, taskType: TaskType): void {
    try {
      const currentPrompts = this.loadPrompts();
      const deletedBuiltInPrompts = this.getDeletedBuiltInPrompts();

      // Initialize task type array if it doesn't exist
      if (!currentPrompts[taskType]) {
        currentPrompts[taskType] = [];
      }

      currentPrompts[taskType].push(newPrompt);
      this.savePrompts(currentPrompts, deletedBuiltInPrompts);
    } catch (error) {
      console.error('Failed to add prompt:', error);
    }
  }

  /**
   * Clears all stored prompt data from localStorage
   */
  static clearStorage(): void {
    try {
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      console.error('Failed to clear prompt storage:', error);
    }
  }

  /**
   * Resets prompts to default configuration by clearing storage
   * The next load will return default prompts
   */
  static resetToDefaults(): void {
    this.clearStorage();
  }
}