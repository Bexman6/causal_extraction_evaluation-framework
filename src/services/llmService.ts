import { ModelConfig, APIResponse, LLMRequest } from '../types';
import { ProxyLLMServiceFactory, ProxyLLMService } from './proxyApiService';

export interface LLMService {
  callModel(request: LLMRequest): Promise<APIResponse>;
  validateApiKeys(): Promise<boolean>;
}

class AnthropicService implements LLMService {
  private proxyService: ProxyLLMService;

  constructor() {
    this.proxyService = ProxyLLMServiceFactory.getService({
      id: 'anthropic',
      name: 'Anthropic',
      provider: 'anthropic',
      modelId: 'claude-3-7-sonnet-20250219',
      supportedTasks: ['entity_extraction', 'relationship_extraction']
    });
  }

  async callModel(request: LLMRequest): Promise<APIResponse> {
    return this.proxyService.callModel(request);
  }

  async validateApiKeys(): Promise<boolean> {
    return this.proxyService.validateApiKeys();
  }
}

class OpenAIService implements LLMService {
  private proxyService: ProxyLLMService;

  constructor() {
    this.proxyService = ProxyLLMServiceFactory.getService({
      id: 'openai',
      name: 'OpenAI',
      provider: 'openai',
      modelId: 'gpt-3.5-turbo',
      supportedTasks: ['entity_extraction', 'relationship_extraction']
    });
  }

  async callModel(request: LLMRequest): Promise<APIResponse> {
    return this.proxyService.callModel(request);
  }

  async validateApiKeys(): Promise<boolean> {
    return this.proxyService.validateApiKeys();
  }
}

class GoogleService implements LLMService {
  private proxyService: ProxyLLMService;

  constructor() {
    this.proxyService = ProxyLLMServiceFactory.getService({
      id: 'google',
      name: 'Google',
      provider: 'google',
      modelId: 'gemini-2.5-flash-lite',
      supportedTasks: ['entity_extraction', 'relationship_extraction']
    });
  }

  async callModel(request: LLMRequest): Promise<APIResponse> {
    return this.proxyService.callModel(request);
  }

  async validateApiKeys(): Promise<boolean> {
    return this.proxyService.validateApiKeys();
  }
}

export class LLMServiceFactory {
  private static anthropicService = new AnthropicService();
  private static openaiService = new OpenAIService();
  private static googleService = new GoogleService();

  static getService(model: ModelConfig): LLMService {
    switch (model.provider) {
      case 'anthropic':
        return this.anthropicService;
      case 'openai':
        return this.openaiService;
      case 'google':
        return this.googleService;
      default:
        throw new Error(`Unsupported model provider: ${model.provider}`);
    }
  }

  static async validateAllApiKeys(): Promise<{ anthropic: boolean; openai: boolean; google: boolean }> {
    return ProxyLLMServiceFactory.validateAllApiKeys();
  }
}

export const substitutePromptVariables = (template: string, variables: Record<string, string>): string => {
  let result = template;
  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = `{${key}}`;
    result = result.replace(new RegExp(placeholder, 'g'), value);
  });
  return result;
};

export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> => {
  let lastError: Error;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      if (i === maxRetries) break;
      
      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, i) + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
};