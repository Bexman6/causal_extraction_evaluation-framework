import React from 'react';
import { X, AlertTriangle, CheckCircle } from 'lucide-react';
import { TaskType } from '../types';
import { jsonFormatTemplates } from '../constants';

interface JsonFormatPreviewModalProps {
  selectedTask: TaskType;
  show: boolean;
  onClose: () => void;
}

export const JsonFormatPreviewModal: React.FC<JsonFormatPreviewModalProps> = ({
  selectedTask,
  show,
  onClose
}) => {
  if (!show) return null;

  const formatData = jsonFormatTemplates[selectedTask];
  const isImplemented = !formatData.instructions.includes('TODO');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-3">
            <h3 className="text-xl font-semibold">JSON Output Format Preview</h3>
            {isImplemented ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Task Information */}
          <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
            <h4 className="font-medium text-gray-800 mb-2">
              Task: {selectedTask === 'entity_extraction' ? 'Causal Entity Extraction' : 'Causal Relation Classification'}
            </h4>
            <p className="text-sm text-gray-600 leading-relaxed">{formatData.description}</p>
          </div>

          {/* Implementation Status */}
          {!isImplemented && (
            <div className="bg-yellow-50 border border-yellow-300 p-4 rounded-lg shadow-sm">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="text-yellow-800 font-semibold">Implementation Pending</p>
                  <p className="text-yellow-700 mt-2 leading-relaxed">
                    The JSON format for relationship extraction is not yet implemented. 
                    The structure shown below is a placeholder and will be defined in future updates.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Format Instructions */}
          <div>
            <h4 className="font-medium text-gray-800 mb-3">Format Instructions:</h4>
            <div className="bg-gray-100 border border-gray-300 text-gray-800 p-4 rounded-lg font-mono text-sm">
              <pre className="whitespace-pre-wrap leading-relaxed">{formatData.instructions}</pre>
            </div>
          </div>

          {/* Example Output */}
          <div>
            <h4 className="font-medium text-gray-800 mb-3">Example Output:</h4>
            <div className="bg-blue-50 border border-blue-200 text-blue-900 p-4 rounded-lg">
              <pre className="text-sm font-mono overflow-x-auto leading-relaxed">
                {JSON.stringify(formatData.example, null, 2)}
              </pre>
            </div>
          </div>

          {/* Usage Notes */}
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
            <h4 className="font-medium text-yellow-800 mb-2">Usage Notes</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• This format instruction will be automatically appended to your selected prompts</li>
              <li>• Models will be instructed to return only JSON without additional explanatory text</li>
              <li>• The evaluation system will parse the JSON response for scoring</li>
              {!isImplemented && (
                <li className="text-yellow-800 font-medium">• This format is not yet implemented and will produce TODO placeholders</li>
              )}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end mt-6 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};