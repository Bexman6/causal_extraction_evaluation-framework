import React, { useState } from 'react';
import { Play, Trash2, Edit, AlertCircle, CheckCircle } from 'lucide-react';
import { TaskType, Prompt, EvaluationMetric } from '../types';
import { modelConfigs } from '../constants';
import { AddPromptModal } from './AddPromptModal';
import { JsonFormatPreviewModal } from './JsonFormatPreviewModal';

interface SetupTabProps {
  selectedTask: TaskType;
  setSelectedTask: (task: TaskType) => void;
  selectedDataset: string;
  setSelectedDataset: (dataset: string) => void;
  uploadedData: Record<string, any>;
  selectedPrompts: string[];
  setSelectedPrompts: React.Dispatch<React.SetStateAction<string[]>>;
  selectedModels: string[];
  setSelectedModels: React.Dispatch<React.SetStateAction<string[]>>;
  prompts: Record<string, Prompt[]>;
  showAddPrompt: boolean;
  setShowAddPrompt: (show: boolean) => void;
  newPrompt: { name: string; template: string };
  setNewPrompt: React.Dispatch<React.SetStateAction<{ name: string; template: string }>>;
  onAddPrompt: () => void;
  onDeletePrompt: (promptId: string) => void;
  onEditPrompt: (promptId: string) => void;
  onRunEvaluation: () => void;
  showEditPrompt?: boolean;
  onUpdatePrompt?: () => void;
  onResetEditPromptForm?: () => void;
  evaluationMetrics: EvaluationMetric[];
  setEvaluationMetrics: React.Dispatch<React.SetStateAction<EvaluationMetric[]>>;
  outputFormat: 'json' | 'raw';
  setOutputFormat: (value: 'json' | 'raw') => void;
  apiKeyStatus: {
    anthropic: boolean;
    openai: boolean;
    google: boolean;
    deepseek: boolean;
    loading: boolean;
  };
}

export const SetupTab: React.FC<SetupTabProps> = ({
  selectedTask,
  setSelectedTask,
  selectedDataset,
  setSelectedDataset,
  uploadedData,
  selectedPrompts,
  setSelectedPrompts,
  selectedModels,
  setSelectedModels,
  prompts,
  showAddPrompt,
  setShowAddPrompt,
  newPrompt,
  setNewPrompt,
  onAddPrompt,
  onDeletePrompt,
  onEditPrompt,
  onRunEvaluation,
  showEditPrompt = false,
  onUpdatePrompt,
  onResetEditPromptForm,
  setEvaluationMetrics,
  outputFormat,
  setOutputFormat,
  apiKeyStatus
}) => {
  const [selectedMetricSets, setSelectedMetricSets] = useState<string[]>(['standard_semantic_matching']);
  const [showJsonPreview, setShowJsonPreview] = useState(false);

  const getProviderIcon = (provider: 'anthropic' | 'openai' | 'google' | 'deepseek') => {
    if (apiKeyStatus.loading) {
      return <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>;
    }
    
    const isValid = apiKeyStatus[provider];
    return isValid ? 
      <CheckCircle className="w-4 h-4 text-green-600" /> : 
      <AlertCircle className="w-4 h-4 text-red-600" />;
  };

  const getModelsByProvider = (provider: 'anthropic' | 'openai' | 'google' | 'deepseek') => {
    return modelConfigs.filter(model => model.provider === provider);
  };

  const metricSets: Record<string, { name: string; description: string; metrics: string[] }> = {
    standard_semantic_matching: {
      name: 'Standard Metrics with semantic matching and score',
      description: 'Evaluation metrics using weighted bipartite matching with semantic evaluation',
      metrics: ['standard_semantic_matching']
    },
    standard: {
      name: 'Standard Metrics (Precision, Recall, F1)',
      description: 'Traditional evaluation metrics using exact matching',
      metrics: ['standard']
    }
  };

  const handleMetricSetToggle = (setId: string) => {
    console.log('Toggled metric set:', setId);
    
    // 1. Calculate new metric sets
    const newSets = selectedMetricSets.includes(setId)
      ? selectedMetricSets.filter(id => id !== setId)
      : [...selectedMetricSets, setId];
    
    // 2. Calculate enabled metrics from new sets
    const enabledMetrics = new Set<string>();
    newSets.forEach(selectedSetId => {
      metricSets[selectedSetId]?.metrics.forEach(metricId => {
        enabledMetrics.add(metricId);
      });
    });
    
    // 3. Update states sequentially (not nested)
    setSelectedMetricSets(newSets);
    setEvaluationMetrics(prevMetrics => 
      prevMetrics.map(metric => ({
        ...metric,
        enabled: enabledMetrics.has(metric.id)
      }))
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Task Selection</h3>
        <div className="space-y-2">
          <label className="flex items-center space-x-3">
            <input
              type="radio"
              checked={selectedTask === 'entity_extraction'}
              onChange={() => {
                setSelectedTask('entity_extraction');
                setSelectedPrompts([]);
              }}
              className="text-blue-600"
            />
            <span>Causal Entity Extraction</span>
          </label>
          <label className="flex items-center space-x-3">
            <input
              type="radio"
              checked={selectedTask === 'relation_classification'}
              onChange={() => {
                setSelectedTask('relation_classification');
                setSelectedPrompts([]);
              }}
              className="text-blue-600"
            />
            <span>Causal Relation Classification</span>
          </label>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Dataset Selection</h3>
        <select 
          className="w-full p-2 border rounded"
          value={selectedDataset}
          onChange={(e) => setSelectedDataset(e.target.value)}
        >
          {Object.keys(uploadedData).map(key => (
            <option key={key} value={key}>{key}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Prompt Selection</h3>
          <button
            onClick={() => setShowAddPrompt(true)}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            Add Custom Prompt
          </button>
        </div>
        
        <div className="mb-3 p-2 bg-gray-50 rounded border border-gray-200">
          <div className="space-y-1">
            <label className="flex items-center space-x-2 cursor-pointer text-sm">
              <input
                type="radio"
                name="outputFormat"
                value="json"
                checked={outputFormat === 'json'}
                onChange={(e) => setOutputFormat(e.target.value as 'json' | 'raw')}
                className="text-blue-600 w-3.5 h-3.5"
              />
              <span className="text-gray-700">JSON Output Format</span>
              <span className="text-xs text-gray-500">(Instructs models to return 
     structured JSON responses)</span>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setShowJsonPreview(true);
                }}
                className="ml-auto text-blue-500 hover:text-blue-700 text-xs"
              >
                Preview
              </button>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer text-sm">
              <input
                type="radio"
                name="outputFormat"
                value="raw"
                checked={outputFormat === 'raw'}
                onChange={(e) => setOutputFormat(e.target.value as 'json' | 'raw')}
                className="text-blue-600 w-3.5 h-3.5"
              />
              <span className="text-gray-700">Raw Output</span>
              <span className="text-xs text-gray-500">(No instruction to the model how to display response)</span>
            </label>
          </div>
        </div>
        
        <div className="space-y-4">
          {prompts[selectedTask].map(prompt => (
            <div key={prompt.id} className="flex items-start space-x-3">
              <input
                type="checkbox"
                checked={selectedPrompts.includes(prompt.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedPrompts(prev => [...prev, prompt.id]);
                  } else {
                    setSelectedPrompts(prev => prev.filter(id => id !== prompt.id));
                  }
                }}
                className="mt-1 text-blue-600"
              />
              <div className="flex-1">
                <div className="font-medium">
                  {prompt.name}
                  {prompt.isCustom && <span className="ml-2 text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">Custom</span>}
                </div>
                <div className="text-sm text-gray-600 font-mono">{prompt.template}</div>
                <div className="mt-2 flex space-x-2">
                  <button 
                    onClick={() => onEditPrompt(prompt.id)} 
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    <Edit className="w-4 h-4 inline mr-1" />
                    Edit
                  </button>
                  {prompt.isCustom && (
                    <button 
                      onClick={() => onDeletePrompt(prompt.id)} 
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      <Trash2 className="w-4 h-4 inline mr-1" />
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showAddPrompt && (
        <AddPromptModal
          newPrompt={newPrompt}
          setNewPrompt={setNewPrompt}
          onAddPrompt={onAddPrompt}
          onClose={() => setShowAddPrompt(false)}
        />
      )}
      {showEditPrompt && (
        <AddPromptModal
          newPrompt={newPrompt}
          setNewPrompt={setNewPrompt}
          onAddPrompt={onAddPrompt}
          onClose={onResetEditPromptForm || (() => {})}
          isEditMode={true}
          onUpdatePrompt={onUpdatePrompt}
        />
      )}
      
      <JsonFormatPreviewModal
        selectedTask={selectedTask}
        show={showJsonPreview}
        onClose={() => setShowJsonPreview(false)}
      />

      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Evaluation Metrics</h3>
        </div>
        <div className="space-y-3">
          {Object.entries(metricSets).map(([setId, setInfo]) => {
            return (
              <div key={setId} className="flex items-start space-x-3 p-3 border rounded-lg hover:border-blue-300 cursor-pointer"
                   onClick={() => handleMetricSetToggle(setId)}>
                <input
                  type="checkbox"
                  checked={selectedMetricSets.includes(setId)}
                  onChange={() => handleMetricSetToggle(setId)}
                  className="mt-1 text-blue-600"
                />
                <div className="flex-1">
                  <div className="font-medium">
                    {setInfo.name}
                    <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Built-in</span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">{setInfo.description}</div>
                </div>
              </div>
            );
          })}
        </div>
        
        {selectedMetricSets.length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">Selected Metrics:</h4>
            <div className="text-sm text-blue-700">
              {selectedMetricSets
                .map(setId => metricSets[setId]?.name)
                .filter(Boolean)
                .join(', ')}
            </div>
          </div>
        )}

      </div>


      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Model Selection</h3>
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-1">
              {getProviderIcon('anthropic')}
              <span className={`${apiKeyStatus.anthropic ? 'text-green-600' : 'text-red-600'}`}>
                Anthropic
              </span>
            </div>
            <div className="flex items-center space-x-1">
              {getProviderIcon('openai')}
              <span className={`${apiKeyStatus.openai ? 'text-green-600' : 'text-red-600'}`}>
                OpenAI
              </span>
            </div>
            <div className="flex items-center space-x-1">
              {getProviderIcon('google')}
              <span className={`${apiKeyStatus.google ? 'text-green-600' : 'text-red-600'}`}>
                Google
              </span>
            </div>
            <div className="flex items-center space-x-1">
              {getProviderIcon('deepseek')}
              <span className={`${apiKeyStatus.deepseek ? 'text-green-600' : 'text-red-600'}`}>
                DeepSeek
              </span>
            </div>
          </div>
        </div>

        {!apiKeyStatus.anthropic && !apiKeyStatus.openai && !apiKeyStatus.google && !apiKeyStatus.deepseek && !apiKeyStatus.loading && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="text-sm">
                <p className="text-yellow-800 font-medium">No API keys configured</p>
                <p className="text-yellow-700 mt-1">
                  Please add your API keys to the <code className="bg-yellow-100 px-1 rounded">.env.local</code> file:
                </p>
                <div className="mt-2 font-mono text-xs bg-yellow-100 p-2 rounded">
                  ANTHROPIC_API_KEY=your_key_here<br />
                  OPENAI_API_KEY=your_key_here<br />
                  GOOGLE_API_KEY=your_key_here<br />
                  DEEPSEEK_API_KEY=your_key_here
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {['anthropic', 'openai', 'google', 'deepseek'].map(provider => {
            const providerModels = getModelsByProvider(provider as 'anthropic' | 'openai' | 'google' | 'deepseek');
            const providerValid = apiKeyStatus[provider as 'anthropic' | 'openai' | 'google' | 'deepseek'];
            
            return (
              <div key={provider} className="border rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  {getProviderIcon(provider as 'anthropic' | 'openai' | 'google' | 'deepseek')}
                  <h4 className="font-medium capitalize">{provider}</h4>
                  {!providerValid && !apiKeyStatus.loading && (
                    <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">API Key Required</span>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {providerModels.map(model => (
                    <label key={model.id} className={`flex items-center space-x-2 p-2 rounded border ${!providerValid ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 cursor-pointer'}`}>
                      <input
                        type="checkbox"
                        checked={selectedModels.includes(model.id)}
                        disabled={!providerValid}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedModels(prev => [...prev, model.id]);
                          } else {
                            setSelectedModels(prev => prev.filter(m => m !== model.id));
                          }
                        }}
                        className="text-blue-600"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{model.name}</div>
                        {model.description && (
                          <div className="text-xs text-gray-600 mb-1">{model.description}</div>
                        )}
                        <div className="text-xs text-gray-500">
                          Max tokens: {model.maxTokens} | Temp: {model.temperature}
                        </div>
                        {model.pricing && (
                          <div className="text-xs text-blue-600 font-medium">
                            ${model.pricing.input.toFixed(2)}/${model.pricing.output.toFixed(2)} per 1M tokens
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <button
        onClick={onRunEvaluation}
        disabled={selectedPrompts.length === 0 || selectedModels.length === 0}
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
      >
        <Play className="w-5 h-5" />
        <span>Run Evaluation</span>
      </button>
    </div>
  );
};