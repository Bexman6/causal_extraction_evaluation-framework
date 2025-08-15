# Datasets Folder

This folder is used for storing uploaded dataset files for the Causal Extraction Evaluation Framework.

## Purpose

- **Persistent Storage**: Dataset files uploaded through the UI are stored here
- **Pre-loading**: You can manually place dataset files here to have them automatically loaded
- **Backup**: Provides file system backup of uploaded datasets

## File Format

All files must be in JSON format with the following structure:

```json
{
  "textBlocks": [
    {
      "id": "unique_id",
      "text": "sentence text",
      "gold_entities": ["entity1", "entity2"],
      "gold_relationships": [
        {"cause": "entity1", "effect": "entity2"}
      ]
    }
  ]
}
```

## Usage

1. **Automatic**: Files uploaded through the UI are saved here automatically
2. **Manual**: Place valid JSON files here and restart the application to load them
3. **Management**: Use the Database tab in the application to manage stored datasets

## File Naming

- Files are saved with their original filename (without path)
- Duplicate names will overwrite existing files
- Use descriptive names for better organization

## Notes

- Large files may impact application performance
- Invalid JSON files will be ignored or show errors
- This folder can be excluded from version control if datasets are large