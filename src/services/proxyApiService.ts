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
          supportedTasks: ['entity_extraction', 'relation_classification', 'single_prompt_full_causal_extraction']
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

class ProxyGoogleService implements ProxyLLMService {
  async callModel(request: LLMRequest): Promise<APIResponse> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(`/api/google/v1beta/models/${request.model.modelId}:generateContent`, {
        method: 'POST',
        // Let the proxy handle all headers including Content-Type and authentication
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: request.prompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: request.temperature ?? 0.0,
            maxOutputTokens: request.maxTokens ?? 1000,
            topP: 1.0,
            topK: 32
          }
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
        content: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
        latency,
        tokens: {
          input: data.usageMetadata?.promptTokenCount || 0,
          output: data.usageMetadata?.candidatesTokenCount || 0,
          total: data.usageMetadata?.totalTokenCount || 0
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
          id: 'gemini-2.5-flash-lite',
          name: 'Gemini 2.5 Flash Lite',
          provider: 'google',
          modelId: 'gemini-2.5-flash-lite',
          supportedTasks: ['entity_extraction', 'relation_classification', 'single_prompt_full_causal_extraction']
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

class ProxyDeepSeekService implements ProxyLLMService {
  async callModel(request: LLMRequest): Promise<APIResponse> {
    const startTime = Date.now();
    
    try {
      const response = await fetch('/api/deepseek/v1/chat/completions', {
        method: 'POST',
        // Let the proxy handle all headers including Content-Type and authentication
        body: JSON.stringify({
          model: request.model.modelId,
          max_tokens: request.maxTokens ?? 4000,
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
          id: 'deepseek-v3-1-chat',
          name: 'DeepSeek-V3.1 Chat',
          provider: 'deepseek',
          modelId: 'deepseek-chat',
          supportedTasks: ['entity_extraction', 'relation_classification', 'single_prompt_full_causal_extraction']
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
    // GPT-5 models use the Responses API for advanced reasoning features
    // Pattern-based detection is more maintainable than hardcoded arrays
    const usesResponsesAPI = request.model.modelId.startsWith('gpt-5');
    
    if (usesResponsesAPI) {
      return this.callModelWithResponses(request);
    }
    
    return this.callModelWithChatCompletions(request);
  }

  private validateGPT5Parameters(model: any): { reasoningEffort: string; verbosity: string } {
    // Validate reasoningEffort with safe default
    const validReasoningEfforts = ['low', 'medium', 'high'];
    const reasoningEffort = validReasoningEfforts.includes(model.reasoningEffort) 
      ? model.reasoningEffort 
      : 'medium'; // Safe default

    // Validate verbosity with safe default
    const validVerbosity = ['low', 'medium', 'high'];
    const verbosity = validVerbosity.includes(model.verbosity) 
      ? model.verbosity 
      : 'medium'; // Safe default

    // Log warnings for invalid values in development
    if (process.env.NODE_ENV === 'development') {
      if (model.reasoningEffort && !validReasoningEfforts.includes(model.reasoningEffort)) {
        console.warn(`Invalid reasoningEffort "${model.reasoningEffort}" for model ${model.modelId}, using default: ${reasoningEffort}`);
      }
      if (model.verbosity && !validVerbosity.includes(model.verbosity)) {
        console.warn(`Invalid verbosity "${model.verbosity}" for model ${model.modelId}, using default: ${verbosity}`);
      }
    }

    return { reasoningEffort, verbosity };
  }

  private async callModelWithResponses(request: LLMRequest): Promise<APIResponse> {
    const startTime = Date.now();
    
    // Validate parameters with safe defaults
    const { reasoningEffort, verbosity } = this.validateGPT5Parameters(request.model);
    
    // GPT-5 Responses API request structure - corrected based on OpenAI docs
    const requestBody: any = {
      model: request.model.modelId,
      input: request.prompt
    };

    // Add text formatting configuration (this controls the output format)
    requestBody.text = {
      format: { type: "text" },
      verbosity: verbosity
    };

    // Add reasoning configuration (this controls reasoning depth)
    requestBody.reasoning = {
      effort: reasoningEffort === 'low' ? 'minimal' : reasoningEffort
    };

    // Debug logging for API requests (development only)
    if (process.env.NODE_ENV === 'development') {
      console.log('OpenAI Responses API Request (Fixed):', {
        url: '/api/openai/v1/responses',
        model: request.model.modelId,
        requestStructure: {
          hasInput: !!requestBody.input,
          hasText: !!requestBody.text,
          hasReasoning: !!requestBody.reasoning,
          textConfig: requestBody.text,
          reasoningConfig: requestBody.reasoning
        },
        reasoning: reasoningEffort,
        verbosity: verbosity
      });
    }
    
    try {
      const response = await fetch('/api/openai/v1/responses', {
        method: 'POST',
        // Let the proxy handle all headers including Content-Type and authentication
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      const latency = Date.now() - startTime;

      if (!response.ok) {
        console.error('OpenAI Responses API Error:', data);
        return {
          success: false,
          error: data.error?.message || `HTTP ${response.status}: ${response.statusText}`,
          latency
        };
      }

      // Extract content from GPT-5 Responses API structure
      let content = '';
      
      // According to OpenAI docs, GPT-5 response structure should have output_text field
      if (data.output_text && typeof data.output_text === 'string') {
        content = data.output_text;
      } else if (data.output && Array.isArray(data.output)) {
        // Look for content in the output array - prioritize message type items
        for (const outputItem of data.output) {
          if (outputItem.type === 'message' && outputItem.content) {
            // GPT-5 message content is an array with output_text objects
            if (Array.isArray(outputItem.content)) {
              for (const contentItem of outputItem.content) {
                if (contentItem.type === 'output_text' && contentItem.text) {
                  content = contentItem.text;
                  break;
                }
              }
              if (content) break;
            } else if (typeof outputItem.content === 'string') {
              content = outputItem.content;
              break;
            } else if (outputItem.content.text) {
              content = outputItem.content.text;
              break;
            }
          } else if (outputItem.type === 'text' && outputItem.text) {
            content = outputItem.text;
            break;
          } else if (outputItem.type === 'text' && outputItem.content) {
            content = outputItem.content;
            break;
          }
        }
      }
      
      // Fallback to checking other possible response fields
      if (!content) {
        content = data.content || data.response || data.text || '';
        if (typeof content !== 'string') {
          content = typeof content === 'object' && content !== null ? JSON.stringify(content) : String(content || '');
        }
      }
      
      // If still no content, log detailed error info
      if (!content && data.output && Array.isArray(data.output) && data.output.length > 0) {
        console.warn('⚠️ GPT-5 response contains no extractable text content');
        // Don't return placeholder text - this will help identify the issue
        content = '';
      }

      // Debug logging for API responses (development only)
      if (process.env.NODE_ENV === 'development') {
        console.log('=== GPT-5 RESPONSE ANALYSIS (FIXED REQUEST) ===');
        console.log('Response Status:', response.status, response.statusText);
        console.log('Model:', request.model.modelId);
        
        console.log('Expected Fields Analysis:', {
          hasOutputText: !!data.output_text,
          outputTextType: typeof data.output_text,
          hasOutput: !!data.output,
          outputType: typeof data.output,
          outputLength: Array.isArray(data.output) ? data.output.length : 'not array'
        });
        
        if (data.output && Array.isArray(data.output)) {
          console.log('Output Array Items:');
          data.output.forEach((item: any, index: number) => {
            console.log(`  [${index}]:`, {
              type: item.type,
              hasText: !!item.text,
              hasContent: !!item.content,
              keys: Object.keys(item)
            });
            
            // Show content details for message items
            if (item.type === 'message' && item.content) {
              console.log(`    Message content type: ${typeof item.content}`);
              if (typeof item.content === 'object') {
                console.log(`    Message content keys: ${Object.keys(item.content)}`);
                console.log(`    Message content preview:`, item.content);
              } else {
                console.log(`    Message content (first 200 chars): ${String(item.content).substring(0, 200)}`);
              }
            }
          });
        }
        
        console.log('All Response Keys:', Object.keys(data));
        
        // Log extracted content result
        if (content) {
          console.log('✅ Successfully extracted content (first 300 chars):', content.substring(0, 300) + (content.length > 300 ? '...' : ''));
        } else {
          console.log('❌ WARNING: No content extracted!');
          console.log('Full Response for debugging:', JSON.stringify(data, null, 2));
        }
        console.log('=== END GPT-5 ANALYSIS ===');
      }

      return {
        success: true,
        content: content,
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

  private async callModelWithChatCompletions(request: LLMRequest): Promise<APIResponse> {
    const startTime = Date.now();
    
    // Some newer models use max_completion_tokens instead of max_tokens
    const usesNewTokenParam = ['o1-pro', 'o3-pro', 'o3', 'o4-mini', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano'].includes(request.model.modelId);
    
    // Some newer models only support temperature: 1 (default)
    const requiresDefaultTemp = ['o1-pro', 'o3-pro', 'o3', 'o4-mini'].includes(request.model.modelId);
    
    const requestBody: any = {
      model: request.model.modelId,
      messages: [
        {
          role: 'user',
          content: request.prompt
        }
      ]
    };

    // Use correct token parameter based on model
    if (usesNewTokenParam) {
      requestBody.max_completion_tokens = request.maxTokens ?? 1000;
    } else {
      requestBody.max_tokens = request.maxTokens ?? 1000;
    }

    // Only set temperature for models that support it
    if (!requiresDefaultTemp) {
      requestBody.temperature = request.temperature ?? 0.0;
    }
    // For models that require default temp, we omit the parameter entirely

    // Debug logging for API requests (development only)
    if (process.env.NODE_ENV === 'development') {
      console.log('OpenAI API Request:', {
        url: '/api/openai/v1/chat/completions',
        model: request.model.modelId,
        tokenParam: usesNewTokenParam ? 'max_completion_tokens' : 'max_tokens',
        maxTokens: requestBody.max_tokens || requestBody.max_completion_tokens,
        temperature: requestBody.temperature !== undefined ? requestBody.temperature : 'omitted'
      });
    }
    
    try {
      const response = await fetch('/api/openai/v1/chat/completions', {
        method: 'POST',
        // Let the proxy handle all headers including Content-Type and authentication
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      const latency = Date.now() - startTime;

      // Debug logging for API responses (development only)
      if (process.env.NODE_ENV === 'development') {
        console.log('OpenAI Chat Completions Response:', {
          status: response.status,
          statusText: response.statusText,
          model: request.model.modelId,
          hasContent: !!data.choices?.[0]?.message?.content
        });
      }

      if (!response.ok) {
        console.error('OpenAI API Error:', data);
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
          supportedTasks: ['entity_extraction', 'relation_classification', 'single_prompt_full_causal_extraction']
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
  private static googleService = new ProxyGoogleService();
  private static deepseekService = new ProxyDeepSeekService();

  static getService(model: ModelConfig): ProxyLLMService {
    switch (model.provider) {
      case 'anthropic':
        return this.anthropicService;
      case 'openai':
        return this.openaiService;
      case 'google':
        return this.googleService;
      case 'deepseek':
        return this.deepseekService;
      default:
        throw new Error(`Unsupported model provider: ${model.provider}`);
    }
  }

  static async validateAllApiKeys(): Promise<{ anthropic: boolean; openai: boolean; google: boolean; deepseek: boolean }> {
    try {
      const [anthropicValid, openaiValid, googleValid, deepseekValid] = await Promise.all([
        this.anthropicService.validateApiKeys(),
        this.openaiService.validateApiKeys(),
        this.googleService.validateApiKeys(),
        this.deepseekService.validateApiKeys()
      ]);

      return {
        anthropic: anthropicValid,
        openai: openaiValid,
        google: googleValid,
        deepseek: deepseekValid
      };
    } catch {
      return {
        anthropic: false,
        openai: false,
        google: false,
        deepseek: false
      };
    }
  }
}