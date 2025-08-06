import React from 'react';

/**
 * Props for the AddPromptModal component
 * Supports both adding new prompts and editing existing ones
 */
interface AddPromptModalProps {
  newPrompt: { name: string; template: string };  // Current form data
  setNewPrompt: React.Dispatch<React.SetStateAction<{ name: string; template: string }>>;  // Form data setter
  onAddPrompt: () => void;          // Callback for adding new prompt
  onClose: () => void;              // Callback for closing modal
  isEditMode?: boolean;             // Whether in edit mode (vs add mode)
  onUpdatePrompt?: () => void;      // Callback for updating existing prompt
}

/**
 * Modal component for adding new prompts or editing existing ones
 * Dynamically adapts UI based on isEditMode prop
 */
export const AddPromptModal: React.FC<AddPromptModalProps> = ({
  newPrompt,
  setNewPrompt,
  onAddPrompt,
  onClose,
  isEditMode = false,      // Default to add mode
  onUpdatePrompt
}) => {
  /**
   * Handles modal close with form reset
   */
  const handleClose = () => {
    onClose();
    setNewPrompt({ name: '', template: '' });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
        <h3 className="text-lg font-semibold mb-4">
          {isEditMode ? 'Edit Prompt' : 'Add Custom Prompt'}
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prompt Name</label>
            <input
              type="text"
              value={newPrompt.name}
              onChange={(e) => setNewPrompt(prev => ({ ...prev, name: e.target.value }))}
              className="w-full p-2 border rounded"
              placeholder="e.g., Advanced Entity Extraction"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prompt Template</label>
            <textarea
              value={newPrompt.template}
              onChange={(e) => setNewPrompt(prev => ({ ...prev, template: e.target.value }))}
              className="w-full p-2 border rounded h-32"
              placeholder="Use {text} as placeholder for the input text"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <button
              onClick={handleClose}
              className="px-4 py-2 border rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={isEditMode ? onUpdatePrompt : onAddPrompt}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {isEditMode ? 'Update Prompt' : 'Add Prompt'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};