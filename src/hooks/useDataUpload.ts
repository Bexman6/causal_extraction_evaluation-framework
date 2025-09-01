import { useState, useEffect } from 'react';
import { Dataset } from '../types';
import { mockTestData } from '../constants';
import { DatasetStorageService, DatasetValidationResult } from '../services/datasetStorage';

export const useDataUpload = () => {
  const [uploadedData, setUploadedData] = useState<Record<string, Dataset>>(mockTestData);

  // Load stored datasets on initialization with hybrid loading
  useEffect(() => {
    const loadAllDatasets = async () => {
      try {
        // Load from both localStorage and file system
        const storedDatasets = await DatasetStorageService.loadAllDatasets();
        const datasetMap: Record<string, Dataset> = { ...mockTestData };
        
        // Convert stored datasets to the format expected by the app
        Object.entries(storedDatasets).forEach(([name, datasetInfo]) => {
          if (datasetInfo.isValid) {
            datasetMap[name] = datasetInfo.data;
            
            // Log storage location for debugging
            const location = datasetInfo.storageLocation || 'localStorage';
            console.log(`📂 Loaded dataset "${name}" from ${location} (${Math.round(datasetInfo.fileSize / 1024)}KB)`);
          }
        });
        
        setUploadedData(datasetMap);
        
        const totalDatasets = Object.keys(storedDatasets).length;
        const fileSystemDatasets = Object.values(storedDatasets).filter(d => d.storageLocation === 'filesystem').length;
        const localStorageDatasets = totalDatasets - fileSystemDatasets;
        
        console.log(`✅ Loaded ${totalDatasets} datasets total:`);
        console.log(`   📁 File System: ${fileSystemDatasets} datasets`);
        console.log(`   💾 localStorage: ${localStorageDatasets} datasets`);
        
      } catch (error) {
        console.error('Error loading datasets from hybrid storage:', error);
        
        // Fallback to localStorage only
        try {
          const storedDatasets = DatasetStorageService.loadDatasets();
          const datasetMap: Record<string, Dataset> = { ...mockTestData };
          
          Object.entries(storedDatasets).forEach(([name, datasetInfo]) => {
            if (datasetInfo.isValid) {
              datasetMap[name] = datasetInfo.data;
            }
          });
          
          setUploadedData(datasetMap);
          console.warn('⚠️ Fallback: Loaded datasets from localStorage only');
        } catch (fallbackError) {
          console.error('Error loading datasets from localStorage fallback:', fallbackError);
          setUploadedData(mockTestData);
          console.warn('⚠️ Ultimate fallback: Using mock data only');
        }
      }
    };
    
    loadAllDatasets();
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
    reader.onload = async (e) => {
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
          // Determine storage method based on size
          const sizeKB = Math.round(file.size / 1024);
          const sizeMB = Math.round(file.size / (1024 * 1024) * 100) / 100;
          const isLarge = file.size >= 1024 * 1024; // 1MB threshold
          
          console.log(`📤 Uploading dataset "${datasetName}" (${sizeKB}KB) - ${isLarge ? 'Large dataset, using file system' : 'Small dataset, using localStorage + backup'}`);
          
          // Save to hybrid persistent storage
          const storageResult = await DatasetStorageService.addDataset(datasetName, data, file.name, file.size);
          
          if (storageResult.success) {
            // Update component state
            setUploadedData(prev => ({
              ...prev,
              [datasetName]: data
            }));
            
            setSelectedDataset(datasetName);
            
            // Create success message with storage details
            let successMessage = `Dataset "${datasetName}" uploaded successfully!\n`;
            successMessage += `Size: ${sizeMB}MB\n`;
            successMessage += `Storage: ${storageResult.storageMethod === 'filesystem' ? '📁 File System (data/datasets/)' : '💾 localStorage + File Backup'}`;
            
            if (validation.warnings.length > 0) {
              successMessage += `\n\nNote: ${validation.warnings.length} warning(s) were found but the dataset is valid.`;
            }
            
            alert(successMessage);
          } else {
            // Storage failed
            console.error('Failed to save dataset:', storageResult.error);
            alert(`Dataset "${datasetName}" validation succeeded but storage failed:\n\n${storageResult.error}\n\nThe dataset will only be available for this session.`);
            
            // Still update the component state for this session
            setUploadedData(prev => ({
              ...prev,
              [datasetName]: data
            }));
            setSelectedDataset(datasetName);
          }
        } catch (storageError) {
          console.error('Unexpected storage error:', storageError);
          alert(`Dataset "${datasetName}" validated successfully but failed to save due to an unexpected error. It will only be available for this session.`);
          
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