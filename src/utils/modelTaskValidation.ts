import { TaskType } from '../types';
import { modelConfigs } from '../constants';

/**
 * Interface for model information in validation results
 */
export interface ModelInfo {
  modelId: string;
  modelName: string;
}

/**
 * Interface for validation results
 */
export interface ModelTaskValidationResult {
  compatible: string[];
  incompatible: ModelInfo[];
}

/**
 * Check if a specific model supports a specific task
 * @param modelId - The ID of the model to check
 * @param task - The task type to validate against
 * @returns True if the model supports the task, false otherwise
 */
export const isModelTaskCompatible = (modelId: string, task: TaskType): boolean => {
  const model = modelConfigs.find(config => config.id === modelId);
  if (!model) {
    console.warn(`Model not found: ${modelId}`);
    return false;
  }
  
  return model.supportedTasks.includes(task);
};

/**
 * Validate model-task compatibility for multiple selected models
 * @param selectedModels - Array of selected model IDs
 * @param selectedTask - The selected task type
 * @returns Object containing arrays of compatible and incompatible models
 */
export const validateModelTaskSelections = (
  selectedModels: string[], 
  selectedTask: TaskType
): ModelTaskValidationResult => {
  const compatible: string[] = [];
  const incompatible: ModelInfo[] = [];
  
  selectedModels.forEach(modelId => {
    const model = modelConfigs.find(config => config.id === modelId);
    
    if (!model) {
      console.warn(`Model not found during validation: ${modelId}`);
      incompatible.push({ modelId, modelName: `Unknown Model (${modelId})` });
      return;
    }
    
    if (model.supportedTasks.includes(selectedTask)) {
      compatible.push(modelId);
    } else {
      incompatible.push({ 
        modelId: model.id, 
        modelName: model.name 
      });
    }
  });
  
  return { compatible, incompatible };
};

/**
 * Generate a user-friendly warning message for incompatible model-task combinations
 * @param incompatibleModels - Array of incompatible model information
 * @param taskName - Display name of the selected task
 * @returns Formatted warning message
 */
export const getIncompatibilityWarningMessage = (
  incompatibleModels: ModelInfo[],
  taskName?: string
): string => {
  if (incompatibleModels.length === 0) {
    return '';
  }
  
  const modelNames = incompatibleModels.map(model => model.modelName).join(', ');
  const taskDisplay = taskName || 'this task';
  
  if (incompatibleModels.length === 1) {
    return `${modelNames} may have limited support for ${taskDisplay}. The evaluation may fail or produce unexpected results.`;
  } else {
    return `The following models may have limited support for ${taskDisplay}: ${modelNames}. These evaluations may fail or produce unexpected results.`;
  }
};

/**
 * Get a display name for a task type
 * @param task - The task type
 * @returns User-friendly display name
 */
export const getTaskDisplayName = (task: TaskType): string => {
  switch (task) {
    case 'entity_extraction':
      return 'Causal Entity Extraction';
    case 'relation_classification':
      return 'Causal Relation Classification';
    case 'single_prompt_full_causal_extraction':
      return 'Single Prompt Full Causal Extraction';
    default:
      return task;
  }
};

/**
 * Check if any model in the selection has compatibility issues
 * @param selectedModels - Array of selected model IDs
 * @param selectedTask - The selected task type
 * @returns True if there are any incompatible models
 */
export const hasModelTaskIncompatibilities = (
  selectedModels: string[],
  selectedTask: TaskType
): boolean => {
  const validation = validateModelTaskSelections(selectedModels, selectedTask);
  return validation.incompatible.length > 0;
};