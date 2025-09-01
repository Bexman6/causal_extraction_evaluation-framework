import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  // Clean and validate API keys
  const anthropicApiKey = env.ANTHROPIC_API_KEY?.trim()
  const openaiApiKey = env.OPENAI_API_KEY?.trim()
  const googleApiKey = env.GOOGLE_API_KEY?.trim()
  const deepseekApiKey = env.DEEPSEEK_API_KEY?.trim()
  
  // Debug logging
  console.log('🔧 Vite Config - Mode:', mode)
  console.log('🔑 Anthropic API Key loaded:', anthropicApiKey ? 'YES' : 'NO')
  console.log('🔑 Anthropic API Key length:', anthropicApiKey?.length || 0)
  console.log('🔑 OpenAI API Key loaded:', openaiApiKey ? 'YES' : 'NO')
  console.log('🔑 OpenAI API Key length:', openaiApiKey?.length || 0)
  console.log('🔑 Google API Key loaded:', googleApiKey ? 'YES' : 'NO')
  console.log('🔑 Google API Key length:', googleApiKey?.length || 0)
  console.log('🔑 Deepseek API Key loaded:', deepseekApiKey ? 'YES' : 'NO')
  console.log('🔑 Deepseek API Key length:', deepseekApiKey?.length || 0)

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/anthropic': {
          target: 'https://api.anthropic.com',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api\/anthropic/, ''),
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('🚨 Anthropic proxy error:', err)
            })
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log('📤 Anthropic proxy request:', req.method, req.url)
              console.log('📤 Headers being sent:', proxyReq.getHeaders())
            })
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              console.log('📥 Anthropic proxy response:', proxyRes.statusCode, req.url)
              
              // Log error response bodies for debugging
              if (proxyRes.statusCode && proxyRes.statusCode >= 400) {
                let body = ''
                proxyRes.on('data', (chunk) => {
                  body += chunk
                })
                proxyRes.on('end', () => {
                  console.log(`🚨 Anthropic ${proxyRes.statusCode} Error Body:`, body)
                })
              }
            })
          },
          headers: {
            'x-api-key': `${anthropicApiKey}`, 
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
          }
        },
        '/api/openai': {
          target: 'https://api.openai.com',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api\/openai/, ''),
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('🚨 OpenAI proxy error:', err)
            })
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log('📤 OpenAI proxy request:', req.method, req.url)
              console.log('📤 Headers being sent:', proxyReq.getHeaders())
            })
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              console.log('📥 OpenAI proxy response:', proxyRes.statusCode, req.url)
            })
          },
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json'
          }
        },
        '/api/google': {
          target: 'https://generativelanguage.googleapis.com',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api\/google/, ''),
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('🚨 Google proxy error:', err)
            })
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log('📤 Google proxy request:', req.method, req.url)
              console.log('📤 Headers being sent:', proxyReq.getHeaders())
            })
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              console.log('📥 Google proxy response:', proxyRes.statusCode, req.url)
              
              // Log error response bodies for debugging
              if (proxyRes.statusCode && proxyRes.statusCode >= 400) {
                let body = ''
                proxyRes.on('data', (chunk) => {
                  body += chunk
                })
                proxyRes.on('end', () => {
                  console.log(`🚨 Google ${proxyRes.statusCode} Error Body:`, body)
                })
              }
            })
          },
          headers: {
            'x-goog-api-key': `${googleApiKey}`,
            'Content-Type': 'application/json'
          }
        },
        '/api/deepseek': {
          target: 'https://api.deepseek.com',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api\/deepseek/, ''),
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('🚨 DeepSeek proxy error:', err)
            })
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log('📤 DeepSeek proxy request:', req.method, req.url)
              console.log('📤 Headers being sent:', proxyReq.getHeaders())
            })
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              console.log('📥 DeepSeek proxy response:', proxyRes.statusCode, req.url)
              
              // Log error response bodies for debugging
              if (proxyRes.statusCode && proxyRes.statusCode >= 400) {
                let body = ''
                proxyRes.on('data', (chunk) => {
                  body += chunk
                })
                proxyRes.on('end', () => {
                  console.log(`🚨 DeepSeek ${proxyRes.statusCode} Error Body:`, body)
                })
              }
            })
          },
          headers: {
            'Authorization': `Bearer ${deepseekApiKey}`,
            'Content-Type': 'application/json'
          }
        },
        '/api/datasets': {
          // Local file system API - bypass proxy entirely
          bypass: (req, res) => {
            console.log('📁 Dataset API request:', req.method, req.url);
            
            let responseHandled = false;
            let requestTimeout: NodeJS.Timeout | null = null;
            
            // Response helper functions with state management
            const sendErrorResponse = (error: string, statusCode: number = 500, context: string = 'Unknown') => {
              if (responseHandled) {
                console.log('⚠️ Attempted duplicate error response:', context);
                return;
              }
              responseHandled = true;
              
              if (requestTimeout) {
                clearTimeout(requestTimeout);
                requestTimeout = null;
              }
              
              try {
                if (!res.headersSent) {
                  console.error(`🚨 Dataset API error [${context}]:`, error);
                  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ success: false, error, context }));
                } else {
                  console.error('⚠️ Headers already sent, cannot send error response:', error);
                }
              } catch (headerError) {
                console.error('❌ Failed to send error response:', headerError);
              }
            };
            
            const sendSuccessResponse = (data: string, statusCode: number = 200) => {
              if (responseHandled) {
                console.log('⚠️ Attempted duplicate success response');
                return;
              }
              responseHandled = true;
              
              if (requestTimeout) {
                clearTimeout(requestTimeout);
                requestTimeout = null;
              }
              
              try {
                if (!res.headersSent) {
                  res.writeHead(statusCode, {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                  });
                  res.end(data);
                  console.log('✅ Dataset API response sent successfully');
                } else {
                  console.error('⚠️ Headers already sent, cannot send success response');
                }
              } catch (headerError) {
                console.error('❌ Failed to send success response:', headerError);
              }
            };
            
            // Set request timeout (30 seconds)
            requestTimeout = setTimeout(() => {
              sendErrorResponse('Request timeout after 30 seconds', 408, 'Timeout');
            }, 30000);
            
            // Handle the request locally with unified error handling
            const handleRequest = async () => {
              try {
                const { handleDatasetAPI } = await import('./src/api/datasets.ts');
                
                // Collect request body for POST requests
                let body = '';
                
                if (req.method !== 'GET' && req.method !== 'DELETE') {
                  // Handle POST/PUT requests with body parsing
                  await new Promise<void>((resolve, reject) => {
                    const bodyTimeout = setTimeout(() => {
                      reject(new Error('Body parsing timeout'));
                    }, 10000); // 10 second timeout for body parsing
                    
                    req.on('data', (chunk) => {
                      body += chunk.toString();
                    });
                    
                    req.on('end', () => {
                      clearTimeout(bodyTimeout);
                      resolve();
                    });
                    
                    req.on('error', (error) => {
                      clearTimeout(bodyTimeout);
                      reject(error);
                    });
                  });
                }
                
                // Process the request
                const request = new Request(`http://localhost:5173${req.url}`, {
                  method: req.method || 'GET',
                  headers: req.headers as HeadersInit,
                  body: body || undefined
                });
                
                const response = await handleDatasetAPI(request);
                const responseData = await response.text();
                
                sendSuccessResponse(responseData, response.status);
                
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                sendErrorResponse(errorMessage, 500, 'RequestProcessing');
              }
            };
            
            // Execute request handling
            handleRequest().catch((error) => {
              const errorMessage = error instanceof Error ? error.message : String(error);
              sendErrorResponse(errorMessage, 500, 'HandlerExecution');
            });
            
            // Return bypass response to prevent default proxy behavior
            return false;
          }
        }
      }
    }
  }
})