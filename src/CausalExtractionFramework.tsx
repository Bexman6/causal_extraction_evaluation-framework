import React, { useState, useEffect } from 'react';
import { Play, Database, FileJson, TrendingUp, Upload, Download } from 'lucide-react';
import { TaskType, TabType, EvaluationMetric } from './types';
import { useEvaluation } from './hooks/useEvaluation';
import { usePrompts } from './hooks/usePrompts';
import { useDataUpload } from './hooks/useDataUpload';
import { exportResultsToJSON, exportDatabaseToCSV } from './utils/export';
import { LLMServiceFactory } from './services/llmService';
import { SetupTab } from './components/SetupTab';
import { ProgressTab } from './components/ProgressTab';
import { ResultsTab } from './components/ResultsTab';
import { DatabaseTab } from './components/DatabaseTab';

export default function CausalExtractionFramework() {
  const [activeTab, setActiveTab] = useState<TabType>('setup');
  const [selectedTask, setSelectedTask] = useState<TaskType>('entity_extraction');
  const [selectedPrompts, setSelectedPrompts] = useState<string[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [selectedDataset, setSelectedDataset] = useState('');
  const [outputFormat, setOutputFormat] = useState<'json' | 'raw'>('json');
  const [evaluationMetrics, setEvaluationMetrics] = useState<EvaluationMetric[]>([
    {
      id: 'standard',
      name: 'Standard Metrics (Precision, Recall, F1)',
      description: 'Traditional evaluation metrics using exact matching',
      enabled: false
    },
    {
      id: 'standard_semantic_matching',
      name: 'Standard Metrics with semantic matching and score',
      description: 'Evaluation metrics using weighted bipartite matching with semantic evaluation',
      enabled: true
    }
  ]);

  const [apiKeyStatus, setApiKeyStatus] = useState<{
    anthropic: boolean;
    openai: boolean;
    google: boolean;
    loading: boolean;
  }>({ anthropic: false, openai: false, google: false, loading: true });

  // Check API key status once on application load
  useEffect(() => {
    const checkApiKeys = async () => {
      setApiKeyStatus(prev => ({ ...prev, loading: true }));
      try {
        const status = await LLMServiceFactory.validateAllApiKeys();
        setApiKeyStatus({
          anthropic: status.anthropic,
          openai: status.openai,
          google: status.google,
          loading: false
        });
      } catch (error) {
        console.error('Failed to validate API keys:', error);
        setApiKeyStatus({
          anthropic: false,
          openai: false,
          google: false,
          loading: false
        });
      }
    };

    checkApiKeys();
  }, []);

  const { currentRun, runHistory, isRunning, progress, runEvaluation, clearStoredResults } = useEvaluation();
  const { 
    prompts, 
    showAddPrompt, 
    newPrompt, 
    showEditPrompt,
    setShowAddPrompt, 
    setNewPrompt, 
    addPrompt, 
    deletePrompt,
    editPrompt,
    updatePrompt,
    resetEditPromptForm
  } = usePrompts();
  const { uploadedData, handleFileUpload, removeDataset, getStorageInfo, getDatasetMetadata } = useDataUpload();

  // Auto-select first available dataset when uploadedData changes
  useEffect(() => {
    const availableDatasets = Object.keys(uploadedData);
    if (availableDatasets.length > 0 && (!selectedDataset || !uploadedData[selectedDataset])) {
      const firstDataset = availableDatasets[0];
      setSelectedDataset(firstDataset);
      console.log(`Auto-selected dataset: ${firstDataset}`);
    }
  }, [uploadedData, selectedDataset]);

  const handleRunEvaluation = async () => {
    // Pre-flight validation checks
    if (!selectedDataset) {
      alert('Please select a dataset before running evaluation.');
      return;
    }
    
    if (!uploadedData[selectedDataset]) {
      alert(`Selected dataset "${selectedDataset}" is not available. Please select a valid dataset.`);
      return;
    }
    
    if (selectedPrompts.length === 0) {
      alert('Please select at least one prompt before running evaluation.');
      return;
    }
    
    if (selectedModels.length === 0) {
      alert('Please select at least one model before running evaluation.');
      return;
    }
    
    const enabledMetrics = evaluationMetrics.filter(m => m.enabled);
    if (enabledMetrics.length === 0) {
      alert('Please enable at least one evaluation metric before running evaluation.');
      return;
    }
    
    setActiveTab('progress');
    await runEvaluation(
      selectedPrompts,
      selectedModels,
      selectedDataset,
      selectedTask,
      uploadedData,
      prompts,
      evaluationMetrics,
      outputFormat
    );
    setActiveTab('results');
  };

  const handleAddPrompt = () => {
    addPrompt(selectedTask);
  };

  const handleDeletePrompt = (promptId: string) => {
    deletePrompt(promptId, selectedTask, setSelectedPrompts);
  };

  /**
   * Handles editing a prompt by delegating to the usePrompts hook
   * @param promptId - ID of the prompt to edit
   */
  const handleEditPrompt = (promptId: string) => {
    editPrompt(promptId, selectedTask);
  };

  const handleExportResults = () => {
    if (currentRun) {
      exportResultsToJSON(currentRun);
    }
  };

  const handleExportDatabase = () => {
    exportDatabaseToCSV(runHistory);
  };

  const handleFileUploadWrapper = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFileUpload(event, setSelectedDataset);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-2xl font-bold text-gray-900">Causal Extraction Evaluation Framework</h1>
            <div className="flex space-x-2">
              <label className="flex items-center space-x-2 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>Upload Data</span>
                <input
                  type="file"
                  accept=".json,.jsonl"
                  onChange={handleFileUploadWrapper}
                  className="hidden"
                />
              </label>
              {currentRun && (
                <button 
                  onClick={handleExportResults}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-200 rounded hover:bg-blue-300"
                  title="Export only the current evaluation run results"
                >
                  <Download className="w-4 h-4" />
                  <span>Export Current Run</span>
                </button>
              )}
              {runHistory.length > 0 && (
                <button 
                  onClick={handleExportDatabase}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                >
                  <Database className="w-4 h-4" />
                  <span>Export Database</span>
                </button>
              )}
            </div>
          </div>
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {(['setup', 'progress', 'results', 'database'] as TabType[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`${
                    activeTab === tab
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize flex items-center space-x-2`}
                >
                  {tab === 'setup' && <FileJson className="w-4 h-4" />}
                  {tab === 'progress' && <Play className="w-4 h-4" />}
                  {tab === 'results' && <TrendingUp className="w-4 h-4" />}
                  {tab === 'database' && <Database className="w-4 h-4" />}
                  <span>{tab}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'setup' && (
          <SetupTab
            selectedTask={selectedTask}
            setSelectedTask={setSelectedTask}
            selectedDataset={selectedDataset}
            setSelectedDataset={setSelectedDataset}
            uploadedData={uploadedData}
            selectedPrompts={selectedPrompts}
            setSelectedPrompts={setSelectedPrompts}
            selectedModels={selectedModels}
            setSelectedModels={setSelectedModels}
            prompts={prompts}
            showAddPrompt={showAddPrompt}
            setShowAddPrompt={setShowAddPrompt}
            newPrompt={newPrompt}
            setNewPrompt={setNewPrompt}
            onAddPrompt={handleAddPrompt}
            onDeletePrompt={handleDeletePrompt}
            onEditPrompt={handleEditPrompt}
            onRunEvaluation={handleRunEvaluation}
            showEditPrompt={showEditPrompt}
            onUpdatePrompt={() => updatePrompt(selectedTask)}
            onResetEditPromptForm={resetEditPromptForm}
            evaluationMetrics={evaluationMetrics}
            setEvaluationMetrics={setEvaluationMetrics}
            outputFormat={outputFormat}
            setOutputFormat={setOutputFormat}
            apiKeyStatus={apiKeyStatus}
          />
        )}
        {activeTab === 'progress' && (
          <ProgressTab
            selectedPrompts={selectedPrompts}
            selectedModels={selectedModels}
            progress={progress}
            isRunning={isRunning}
          />
        )}
        {activeTab === 'results' && <ResultsTab currentRun={currentRun} />}
        {activeTab === 'database' && (
          <DatabaseTab
            runHistory={runHistory}
            uploadedData={uploadedData}
            onClearResults={clearStoredResults}
            onRemoveDataset={removeDataset}
            getDatasetStorageInfo={getStorageInfo}
            getDatasetMetadata={getDatasetMetadata}
          />
        )}
      </div>
    </div>
  );
}