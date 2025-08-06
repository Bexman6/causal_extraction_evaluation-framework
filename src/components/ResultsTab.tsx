import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { EvaluationRun, EvaluationResult } from '../types';
import { ResultDetailsModal } from './ResultDetailsModal';

interface ResultsTabProps {
  currentRun: EvaluationRun | null;
}

export const ResultsTab: React.FC<ResultsTabProps> = ({ currentRun }) => {
  const [selectedResult, setSelectedResult] = useState<EvaluationResult | null>(null);

  if (!currentRun) {
    return <div className="text-center py-12">No results to display</div>;
  }

  // Get all unique metrics from selected metrics across results
  const allSelectedMetrics = new Set<string>();
  currentRun.results.forEach(r => {
    r.selectedMetrics?.forEach(metric => allSelectedMetrics.add(metric));
  });
  
  const chartData = currentRun.results.map(r => {
    const data: any = {
      name: `${r.promptName.split(' ')[0]}-${r.model.split('-').pop()}`
    };
    
    // Add built-in metrics if selected
    if (allSelectedMetrics.has('precision')) data.precision = r.metrics.precision;
    if (allSelectedMetrics.has('recall')) data.recall = r.metrics.recall;
    if (allSelectedMetrics.has('f1')) data.f1 = r.metrics.f1;
    
    // Add custom metrics if selected
    if (r.metrics.customMetrics) {
      Object.entries(r.metrics.customMetrics).forEach(([metricId, value]) => {
        if (allSelectedMetrics.has(metricId)) {
          data[metricId] = value;
        }
      });
    }
    
    return data;
  });
  
  const metricColors: Record<string, string> = {
    precision: '#3B82F6',
    recall: '#10B981',
    f1: '#F59E0B',
    // Generate colors for custom metrics
    ...Object.fromEntries(
      Array.from(allSelectedMetrics)
        .filter(m => !['precision', 'recall', 'f1'].includes(m))
        .map((metric, idx) => [metric, `hsl(${(idx * 137.5) % 360}, 70%, 50%)`])
    )
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Performance Metrics</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis domain={[0, 1]} />
            <Tooltip />
            <Legend />
            {Array.from(allSelectedMetrics).map(metric => (
              <Bar 
                key={metric} 
                dataKey={metric} 
                fill={metricColors[metric]} 
                name={metric.charAt(0).toUpperCase() + metric.slice(1)}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Detailed Results</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prompt</th>
                {Array.from(allSelectedMetrics).map(metric => (
                  <th key={metric} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {metric.charAt(0).toUpperCase() + metric.slice(1)}
                  </th>
                ))}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentRun.results.map((result, idx) => (
                <tr key={idx}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{result.model}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{result.promptName}</td>
                  {Array.from(allSelectedMetrics).map(metric => {
                    let value: number | undefined;
                    if (['precision', 'recall', 'f1'].includes(metric)) {
                      value = result.metrics[metric as keyof typeof result.metrics] as number;
                    } else if (result.metrics.customMetrics) {
                      value = result.metrics.customMetrics[metric];
                    }
                    return (
                      <td key={metric} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {value !== undefined ? value.toFixed(3) : 'N/A'}
                      </td>
                    );
                  })}
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => setSelectedResult(result)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedResult && (
        <ResultDetailsModal
          selectedResult={selectedResult}
          onClose={() => setSelectedResult(null)}
        />
      )}
    </div>
  );
};