import { ChatAnthropic } from '@langchain/anthropic';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage } from '@langchain/core/messages';
import { ModelConfig, APIResponse, LLMRequest } from '../types';

export interface LLMService {
  callModel(request: LLMRequest): Promise<APIResponse>;
  validateApiKeys(): Promise<boolean>;
}

class AnthropicService implements LLMService {
  private client: ChatAnthropic | null = null;

  private initializeClient(modelId: string, temperature = 0.0, maxTokens = 1000): ChatAnthropic {
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('Anthropic API key not found in environment variables');
    }

    return new ChatAnthropic({
      apiKey,
      model: modelId,
      temperature,
      maxTokens,
    });
  }

  async callModel(request: LLMRequest): Promise<APIResponse> {
    const startTime = Date.now();
    
    try {
      this.client = this.initializeClient(
        request.model.modelId,
        request.temperature ?? 0.0,
        request.maxTokens ?? 1000
      );

      const message = new HumanMessage({ content: request.prompt });
      const response = await this.client.invoke([message]);
      
      const latency = Date.now() - startTime;

      return {
        success: true,
        content: response.content.toString(),
        latency,
        tokens: {
          input: 0, // LangChain doesn't provide token counts by default
          output: 0,
          total: 0
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        latency: Date.now() - startTime
      };
    }
  }

  async validateApiKeys(): Promise<boolean> {
    try {
      const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
      if (!apiKey) return false;

      // Test with a simple prompt
      const testClient = this.initializeClient('claude-3-haiku-20240307', 0.1, 10);
      const testMessage = new HumanMessage({ content: 'Test' });
      await testClient.invoke([testMessage]);
      return true;
    } catch {
      return false;
    }
  }
}

class OpenAIService implements LLMService {
  private client: ChatOpenAI | null = null;

  private initializeClient(modelId: string, temperature = 0.0, maxTokens = 1000): ChatOpenAI {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not found in environment variables');
    }

    return new ChatOpenAI({
      apiKey,
      model: modelId,
      temperature,
      maxTokens,
    });
  }

  async callModel(request: LLMRequest): Promise<APIResponse> {
    const startTime = Date.now();
    
    try {
      this.client = this.initializeClient(
        request.model.modelId,
        request.temperature ?? 0.0,
        request.maxTokens ?? 1000
      );

      const message = new HumanMessage({ content: request.prompt });
      const response = await this.client.invoke([message]);
      
      const latency = Date.now() - startTime;

      return {
        success: true,
        content: response.content.toString(),
        latency,
        tokens: {
          input: 0, // LangChain doesn't provide token counts by default
          output: 0,
          total: 0
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        latency: Date.now() - startTime
      };
    }
  }

  async validateApiKeys(): Promise<boolean> {
    try {
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      if (!apiKey) return false;

      // Test with a simple prompt
      const testClient = this.initializeClient('gpt-3.5-turbo', 0.1, 10);
      const testMessage = new HumanMessage({ content: 'Test' });
      await testClient.invoke([testMessage]);
      return true;
    } catch {
      return false;
    }
  }
}

export class LLMServiceFactory {
  private static anthropicService = new AnthropicService();
  private static openaiService = new OpenAIService();

  static getService(model: ModelConfig): LLMService {
    switch (model.provider) {
      case 'anthropic':
        return this.anthropicService;
      case 'openai':
        return this.openaiService;
      default:
        throw new Error(`Unsupported model provider: ${model.provider}`);
    }
  }

  static async validateAllApiKeys(): Promise<{ anthropic: boolean; openai: boolean }> {
    try {
      const [anthropicValid, openaiValid] = await Promise.all([
        this.anthropicService.validateApiKeys(),
        this.openaiService.validateApiKeys()
      ]);

      return {
        anthropic: anthropicValid,
        openai: openaiValid
      };
    } catch {
      return {
        anthropic: false,
        openai: false
      };
    }
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