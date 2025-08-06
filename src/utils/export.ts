import { EvaluationRun, EvaluationResult } from '../types';

export const exportResultsToJSON = (currentRun: EvaluationRun) => {
  const dataStr = JSON.stringify(currentRun, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
  
  const exportFileDefaultName = `results_${currentRun.runId}.json`;
  
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
};

export const exportDatabaseToCSV = (runHistory: EvaluationResult[]) => {
  const headers = ['Timestamp', 'Model', 'Dataset', 'Task', 'Prompt', 'Precision', 'Recall', 'F1'];
  const csvData = runHistory.map(r => [
    new Date(r.timestamp).toLocaleString(),
    r.model,
    r.dataset,
    r.task,
    r.promptName || r.promptId,
    r.metrics.precision.toFixed(3),
    r.metrics.recall.toFixed(3),
    r.metrics.f1.toFixed(3)
  ]);
  
  const csvContent = [headers, ...csvData]
    .map(row => row.join(','))
    .join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `evaluation_database_${Date.now()}.csv`;
  a.click();
};