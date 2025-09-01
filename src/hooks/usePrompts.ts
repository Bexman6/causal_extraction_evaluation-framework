import { useState, useEffect } from 'react';
import { Prompt, TaskType } from '../types';
import { PromptStorageService } from '../services/promptStorage';
import { initialPrompts } from '../constants';

/**
 * Custom hook for managing prompt state with persistent storage
 * Handles loading, adding, editing, and deleting prompts with localStorage persistence
 */
export const usePrompts = () => {
  // Main prompt data state - initialized with defaults for immediate rendering
  const [prompts, setPrompts] = useState<Record<string, Prompt[]>>(initialPrompts);
  
  // UI state for add prompt modal
  const [showAddPrompt, setShowAddPrompt] = useState(false);
  const [newPrompt, setNewPrompt] = useState({ name: '', template: '' });
  
  // UI state for edit prompt modal
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [showEditPrompt, setShowEditPrompt] = useState(false);

  // Load prompts from persistent storage on component mount
  useEffect(() => {
    try {
      const loadedPrompts = PromptStorageService.loadPrompts();
      console.log('Loaded prompts:', loadedPrompts);
      setPrompts(loadedPrompts);
    } catch (error) {
      console.error('Error loading prompts:', error);
      // Fallback to empty prompts if storage fails
      setPrompts({
        entity_extraction: [],
        relation_classification: []
      });
    }
  }, []);

  /**
   * Adds a new custom prompt to the specified task type
   * @param selectedTask - The task type to add the prompt to
   */
  const addPrompt = (selectedTask: TaskType) => {
    if (newPrompt.name && newPrompt.template) {
      const newPromptObj: Prompt = {
        id: `custom_${Date.now()}`, // Generate unique ID with timestamp
        name: newPrompt.name,
        template: newPrompt.template,
        isCustom: true // Mark as user-created
      };
      
      // Save to persistent storage
      PromptStorageService.addPrompt(newPromptObj, selectedTask);
      
      // Update local state for immediate UI update
      setPrompts(prev => ({
        ...prev,
        [selectedTask]: [...(prev[selectedTask] || []), newPromptObj]
      }));
      
      // Reset form and close modal
      setNewPrompt({ name: '', template: '' });
      setShowAddPrompt(false);
    }
  };

  /**
   * Deletes a prompt from the specified task type
   * @param promptId - ID of the prompt to delete
   * @param selectedTask - Task type the prompt belongs to
   * @param setSelectedPrompts - Callback to update selected prompts in parent component
   */
  const deletePrompt = (promptId: string, selectedTask: TaskType, setSelectedPrompts: (fn: (prev: string[]) => string[]) => void) => {
    const promptToDelete = prompts[selectedTask]?.find(p => p.id === promptId);
    const isBuiltIn = promptToDelete ? !promptToDelete.isCustom : false;
    
    // Delete from persistent storage (tracks built-in deletions)
    PromptStorageService.deletePrompt(promptId, selectedTask, isBuiltIn);
    
    // Update local state for immediate UI update
    setPrompts(prev => ({
      ...prev,
      [selectedTask]: (prev[selectedTask] || []).filter(p => p.id !== promptId)
    }));
    
    // Remove from selected prompts if it was selected
    setSelectedPrompts(prev => prev.filter(id => id !== promptId));
  };

  /**
   * Resets and closes the add prompt form
   */
  const resetAddPromptForm = () => {
    setShowAddPrompt(false);
    setNewPrompt({ name: '', template: '' });
  };

  /**
   * Initiates editing of an existing prompt
   * @param promptId - ID of the prompt to edit  
   * @param selectedTask - Task type the prompt belongs to
   */
  const editPrompt = (promptId: string, selectedTask: TaskType) => {
    const promptToEdit = prompts[selectedTask]?.find(p => p.id === promptId);
    if (promptToEdit) {
      // Set up edit state with existing prompt data
      setEditingPrompt(promptToEdit);
      setNewPrompt({ name: promptToEdit.name, template: promptToEdit.template });
      setShowEditPrompt(true);
    }
  };

  /**
   * Updates an existing prompt with new content
   * @param selectedTask - Task type the prompt belongs to
   */
  const updatePrompt = (selectedTask: TaskType) => {
    if (editingPrompt && newPrompt.name && newPrompt.template) {
      const updatedPrompt: Prompt = {
        ...editingPrompt, // Preserve ID and other properties
        name: newPrompt.name,
        template: newPrompt.template
      };
      
      // Save to persistent storage
      PromptStorageService.updatePrompt(updatedPrompt, selectedTask);
      
      // Update local state for immediate UI update
      setPrompts(prev => ({
        ...prev,
        [selectedTask]: (prev[selectedTask] || []).map(p => 
          p.id === updatedPrompt.id ? updatedPrompt : p
        )
      }));
      
      // Reset edit state and close modal
      setEditingPrompt(null);
      setShowEditPrompt(false);
      setNewPrompt({ name: '', template: '' });
    }
  };

  /**
   * Resets and closes the edit prompt form
   */
  const resetEditPromptForm = () => {
    setShowEditPrompt(false);
    setEditingPrompt(null);
    setNewPrompt({ name: '', template: '' });
  };

  // Return all state and functions for use by components
  return {
    // State
    prompts,                    // Current prompt data
    showAddPrompt,             // Whether add modal is open
    newPrompt,                 // Form data for new/edit prompt
    editingPrompt,             // Prompt currently being edited
    showEditPrompt,            // Whether edit modal is open
    
    // Setters for UI state
    setShowAddPrompt,          // Control add modal visibility
    setNewPrompt,              // Update form data
    
    // Actions
    addPrompt,                 // Add new custom prompt
    deletePrompt,              // Delete existing prompt
    editPrompt,                // Start editing a prompt
    updatePrompt,              // Save changes to edited prompt
    resetAddPromptForm,        // Reset add form state
    resetEditPromptForm        // Reset edit form state
  };
};