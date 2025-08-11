import React, { useState, useMemo } from 'react';
import { Trash2, Upload, Info, Package } from 'lucide-react';
import { EvaluationResult, Dataset } from '../types';
import { EvaluationStorageService } from '../services/evaluationStorage';

interface DatabaseTabProps {
  runHistory: EvaluationResult[];
  uploadedData: Record<string, Dataset>;
  onClearResults?: () => void;
}

export const DatabaseTab: React.FC<DatabaseTabProps> = ({ runHistory, uploadedData, onClearResults }) => {
  const [sortBy, setSortBy] = useState('f1');
  const [filterBy, setFilterBy] = useState('all');
  const [showStorageInfo, setShowStorageInfo] = useState(false);
  
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
    const grouped: Record<string, { 
      task: string; 
      dataset: string; 
      runs: number; 
      avgF1: number; 
      totalF1: number; 
      bestModel: string; 
      bestPrompt: string;
      bestF1: number; 
    }> = {};
    
    runHistory.forEach(r => {
      const key = `${r.task}-${r.dataset}`;
      if (!grouped[key]) {
        grouped[key] = { 
          task: r.task, 
          dataset: r.dataset, 
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
      
      // Track best performing model and prompt for this task/dataset combination
      if (r.metrics.f1 > grouped[key].bestF1) {
        grouped[key].bestModel = r.model;
        grouped[key].bestPrompt = r.promptName;
        grouped[key].bestF1 = r.metrics.f1;
      }
    });
    
    return Object.values(grouped);
  }, [runHistory]);

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
              {sortedHistory.map((result, idx) => (
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
        <h3 className="text-lg font-semibold mb-4">Aggregated Performance</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dataset</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg F1</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Best Model</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Best Prompt</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Best F1</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Runs</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {aggregatedData.map((data, idx) => (
                <tr key={idx}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{data.task.replace('_', ' ')}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{data.dataset}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{data.avgF1.toFixed(3)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{data.bestModel}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{data.bestPrompt}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{data.bestF1.toFixed(3)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{data.runs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};