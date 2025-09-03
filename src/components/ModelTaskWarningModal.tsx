import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { TaskType } from '../types';
import { ModelInfo, getIncompatibilityWarningMessage, getTaskDisplayName } from '../utils/modelTaskValidation';

interface ModelTaskWarningModalProps {
  show: boolean;
  onClose: () => void;
  incompatibleModels: ModelInfo[];
  selectedTask: TaskType;
  onRemoveIncompatibleModels?: () => void;
  onProceedAnyway?: () => void;
}

export const ModelTaskWarningModal: React.FC<ModelTaskWarningModalProps> = ({
  show,
  onClose,
  incompatibleModels,
  selectedTask,
  onRemoveIncompatibleModels,
  onProceedAnyway
}) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  if (!show) return null;

  const taskDisplayName = getTaskDisplayName(selectedTask);
  const warningMessage = getIncompatibilityWarningMessage(incompatibleModels, taskDisplayName);

  const handleClose = () => {
    if (dontShowAgain) {
      // Store preference in sessionStorage (session-based, not persistent)
      sessionStorage.setItem('hideModelTaskWarnings', 'true');
    }
    onClose();
  };

  const handleRemoveModels = () => {
    if (onRemoveIncompatibleModels) {
      onRemoveIncompatibleModels();
    }
    handleClose();
  };

  const handleProceed = () => {
    if (onProceedAnyway) {
      onProceedAnyway();
    }
    handleClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-6 h-6 text-yellow-600" />
            <h3 className="text-xl font-semibold text-gray-900">Model Compatibility Warning</h3>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Warning Message */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-gray-700 leading-relaxed">
              {warningMessage}
            </p>
          </div>

          {/* Incompatible Models List */}
          <div>
            <h4 className="font-medium text-gray-900 mb-2">
              Models with limited support for {taskDisplayName}:
            </h4>
            <ul className="bg-gray-50 rounded-lg p-3 space-y-1">
              {incompatibleModels.map((model, index) => (
                <li key={index} className="flex items-center space-x-2 text-sm">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                  <span className="font-medium">{model.modelName}</span>
                  <span className="text-gray-500">({model.modelId})</span>
                </li>
              ))}
            </ul>
          </div>

          {/* What happens next */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">What happens if you proceed:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• These models may fail during evaluation</li>
              <li>• Results from incompatible models may be unreliable</li>
              <li>• Compatible models will continue to work normally</li>
              <li>• You'll see error messages in the progress log</li>
            </ul>
          </div>

          {/* Don't show again option */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="dontShowAgain"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="text-blue-600"
            />
            <label htmlFor="dontShowAgain" className="text-sm text-gray-600">
              Don't show this warning again for this session
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          
          {onRemoveIncompatibleModels && (
            <button
              onClick={handleRemoveModels}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Remove Incompatible Models
            </button>
          )}
          
          {onProceedAnyway && (
            <button
              onClick={handleProceed}
              className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
            >
              Proceed Anyway
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Utility function to check if warnings should be suppressed for this session
 */
export const shouldShowModelTaskWarning = (): boolean => {
  return sessionStorage.getItem('hideModelTaskWarnings') !== 'true';
};