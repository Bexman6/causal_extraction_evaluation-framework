import { useState } from 'react';
import { EvaluationResult, EvaluationRun, Dataset, Prompt, TaskType, EvaluationMetric, EvaluationProgress } from '../types';
import { calculateMetrics } from '../utils/metrics';
import { processEvaluationWithLLM } from '../utils/evaluation';
import { modelConfigs, jsonFormatTemplates } from '../constants';

export const useEvaluation = () => {
  const [currentRun, setCurrentRun] = useState<EvaluationRun | null>(null);
  const [runHistory, setRunHistory] = useState<EvaluationResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<EvaluationProgress>({
    current: 0,
    total: 0,
    errors: []
  });

  const runEvaluation = async (
    selectedPrompts: string[],
    selectedModels: string[],
    selectedDataset: string,
    selectedTask: TaskType,
    uploadedData: Record<string, Dataset>,
    prompts: Record<string, Prompt[]>,
    evaluationMetrics: EvaluationMetric[],
    jsonOutputFormat: boolean = false
  ) => {
    setIsRunning(true);
    
    const runId = Date.now().toString();
    const results: EvaluationResult[] = [];
    const sentences = uploadedData[selectedDataset].sentences;
    
    // Calculate total operations for progress tracking
    const totalOperations = selectedPrompts.length * selectedModels.length;
    let currentOperation = 0;

    // Reset progress
    setProgress({
      current: 0,
      total: totalOperations,
      errors: []
    });
    
    try {
      for (const promptId of selectedPrompts) {
        const prompt = prompts[selectedTask].find(p => p.id === promptId);
        if (!prompt) continue;
        
        for (const modelId of selectedModels) {
          const modelConfig = modelConfigs.find(m => m.id === modelId);
          if (!modelConfig) continue;

          currentOperation++;
          
          // Update progress
          setProgress(prev => ({
            ...prev,
            current: currentOperation,
            currentModel: modelConfig.name,
            currentPrompt: prompt.name
          }));

          try {
            // Prepare prompt template with JSON format instructions if enabled
            let finalPromptTemplate = prompt.template;
            if (jsonOutputFormat) {
              const jsonInstructions = jsonFormatTemplates[selectedTask].instructions;
              finalPromptTemplate = prompt.template + jsonInstructions;
            }

            // Process evaluation with real LLM
            const sentenceResults = await processEvaluationWithLLM(
              sentences,
              selectedTask,
              modelConfig,
              finalPromptTemplate,
              (_, __, currentSentence) => {
                setProgress(prev => ({
                  ...prev,
                  currentSentence: currentSentence ? `Processing: ${currentSentence.substring(0, 50)}...` : undefined
                }));
              }
            );

            const selectedMetricIds = evaluationMetrics.filter(m => m.enabled).map(m => m.id);
            const metrics = calculateMetrics(sentenceResults, selectedTask, evaluationMetrics);
            
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
              outputFormat: jsonOutputFormat ? 'json' : 'plain_text'
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
        }
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
    
    return newRun;
  };

  return {
    currentRun,
    runHistory,
    isRunning,
    progress,
    runEvaluation,
    setCurrentRun,
    setRunHistory
  };
};