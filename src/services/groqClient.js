// Layer 3: GROQ Client
// File: src/services/groqClient.js

/**
 * GROQ API Client
 * Handles all GROQ API interactions with streaming support and rate limiting
 */

class GroqClient {
  constructor(config) {
    // config: { apiKey, model }
    this.apiKey = config.apiKey || process.env.REACT_APP_GROQ_API_KEY;
    this.model = config.model || 'openai/gpt-oss-120b';
    this.baseUrl = 'https://api.groq.com/openai/v1';
    this.timeout = 60000; // 60 seconds for LLM response
    this.rateLimitDelay = 1000; // 1 second between calls (free tier safety)
    this.lastCallTime = 0;
  }

  /**
   * Get authorization header
   */
  getAuthHeader() {
    return `Bearer ${this.apiKey}`;
  }

  /**
   * Implement rate limiting for free tier
   */
  async applyRateLimit() {
    const now = Date.now();
    const elapsed = now - this.lastCallTime;
    
    if (elapsed < this.rateLimitDelay) {
      const delay = this.rateLimitDelay - elapsed;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastCallTime = Date.now();
  }

  /**
   * Validate GROQ connection and API key
   */
  async validateConnection() {
    try {
      // Simple test call to verify API key
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'user', content: 'Respond with: "API test passed"' }
          ],
          max_tokens: 20,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new GroqError(
          'GROQ API validation failed',
          response.status,
          error
        );
      }

      return {
        success: true,
        message: 'GROQ API connection verified',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: error.code,
      };
    }
  }

  /**
   * Generate test plan with streaming support
   * @param {string} systemPrompt - System prompt with behavioral rules
   * @param {string} userPrompt - User prompt with issue data
   * @param {Function} onChunk - Callback for each streamed chunk
   */
  async generateTestPlan(systemPrompt, userPrompt, onChunk) {
    await this.applyRateLimit();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 2000,
          stream: true,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new GroqError(
          `GROQ API Error: ${response.status}`,
          response.status,
          error
        );
      }

      // Process streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              break;
            }

            try {
              const json = JSON.parse(data);
              const deltaContent = json.choices?.[0]?.delta?.content || '';
              
              if (deltaContent) {
                accumulatedText += deltaContent;
                onChunk(deltaContent, accumulatedText);
              }
            } catch (e) {
              // Skip parse errors in stream
            }
          }
        }
      }

      return accumulatedText;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('GROQ request timed out (>60s). Please try again.');
      }
      throw error;
    }
  }

  /**
   * Non-streaming request (for simpler use cases)
   */
  async generateTestPlanDirect(systemPrompt, userPrompt) {
    await this.applyRateLimit();

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new GroqError(
          `GROQ API Error: ${response.status}`,
          response.status,
          error
        );
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';

      return {
        content,
        usage: data.usage,
        model: data.model,
      };
    } catch (error) {
      throw error;
    }
  }
}

/**
 * Custom GROQ Error class
 */
class GroqError extends Error {
  constructor(message, code, details) {
    super(message);
    this.name = 'GroqError';
    this.code = code;
    this.details = details;
  }
}

export { GroqClient, GroqError };
