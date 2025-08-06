import React from 'react'
import ReactDOM from 'react-dom/client'
import CausalExtractionFramework from './CausalExtractionFramework'

/**
 * Error boundary wrapper component for the main application
 * Provides graceful error handling and displays error messages to user
 */
const App = () => {
  try {
    return <CausalExtractionFramework />;
  } catch (error) {
    console.error('App rendering error:', error);
    return <div className="p-4 text-red-600">Error loading application: {String(error)}</div>;
  }
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)