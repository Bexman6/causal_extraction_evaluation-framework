import { ModelConfig, APIResponse, LLMRequest } from '../types';

export interface ProxyLLMService {
  callModel(request: LLMRequest): Promise<APIResponse>;
  validateApiKeys(): Promise<boolean>;
}

class ProxyAnthropicService implements ProxyLLMService {
  async callModel(request: LLMRequest): Promise<APIResponse> {
    const startTime = Date.now();
    
    try {
      const response = await fetch('/api/anthropic/v1/messages', {
        method: 'POST',
        // Let the proxy handle all headers including Content-Type and authentication
        body: JSON.stringify({
          model: request.model.modelId,
          max_tokens: request.maxTokens ?? 1000,
          temperature: request.temperature ?? 0.0,
          messages: [
            {
              role: 'user',
              content: request.prompt
            }
          ]
        })
      });

      const data = await response.json();
      const latency = Date.now() - startTime;

      if (!response.ok) {
        return {
          success: false,
          error: data.error?.message || `HTTP ${response.status}: ${response.statusText}`,
          latency
        };
      }

      return {
        success: true,
        content: data.content[0]?.text || '',
        latency,
        tokens: {
          input: data.usage?.input_tokens || 0,
          output: data.usage?.output_tokens || 0,
          total: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error occurred',
        latency: Date.now() - startTime
      };
    }
  }

  async validateApiKeys(): Promise<boolean> {
    try {
      const testRequest: LLMRequest = {
        prompt: 'Test',
        model: {
          id: 'claude-3-haiku-20240307',
          name: 'Claude 3 Haiku',
          provider: 'anthropic',
          modelId: 'claude-3-haiku-20240307',
          supportedTasks: ['entity_extraction', 'relationship_extraction']
        },
        temperature: 0.1,
        maxTokens: 10
      };

      const result = await this.callModel(testRequest);
      return result.success;
    } catch {
      return false;
    }
  }
}

class ProxyOpenAIService implements ProxyLLMService {
  async callModel(request: LLMRequest): Promise<APIResponse> {
    const startTime = Date.now();
    
    try {
      const response = await fetch('/api/openai/v1/chat/completions', {
        method: 'POST',
        // Let the proxy handle all headers including Content-Type and authentication
        body: JSON.stringify({
          model: request.model.modelId,
          max_tokens: request.maxTokens ?? 1000,
          temperature: request.temperature ?? 0.0,
          messages: [
            {
              role: 'user',
              content: request.prompt
            }
          ]
        })
      });

      const data = await response.json();
      const latency = Date.now() - startTime;

      if (!response.ok) {
        return {
          success: false,
          error: data.error?.message || `HTTP ${response.status}: ${response.statusText}`,
          latency
        };
      }

      return {
        success: true,
        content: data.choices[0]?.message?.content || '',
        latency,
        tokens: {
          input: data.usage?.prompt_tokens || 0,
          output: data.usage?.completion_tokens || 0,
          total: data.usage?.total_tokens || 0
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error occurred',
        latency: Date.now() - startTime
      };
    }
  }

  async validateApiKeys(): Promise<boolean> {
    try {
      const testRequest: LLMRequest = {
        prompt: 'Test',
        model: {
          id: 'gpt-3.5-turbo',
          name: 'GPT-3.5 Turbo',
          provider: 'openai',
          modelId: 'gpt-3.5-turbo',
          supportedTasks: ['entity_extraction', 'relationship_extraction']
        },
        temperature: 0.1,
        maxTokens: 10
      };

      const result = await this.callModel(testRequest);
      return result.success;
    } catch {
      return false;
    }
  }
}

export class ProxyLLMServiceFactory {
  private static anthropicService = new ProxyAnthropicService();
  private static openaiService = new ProxyOpenAIService();

  static getService(model: ModelConfig): ProxyLLMService {
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