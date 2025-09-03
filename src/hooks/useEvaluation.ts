import { useState, useEffect } from 'react';
import { EvaluationResult, EvaluationRun, Dataset, Prompt, TaskType, EvaluationMetric, EvaluationProgress } from '../types';
import { calculateMetrics } from '../utils/metrics';
import { processEvaluationWithLLM } from '../utils/evaluation';
import { modelConfigs, jsonFormatTemplates } from '../constants';
import { EvaluationStorageService } from '../services/evaluationStorage';
import { validateModelTaskSelections, getIncompatibilityWarningMessage, getTaskDisplayName } from '../utils/modelTaskValidation';

export const useEvaluation = () => {
  const [currentRun, setCurrentRun] = useState<EvaluationRun | null>(null);
  const [runHistory, setRunHistory] = useState<EvaluationResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<EvaluationProgress>({
    current: 0,
    total: 0,
    errors: []
  });

  // Load existing evaluation results from persistent storage on initialization
  useEffect(() => {
    try {
      const storedResults = EvaluationStorageService.loadResults();
      console.log(`Loaded ${storedResults.length} evaluation results from storage`);
      setRunHistory(storedResults);
    } catch (error) {
      console.error('Error loading evaluation results from storage:', error);
      // Fallback to empty array if storage fails
      setRunHistory([]);
    }
  }, []);

  const runEvaluation = async (
    selectedPrompts: string[],
    selectedModels: string[],
    selectedDataset: string,
    selectedTask: TaskType,
    uploadedData: Record<string, Dataset>,
    prompts: Record<string, Prompt[]>,
    evaluationMetrics: EvaluationMetric[],
    outputFormat: 'json' | 'raw' = 'json'
  ) => {
    setIsRunning(true);
    
    // Validate that selected dataset exists
    if (!selectedDataset) {
      const error = 'No dataset selected. Please select a dataset before running evaluation.';
      console.error(error);
      alert(error);
      setIsRunning(false);
      return;
    }
    
    if (!uploadedData[selectedDataset]) {
      const error = `Dataset "${selectedDataset}" not found. Available datasets: ${Object.keys(uploadedData).join(', ')}`;
      console.error(error);
      alert(error);
      setIsRunning(false);
      return;
    }
    
    if (!uploadedData[selectedDataset].textBlocks || !Array.isArray(uploadedData[selectedDataset].textBlocks)) {
      const error = `Dataset "${selectedDataset}" is invalid or has no textBlocks. Please check the dataset structure.`;
      console.error(error);
      alert(error);
      setIsRunning(false);
      return;
    }
    
    // Validate model-task compatibility before starting evaluation
    const validation = validateModelTaskSelections(selectedModels, selectedTask);
    let modelsToUse = selectedModels;
    
    if (validation.incompatible.length > 0) {
      const taskDisplayName = getTaskDisplayName(selectedTask);
      const warningMessage = getIncompatibilityWarningMessage(validation.incompatible, taskDisplayName);
      
      const proceed = window.confirm(
        `${warningMessage}\n\nDo you want to proceed with only the compatible models (${validation.compatible.length} models) or cancel the evaluation?\n\nClick OK to proceed with compatible models only, or Cancel to abort.`
      );
      
      if (!proceed) {
        setIsRunning(false);
        return;
      }
      
      // Use only compatible models for evaluation
      if (validation.compatible.length === 0) {
        const error = 'No compatible models found for the selected task. Evaluation cancelled.';
        console.error(error);
        alert(error);
        setIsRunning(false);
        return;
      }
      
      // Use only compatible models
      modelsToUse = validation.compatible;
      console.log(`Proceeding with ${modelsToUse.length} compatible models:`, modelsToUse);
    }

    const runId = Date.now().toString();
    const results: EvaluationResult[] = [];
    const sentences = uploadedData[selectedDataset].textBlocks;
    
    // Calculate total operations for progress tracking (each sentence needs to be processed for each prompt-model combination)
    const totalOperations = selectedPrompts.length * modelsToUse.length * sentences.length;
   
    // Reset progress
    setProgress({
      current: 0,
      total: totalOperations,
      errors: []
    });
    
    try {
      let promptIndex = 0;
      for (const promptId of selectedPrompts) {
        const prompt = prompts[selectedTask].find(p => p.id === promptId);
        if (!prompt) continue;
        
        let modelIndex = 0;
        for (const modelId of modelsToUse) {
          const modelConfig = modelConfigs.find(m => m.id === modelId);
          if (!modelConfig) continue;

          // Set current model and prompt info
          setProgress(prev => ({
            ...prev,
            currentModel: modelConfig.name,
            currentPrompt: prompt.name
          }));

          try {
            // Prepare prompt template with format instructions if needed
            let finalPromptTemplate = prompt.template;
            if (outputFormat === 'json') {
              const jsonInstructions = jsonFormatTemplates[selectedTask].instructions;
              finalPromptTemplate = prompt.template + "\n" + jsonInstructions;
            }
            // For 'raw' format, no additional instructions are added

            // Process evaluation with LLM
            const sentenceResults = await processEvaluationWithLLM(
              sentences,
              selectedTask,
              modelConfig,
              finalPromptTemplate,
              prompt.name,
              (completedSentences, _totalSentences, currentSentence) => {
                // Calculate global progress based on current position across all combinations
                const completedCombinations = promptIndex * modelsToUse.length + modelIndex;
                const sentencesInCompletedCombinations = completedCombinations * sentences.length;
                const currentCombinationProgress = completedSentences;
                const totalCompleted = sentencesInCompletedCombinations + currentCombinationProgress;
                
                setProgress(prev => ({
                  ...prev,
                  current: totalCompleted,
                  currentSentence: currentSentence ? `Processing: ${currentSentence.substring(0, 50)}...` : undefined
                }));
              }
            );

            const selectedMetricIds = evaluationMetrics.filter(m => m.enabled).map(m => m.id);
            const metrics = await calculateMetrics(sentenceResults, selectedTask, evaluationMetrics);
            
            const result: EvaluationResult = {
              runId,
              promptId,
              promptName: prompt.name,
              promptTemplate: prompt.template,
              model: modelId,
              dataset: selectedDataset,
              task: selectedTask,
              timestamp: new Date().toISOString(),
              metrics,
              sentenceResults,
              selectedMetrics: selectedMetricIds,
              outputFormat
            };
            
            results.push(result);

            // Count successful operations and errors
            const errors = sentenceResults
              .filter(sr => sr.apiResponse && !sr.apiResponse.success)
              .map(sr => ({
                sentenceId: sr.sentenceId,
                model: modelId,
                prompt: prompt.name,
                error: sr.apiResponse?.error || 'Unknown error'
              }));

            if (errors.length > 0) {
              setProgress(prev => ({
                ...prev,
                errors: [...prev.errors, ...errors]
              }));
            }

          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`Error processing model ${modelId} with prompt ${prompt.name}:`, error);
            
            setProgress(prev => ({
              ...prev,
              errors: [...prev.errors, {
                sentenceId: 'all',
                model: modelId,
                prompt: prompt.name,
                error: errorMessage
              }]
            }));
          }
          modelIndex++;
        }
        promptIndex++;
      }
    } catch (error) {
      console.error('Evaluation failed:', error);
    } finally {
      setIsRunning(false);
      
      // Final progress update
      setProgress(prev => ({
        ...prev,
        current: totalOperations,
        currentSentence: 'Evaluation completed'
      }));
    }
    
    const newRun = { runId, results };
    setCurrentRun(newRun);
    setRunHistory(prev => [...prev, ...results]);
    
    // Auto-save results to persistent storage
    try {
      EvaluationStorageService.addResults(results);
      console.log(`Saved ${results.length} evaluation results to storage`);
    } catch (error) {
      console.error('Failed to save evaluation results to storage:', error);
      // Continue execution even if storage fails
    }
    
    return newRun;
  };

  // Clear all stored evaluation results
  const clearStoredResults = () => {
    try {
      EvaluationStorageService.clearResults();
      setRunHistory([]);
      setCurrentRun(null);
      console.log('Cleared all evaluation results from storage');
    } catch (error) {
      console.error('Failed to clear evaluation results from storage:', error);
    }
  };

  return {
    currentRun,
    runHistory,
    isRunning,
    progress,
    runEvaluation,
    setCurrentRun,
    setRunHistory,
    clearStoredResults
  };
};