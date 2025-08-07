import React from 'react';
import { AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { EvaluationProgress } from '../types';

interface ProgressTabProps {
  selectedPrompts: string[];
  selectedModels: string[];
  progress: EvaluationProgress;
  isRunning: boolean;
}

export const ProgressTab: React.FC<ProgressTabProps> = ({ 
  selectedPrompts, 
  selectedModels, 
  progress,
  isRunning 
}) => {
  const progressPercentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;
  const isCompleted = progress.current === progress.total && progress.total > 0;
  
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {isCompleted ? 'Evaluation Completed' : 'Evaluation Progress'}
          </h3>
          {isCompleted && <CheckCircle className="w-6 h-6 text-green-600" />}
          {isRunning && !isCompleted && <Clock className="w-6 h-6 text-blue-600" />}
        </div>

        <div className="space-y-4">
          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progress: {progress.current} / {progress.total} evaluations</span>
              <span>{Math.round(progressPercentage)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all duration-300 ${
                  isCompleted ? 'bg-green-600' : 'bg-blue-600'
                }`}
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>

          {/* Current Status */}
          {(progress.currentModel || progress.currentPrompt) && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Currently Processing</h4>
              <div className="space-y-1 text-sm">
                {progress.currentModel && (
                  <p><span className="font-medium">Model:</span> {progress.currentModel}</p>
                )}
                {progress.currentPrompt && (
                  <p><span className="font-medium">Prompt:</span> {progress.currentPrompt}</p>
                )}
                {progress.currentSentence && (
                  <p><span className="font-medium">Status:</span> {progress.currentSentence}</p>
                )}
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-gray-800">{selectedPrompts.length}</div>
              <div className="text-sm text-gray-600">Prompts</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-gray-800">{selectedModels.length}</div>
              <div className="text-sm text-gray-600">Models</div>
            </div>
          </div>
        </div>
      </div>

      {/* Errors */}
      {progress.errors.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center space-x-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h3 className="text-lg font-semibold text-red-800">
              Errors ({progress.errors.length})
            </h3>
          </div>
          
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {progress.errors.map((error, index) => (
              <div key={index} className="bg-red-50 border border-red-200 p-3 rounded">
                <div className="text-sm">
                  <div className="font-medium text-red-800">
                    {error.model} + {error.prompt}
                    {error.sentenceId !== 'all' && (
                      <span className="ml-2 text-xs bg-red-200 px-2 py-0.5 rounded">
                        Sentence: {error.sentenceId}
                      </span>
                    )}
                  </div>
                  <div className="text-red-700 mt-1">{error.error}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Loading Animation */}
      {isRunning && !isCompleted && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex flex-col items-center justify-center space-y-4 py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-lg font-medium">Processing evaluations...</p>
            <p className="text-sm text-gray-600 text-center">
              This may take several minutes depending on the number of sentences and API response times.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};