/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ANTHROPIC_API_KEY: string;
  readonly VITE_OPENAI_API_KEY: string;
  readonly VITE_DEFAULT_ANTHROPIC_MODEL?: string;
  readonly VITE_DEFAULT_OPENAI_MODEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}