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
      name: `${r.promptName}-${r.model}`
    };
    
    // Automatically read displayedValues to know which values to display
    if (r.metrics.displayedValues) {
      r.metrics.displayedValues.forEach(({ metricType, values }) => {
        const metricsSource = metricType === 'standard' ? r.metrics.standard : 
                             metricType === 'semanticMatching' ? r.metrics.semanticMatching : 
                             null;
        
        if (metricsSource) {
          values.forEach(valueName => {
            const displayKey = `${valueName}_${metricType}`;
            data[displayKey] = metricsSource[valueName as keyof typeof metricsSource];
          });
        }
      });
    }
    
    return data;
  });
  
  // Get all unique displayed values across all results
  const allDisplayedValues = new Set<string>();
  currentRun.results.forEach(r => {
    if (r.metrics.displayedValues) {
      r.metrics.displayedValues.forEach(({ metricType, values }) => {
        values.forEach(valueName => {
          allDisplayedValues.add(`${valueName}_${metricType}`);
        });
      });
    }
  });

  const metricColors: Record<string, string> = {
    // Standard metrics colors  
    'f1_standard': '#F59E0B',
    'precision_standard': '#3B82F6',
    'recall_standard': '#10B981',
    // Semantic matching colors
    'precision_semanticMatching': '#06B6D4',
    'recall_semanticMatching': '#10B981', 
    'f1_semanticMatching': '#F59E0B'
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl font-semibold mb-4">Performance Metrics</h3>
        <div className="w-full h-48 sm:h-56 md:h-64 lg:h-72 xl:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 1]} />
              <Tooltip 
                labelFormatter={(label) => `${label}`}
                formatter={(value: number, name: string) => [value.toFixed(3), name]}                
              />
              <Legend />
              {Array.from(allDisplayedValues).map(displayKey => {
                const [valueName, metricType] = displayKey.split('_');
                const displayName = `${valueName.charAt(0).toUpperCase() + valueName.slice(1)} (${metricType === 'semanticMatching' ? 'Semantic' : 'Standard'})`;
                
                return (
                  <Bar 
                    key={displayKey} 
                    dataKey={displayKey} 
                    fill={metricColors[displayKey]} 
                    name={displayName}
                  />
                );
              })}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl font-semibold mb-4">Detailed Results</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs sm:text-xs md:text-sm lg:text-base font-medium text-gray-500 uppercase tracking-wider">Model</th>
                <th className="px-6 py-3 text-left text-xs sm:text-xs md:text-sm lg:text-base font-medium text-gray-500 uppercase tracking-wider">Prompt</th>
                {Array.from(allDisplayedValues).map(displayKey => {
                  const [valueName, metricType] = displayKey.split('_');
                  const displayName = `${valueName.charAt(0).toUpperCase() + valueName.slice(1)} (${metricType === 'semanticMatching' ? 'Sem' : 'Std'})`;
                  
                  return (
                    <th key={displayKey} className="px-6 py-3 text-left text-xs sm:text-xs md:text-sm lg:text-base font-medium text-gray-500 uppercase tracking-wider">
                      {displayName}
                    </th>
                  );
                })}
                <th className="px-6 py-3 text-left text-xs sm:text-xs md:text-sm lg:text-base font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentRun.results.map((result, idx) => (
                <tr key={idx}>
                  <td className="px-6 py-4 whitespace-nowrap text-xs sm:text-sm md:text-base lg:text-lg font-medium text-gray-900">{result.model}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs sm:text-sm md:text-base lg:text-lg text-gray-500">{result.promptName}</td>
                  {Array.from(allDisplayedValues).map(displayKey => {
                    const [valueName, metricType] = displayKey.split('_');
                    let value: number | undefined;
                    
                    const metricsSource = metricType === 'standard' ? result.metrics.standard : 
                                         metricType === 'semanticMatching' ? result.metrics.semanticMatching : 
                                         null;
                    
                    if (metricsSource && ['precision', 'recall', 'f1'].includes(valueName)) {
                      value = metricsSource[valueName as keyof typeof metricsSource] as number;
                    }
                    
                    return (
                      <td key={displayKey} className="px-6 py-4 whitespace-nowrap text-xs sm:text-sm md:text-base lg:text-lg text-gray-500">
                        {value !== undefined ? value.toFixed(3) : 'N/A'}
                      </td>
                    );
                  })}
                  <td className="px-6 py-4 whitespace-nowrap text-xs sm:text-sm md:text-base lg:text-lg">
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