import React, { useState, useMemo } from 'react';
import { EvaluationResult, Dataset } from '../types';

interface DatabaseTabProps {
  runHistory: EvaluationResult[];
  uploadedData: Record<string, Dataset>;
}

export const DatabaseTab: React.FC<DatabaseTabProps> = ({ runHistory, uploadedData }) => {
  const [sortBy, setSortBy] = useState('f1');
  const [filterBy, setFilterBy] = useState('all');
  
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

  return (
    <div className="space-y-6">
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