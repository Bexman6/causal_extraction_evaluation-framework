import { useState } from 'react';
import { Dataset } from '../types';
import { mockTestData } from '../constants';

export const useDataUpload = () => {
  const [uploadedData, setUploadedData] = useState<Record<string, Dataset>>(mockTestData);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, setSelectedDataset: (dataset: string) => void) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          const datasetName = file.name.replace(/\.(json|jsonl)$/, '');
          setUploadedData(prev => ({
            ...prev,
            [datasetName]: data
          }));
          setSelectedDataset(datasetName);
          alert(`Dataset "${datasetName}" uploaded successfully!`);
        } catch (error) {
          alert('Error parsing file. Please ensure it\'s valid JSON/JSONL format.');
        }
      };
      reader.readAsText(file);
    }
  };

  return {
    uploadedData,
    handleFileUpload
  };
};