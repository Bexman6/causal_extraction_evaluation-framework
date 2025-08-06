# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Causal Extraction Evaluation Framework** - a React-based web application for evaluating and comparing different models and prompts on causal entity and relationship extraction tasks. The framework provides a complete evaluation pipeline with data management, experiment configuration, execution, and results analysis.

## Architecture

The entire application is contained in a single React component (`causal-extraction-framework.tsx`) built with:
- **React**: Frontend framework with hooks for state management
- **Recharts**: For data visualization (bar charts, line charts)
- **Lucide React**: For icons throughout the UI
- **Tailwind CSS**: For styling (utility-first CSS classes)

### Core Functionality

The framework supports two main NLP tasks:
1. **Causal Entity Extraction**: Identifying entities involved in causal relationships
2. **Causal Relationship Extraction**: Extracting cause-effect relationships from text

### Key Components

- **Data Management**: Upload and manage datasets in JSON/JSONL format
- **Prompt Management**: Built-in and custom prompt templates with variable substitution
- **Model Selection**: Support for multiple language models (Claude, GPT variants)
- **Evaluation Engine**: Calculates precision, recall, and F1 scores
- **Results Visualization**: Charts and detailed result breakdowns
- **Run History**: Database-like storage of all evaluation runs

### Data Structure

Datasets must follow this structure:
```json
{
  "dataset_name": {
    "sentences": [
      {
        "id": "unique_id",
        "text": "sentence text",
        "gold_entities": ["entity1", "entity2"],
        "gold_relationships": [
          {"cause": "entity1", "effect": "entity2", "location": "optional"}
        ]
      }
    ]
  }
}
```

### State Management

The application uses React hooks for state management with these key state variables:
- `activeTab`: Controls which UI tab is displayed
- `selectedTask`: Current evaluation task (entity vs relationship extraction)
- `selectedPrompts`/`selectedModels`: User selections for evaluation
- `runHistory`: All historical evaluation results
- `uploadedData`: Stored datasets
- `prompts`: Available prompt templates

## Development Notes

- This is a standalone React component with no build system configured
- All dependencies are imported via ES6 modules
- Mock data and simulation functions are included for demonstration
- The evaluation engine simulates API calls with timeout delays
- Results include sentence-level predictions and overall metrics
- Custom prompts can be added dynamically and are marked as deletable

## File Structure

The repository contains only:
- `causal-extraction-framework.tsx` - The complete React application
- No configuration files, package.json, or build setup detected