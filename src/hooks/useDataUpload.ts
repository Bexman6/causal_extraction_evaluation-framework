import { useState, useEffect } from 'react';
import { Dataset } from '../types';
import { mockTestData } from '../constants';
import { DatasetStorageService, DatasetValidationResult } from '../services/datasetStorage';

export const useDataUpload = () => {
  const [uploadedData, setUploadedData] = useState<Record<string, Dataset>>(mockTestData);

  // Load stored datasets on initialization
  useEffect(() => {
    try {
      const storedDatasets = DatasetStorageService.loadDatasets();
      const datasetMap: Record<string, Dataset> = { ...mockTestData };
      
      // Convert stored datasets to the format expected by the app
      Object.entries(storedDatasets).forEach(([name, datasetInfo]) => {
        if (datasetInfo.isValid) {
          datasetMap[name] = datasetInfo.data;
        }
      });
      
      setUploadedData(datasetMap);
      console.log(`Loaded ${Object.keys(storedDatasets).length} datasets from storage`);
    } catch (error) {
      console.error('Error loading datasets from storage:', error);
      // Fallback to mock data only
      setUploadedData(mockTestData);
    }
  }, []);

  const showValidationError = (validation: DatasetValidationResult, filename: string) => {
    let errorMessage = `Dataset "${filename}" validation failed:\n\n`;
    
    if (validation.errors.length > 0) {
      errorMessage += 'Errors:\n';
      validation.errors.forEach((error, index) => {
        errorMessage += `${index + 1}. ${error}\n`;
      });
    }
    
    if (validation.warnings.length > 0) {
      errorMessage += '\nWarnings:\n';
      validation.warnings.forEach((warning, index) => {
        errorMessage += `${index + 1}. ${warning}\n`;
      });
    }
    
    errorMessage += '\nRequired structure:\n';
    errorMessage += '{\n';
    errorMessage += '  "textBlocks": [\n';
    errorMessage += '    {\n';
    errorMessage += '      "id": "unique_id",\n';
    errorMessage += '      "text": "sentence text",\n';
    errorMessage += '      "gold_entities": ["entity1", "entity2"],\n';
    errorMessage += '      "gold_relationships": [\n';
    errorMessage += '        {"cause": "entity1", "effect": "entity2"}\n';
    errorMessage += '      ]\n';
    errorMessage += '    }\n';
    errorMessage += '  ]\n';
    errorMessage += '}';
    
    alert(errorMessage);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, setSelectedDataset: (dataset: string) => void) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.match(/\.(json|jsonl)$/i)) {
      alert('Please upload a JSON or JSONL file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const fileContent = e.target?.result as string;
        const data = JSON.parse(fileContent);
        const datasetName = file.name.replace(/\.(json|jsonl)$/i, '');
        
        // Validate the dataset structure
        const validation = DatasetStorageService.validateDataset(data, file.name);
        
        if (!validation.isValid) {
          showValidationError(validation, file.name);
          return;
        }
        
        // Show warnings if any
        if (validation.warnings.length > 0) {
          const warningMessage = `Dataset "${file.name}" uploaded with warnings:\n\n` +
            validation.warnings.map((w, i) => `${i + 1}. ${w}`).join('\n') +
            '\n\nDataset will still be uploaded. Continue?';
          
          if (!confirm(warningMessage)) {
            return;
          }
        }
        
        try {
          // Save to persistent storage
          DatasetStorageService.addDataset(datasetName, data, file.name, file.size);
          
          // Update component state
          setUploadedData(prev => ({
            ...prev,
            [datasetName]: data
          }));
          
          setSelectedDataset(datasetName);
          
          let successMessage = `Dataset "${datasetName}" uploaded successfully!`;
          if (validation.warnings.length > 0) {
            successMessage += `\n\nNote: ${validation.warnings.length} warning(s) were found but the dataset is valid.`;
          }
          
          alert(successMessage);
        } catch (storageError) {
          console.error('Failed to save dataset:', storageError);
          alert(`Dataset "${datasetName}" validated successfully but failed to save to persistent storage. It will only be available for this session.`);
          
          // Still update the component state for this session
          setUploadedData(prev => ({
            ...prev,
            [datasetName]: data
          }));
          setSelectedDataset(datasetName);
        }
        
      } catch (error) {
        if (error instanceof SyntaxError) {
          alert(`JSON parsing error in file "${file.name}":\n\n${error.message}\n\nPlease ensure the file contains valid JSON format.`);
        } else {
          alert(`Error processing file "${file.name}": ${error}\n\nPlease ensure it's a valid JSON/JSONL format.`);
        }
      }
    };
    
    reader.onerror = () => {
      alert(`Error reading file "${file.name}". Please try again.`);
    };
    
    reader.readAsText(file);
  };

  const removeDataset = (datasetName: string) => {
    try {
      // Remove from persistent storage
      DatasetStorageService.removeDataset(datasetName);
      
      // Update component state
      setUploadedData(prev => {
        const newData = { ...prev };
        delete newData[datasetName];
        return newData;
      });
      
      console.log(`Removed dataset: ${datasetName}`);
    } catch (error) {
      console.error('Failed to remove dataset:', error);
      throw error;
    }
  };

  const getStorageInfo = () => {
    return DatasetStorageService.getStorageInfo();
  };

  const getDatasetMetadata = () => {
    return DatasetStorageService.getMetadata();
  };

  return {
    uploadedData,
    handleFileUpload,
    removeDataset,
    getStorageInfo,
    getDatasetMetadata
  };
};