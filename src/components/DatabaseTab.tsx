import React, { useState, useMemo } from 'react';
import { Trash2, Upload, Info, Package } from 'lucide-react';
import { EvaluationResult, Dataset } from '../types';
import { EvaluationStorageService } from '../services/evaluationStorage';

interface DatabaseTabProps {
  runHistory: EvaluationResult[];
  uploadedData: Record<string, Dataset>;
  onClearResults?: () => void;
  onRemoveDataset?: (datasetName: string) => void;
  getDatasetStorageInfo?: () => { usedKB: number; datasetCount: number; };
  getDatasetMetadata?: () => { totalDatasets: number; lastUploadDate: number | null; };
}

export const DatabaseTab: React.FC<DatabaseTabProps> = ({ 
  runHistory, 
  uploadedData, 
  onClearResults, 
  onRemoveDataset,
  getDatasetStorageInfo,
  getDatasetMetadata: _getDatasetMetadata 
}) => {
  const [sortBy, setSortBy] = useState('f1');
  const [filterBy, setFilterBy] = useState('all');
  const [aggregatedDatasetFilter, setAggregatedDatasetFilter] = useState('all');
  const [showStorageInfo, setShowStorageInfo] = useState(false);
  
  // Detailed results subtab states
  const [detailedSubtab, setDetailedSubtab] = useState<'entity_extraction' | 'relationship_extraction'>('entity_extraction');
  const [promptFilter, setPromptFilter] = useState('all');
  const [modelFilter, setModelFilter] = useState('all');
  const [visibleMetrics, setVisibleMetrics] = useState<Set<string>>(new Set(['precision', 'recall', 'f1']));
  
  const sortedHistory = useMemo(() => {
    let filtered = runHistory;
    if (filterBy !== 'all') {
      filtered = runHistory.filter(r => r.dataset === filterBy);
    }
    
    return [...filtered].sort((a, b) => {
      if (sortBy === 'f1') return b.metrics.f1 - a.metrics.f1;
      if (sortBy === 'timestamp') return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      return 0;
    });
  }, [runHistory, sortBy, filterBy]);

  const aggregatedData = useMemo(() => {
    // Filter run history by selected dataset first
    let filteredHistory = runHistory;
    if (aggregatedDatasetFilter !== 'all') {
      filteredHistory = runHistory.filter(r => r.dataset === aggregatedDatasetFilter);
    }
    
    const grouped: Record<string, { 
      task: string; 
      runs: number; 
      avgF1: number; 
      totalF1: number; 
      bestModel: string; 
      bestPrompt: string;
      bestF1: number; 
    }> = {};
    
    filteredHistory.forEach(r => {
      const key = r.task; // Group by task only, not task-dataset
      if (!grouped[key]) {
        grouped[key] = { 
          task: r.task, 
          runs: 0, 
          avgF1: 0, 
          totalF1: 0, 
          bestModel: r.model, 
          bestPrompt: r.promptName,
          bestF1: r.metrics.f1 
        };
      }
      
      grouped[key].runs += 1;
      grouped[key].totalF1 += r.metrics.f1;
      grouped[key].avgF1 = grouped[key].totalF1 / grouped[key].runs;
      
      // Track best performing model and prompt for this task
      if (r.metrics.f1 > grouped[key].bestF1) {
        grouped[key].bestModel = r.model;
        grouped[key].bestPrompt = r.promptName;
        grouped[key].bestF1 = r.metrics.f1;
      }
    });
    
    return Object.values(grouped);
  }, [runHistory, aggregatedDatasetFilter]);

  // Detailed results data processing
  const detailedResults = useMemo(() => {
    // Filter by task
    let taskResults = runHistory.filter(r => r.task === detailedSubtab);
    
    // Apply prompt filter
    if (promptFilter !== 'all') {
      taskResults = taskResults.filter(r => r.promptName === promptFilter);
    }
    
    // Apply model filter
    if (modelFilter !== 'all') {
      taskResults = taskResults.filter(r => r.model === modelFilter);
    }
    
    // Sort by timestamp (most recent first) and limit to 5
    taskResults = taskResults
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);
    
    return taskResults;
  }, [runHistory, detailedSubtab, promptFilter, modelFilter]);

  // Get all unique metrics used across all runs
  const allMetrics = useMemo(() => {
    const metrics = new Set<string>();
    
    // Add built-in metrics
    metrics.add('precision');
    metrics.add('recall');
    metrics.add('f1');
    
    return Array.from(metrics);
  }, [runHistory]);

  // Get unique prompts and models for filters
  const uniquePrompts = useMemo(() => {
    const prompts = new Set(runHistory.filter(r => r.task === detailedSubtab).map(r => r.promptName));
    return Array.from(prompts).sort();
  }, [runHistory, detailedSubtab]);

  const uniqueModels = useMemo(() => {
    const models = new Set(runHistory.filter(r => r.task === detailedSubtab).map(r => r.model));
    return Array.from(models).sort();
  }, [runHistory, detailedSubtab]);

  // Storage management functions
  const handleClearResults = () => {
    if (window.confirm('Are you sure you want to clear all evaluation results? This action cannot be undone.')) {
      if (onClearResults) {
        onClearResults();
      }
    }
  };

  const handleExportResults = () => {
    try {
      const jsonData = EvaluationStorageService.exportToJSON();
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `evaluation-results-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export results:', error);
      alert('Failed to export results. Please try again.');
    }
  };

  const handleImportResults = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonData = e.target?.result as string;
        const success = EvaluationStorageService.importFromJSON(jsonData, false);
        if (success) {
          alert('Results imported successfully! Please refresh the page to see the imported data.');
        } else {
          alert('Failed to import results. Please check the file format.');
        }
      } catch (error) {
        console.error('Failed to import results:', error);
        alert('Failed to import results. Please check the file format.');
      }
    };
    reader.readAsText(file);
    
    // Reset the input
    event.target.value = '';
  };

  const storageInfo = EvaluationStorageService.getStorageInfo();
  const metadata = EvaluationStorageService.getMetadata();

  return (
    <div className="space-y-6">
      {/* Storage Management Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Storage Management</h3>
          <button
            onClick={() => setShowStorageInfo(!showStorageInfo)}
            className="text-gray-500 hover:text-gray-700"
          >
            <Info className="w-5 h-5" />
          </button>
        </div>
        
        {showStorageInfo && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm">
            <p><strong>Total Results:</strong> {metadata.totalResults}</p>
            <p><strong>Total Runs:</strong> {metadata.totalRuns}</p>
            <p><strong>Storage Used:</strong> {storageInfo.usedKB} KB</p>
            <p><strong>Last Updated:</strong> {metadata.lastUpdated ? new Date(metadata.lastUpdated).toLocaleString() : 'Never'}</p>
          </div>
        )}
        
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExportResults}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            title="Export complete evaluation history from persistent storage"
          >
            <Package className="w-4 h-4" />
            <span>Export All Data</span>
          </button>
          
          <label className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer"
                 title="Import evaluation results from a JSON file">
            <Upload className="w-4 h-4" />
            <span>Import Data</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportResults}
              className="hidden"
            />
          </label>
          
          {onClearResults && (
            <button
              onClick={handleClearResults}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              title="Permanently delete all stored evaluation results"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear All Results</span>
            </button>
          )}
        </div>
      </div>

      {/* Dataset Management Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Dataset Management</h3>
          <div className="flex items-center space-x-4 text-sm">
            {getDatasetStorageInfo && (
              <span className="text-gray-600">
                {getDatasetStorageInfo().datasetCount} datasets • {getDatasetStorageInfo().usedKB} KB
              </span>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(uploadedData).map(([name, dataset]) => {
            const isMockData = name.startsWith('Mock_Dataset');
            const textBlockCount = dataset.textBlocks?.length || 0;
            
            return (
              <div key={name} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-gray-900 truncate">{name}</h4>
                  {!isMockData && onRemoveDataset && (
                    <button
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to delete dataset "${name}"? This action cannot be undone.`)) {
                          onRemoveDataset(name);
                        }
                      }}
                      className="text-red-500 hover:text-red-700 ml-2"
                      title="Delete dataset"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                <div className="text-sm text-gray-600 space-y-1">
                  <div>Text blocks: {textBlockCount}</div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      isMockData 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {isMockData ? 'Built-in' : 'Uploaded'}
                    </span>
                  </div>
                </div>
                
                {!isMockData && (
                  <div className="mt-2 text-xs text-gray-500">
                    Stored persistently
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {Object.keys(uploadedData).length === 0 && (
          <div className="text-center text-gray-500 py-8">
            No datasets available. Upload a dataset to get started.
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Run History</h3>
          <div className="flex space-x-4">
            <select 
              className="border rounded px-3 py-1"
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value)}
            >
              <option value="all">All Datasets</option>
              {Object.keys(uploadedData).map(key => (
                <option key={key} value={key}>{key}</option>
              ))}
            </select>
            <select 
              className="border rounded px-3 py-1"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="f1">Sort by F1</option>
              <option value="timestamp">Sort by Date</option>
            </select>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dataset</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">F1 Score</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedHistory.slice(0, 8).map((result, idx) => (
                <tr key={idx}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(result.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{result.model}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{result.dataset}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{result.task.replace('_', ' ')}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{result.metrics.f1.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Aggregated Performance</h3>
          <select 
            className="border rounded px-3 py-1"
            value={aggregatedDatasetFilter}
            onChange={(e) => setAggregatedDatasetFilter(e.target.value)}
          >
            <option value="all">All Datasets</option>
            {Object.keys(uploadedData).map(key => (
              <option key={key} value={key}>{key}</option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Best F1</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Best Model</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Best Prompt</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg F1</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Runs</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {aggregatedData.map((data, idx) => (
                <tr key={idx}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{data.task.replace('_', ' ')}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{data.bestF1.toFixed(3)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{data.bestModel}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{data.bestPrompt}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{data.avgF1.toFixed(3)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{data.runs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Results by Task */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Detailed Results by Task</h3>
        
        {/* Subtab Navigation */}
        <div className="border-b border-gray-200 mb-4">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => {
                setDetailedSubtab('entity_extraction');
                setPromptFilter('all');
                setModelFilter('all');
              }}
              className={`${
                detailedSubtab === 'entity_extraction'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
            >
              Entity Extraction
            </button>
            <button
              onClick={() => {
                setDetailedSubtab('relationship_extraction');
                setPromptFilter('all');
                setModelFilter('all');
              }}
              className={`${
                detailedSubtab === 'relationship_extraction'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
            >
              Relationship Extraction
            </button>
          </nav>
        </div>

        {/* Column Filters */}
        <div className="flex flex-wrap gap-4 mb-4">
          <select
            className="border rounded px-3 py-1"
            value={promptFilter}
            onChange={(e) => setPromptFilter(e.target.value)}
          >
            <option value="all">All Prompts</option>
            {uniquePrompts.map(prompt => (
              <option key={prompt} value={prompt}>{prompt}</option>
            ))}
          </select>
          
          <select
            className="border rounded px-3 py-1"
            value={modelFilter}
            onChange={(e) => setModelFilter(e.target.value)}
          >
            <option value="all">All Models</option>
            {uniqueModels.map(model => (
              <option key={model} value={model}>{model}</option>
            ))}
          </select>
          
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-gray-600 self-center">Show metrics:</span>
            {allMetrics.map(metric => (
              <label key={metric} className="flex items-center space-x-1">
                <input
                  type="checkbox"
                  checked={visibleMetrics.has(metric)}
                  onChange={(e) => {
                    const newMetrics = new Set(visibleMetrics);
                    if (e.target.checked) {
                      newMetrics.add(metric);
                    } else {
                      newMetrics.delete(metric);
                    }
                    setVisibleMetrics(newMetrics);
                  }}
                  className="text-blue-600"
                />
                <span className="text-sm">{metric.replace('_', ' ')}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Dynamic Results Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prompt Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Model
                </th>
                {Array.from(visibleMetrics).map(metric => (
                  <th key={metric} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {metric.charAt(0).toUpperCase() + metric.slice(1).replace('_', ' ')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {detailedResults.map((result, idx) => (
                <tr key={idx}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {result.promptName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {result.model}
                  </td>
                  {Array.from(visibleMetrics).map(metric => {
                    let value: number | undefined;
                    
                    // Get value from built-in metrics only
                    if (['precision', 'recall', 'f1'].includes(metric)) {
                      value = result.metrics[metric as keyof typeof result.metrics] as number;
                    }
                    
                    return (
                      <td key={metric} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {value !== undefined ? value.toFixed(3) : ''}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {detailedResults.length === 0 && (
                <tr>
                  <td 
                    colSpan={2 + Array.from(visibleMetrics).length} 
                    className="px-6 py-4 text-center text-sm text-gray-500"
                  >
                    No results found for the selected filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};