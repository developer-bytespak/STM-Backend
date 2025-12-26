import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  private getOpenAiKey(): string | undefined {
    return process.env.OPENAI_API_KEY || process.env.OPENAI_API;
  }

  private getOpenAiModel(): string {
    return process.env.OPENAI_MODEL || 'gpt-4o-mini';
  }

  /**
   * Send a user message to the configured LLM provider and return text response
   * Prefers Google (GOOGLE_API_KEY) if present, otherwise falls back to OpenAI
   */
  async askAgent(userMessage: string): Promise<string> {
    const openaiKey = this.getOpenAiKey();
    const model = this.getOpenAiModel();

    const systemPrompt = `You are an assistant that ONLY answers questions about ServiceProStars (SPS) services, offerings and pricing. If a question is outside SPS scope, politely refuse and offer to connect to support.`;

    if (!openaiKey) {
      this.logger.warn('No OpenAI API key configured (OPENAI_API_KEY)');
      return 'AI is currently unavailable. Please contact support or try again later.'
    }

    this.logger.log(`🤖 [OpenAI Call] Model: ${model}, Message: "${userMessage.substring(0, 50)}..."`);

    try {
      const requestStartTime = Date.now();
      
      const res = await (globalThis as any).fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          max_tokens: 500,
          temperature: 0.1,
        }),
      });

      const requestDuration = Date.now() - requestStartTime;

      if (!res.ok) {
        const raw = await res.text();
        let errorBody: any = null;
        try { errorBody = JSON.parse(raw); } catch {}
        this.logger.error(`❌ [OpenAI Error] Status: ${res.status}, Duration: ${requestDuration}ms`, errorBody?.error?.message || raw);
        return 'I apologize, but I\'m having trouble connecting right now. Please try again in a moment.';
      }

      const raw = await res.text();
      if (!raw) {
        this.logger.error(`❌ [OpenAI Error] Empty response body, Status: ${res.status}`);
        return 'AI failed to respond. Please try again later.';
      }

      let body: any = null;
      try { body = JSON.parse(raw); } catch (parseErr) {
        this.logger.warn('⚠️ [OpenAI Parse Error] Response is not valid JSON', (parseErr as Error).message);
        return 'Sorry, I could not generate a response. Please try again.';
      }

      if (body?.error) {
        this.logger.error('❌ [OpenAI API Error]', body.error);
        return 'I apologize, but I\'m having trouble connecting right now. Please try again in a moment.';
      }

      const tokens = body?.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
      this.logger.log(`✅ [OpenAI Success] Duration: ${requestDuration}ms, Tokens: ${tokens.total_tokens} (prompt: ${tokens.prompt_tokens}, completion: ${tokens.completion_tokens})`);

      const text = body?.choices?.[0]?.message?.content || body?.choices?.[0]?.text;
      return (text || 'Sorry, I could not generate a response.').toString();
    } catch (fetchErr) {
      this.logger.error('❌ [OpenAI Request Failed]', (fetchErr as Error).message);
      return 'I apologize, but I\'m having trouble connecting right now. Please try again in a moment.';
    }
  }

  /**
   * Sales assistant method with conversation context support
   * Uses sales-focused system prompt and supports message history
   * @param userMessage - Current user message
   * @param conversationHistory - Previous conversation messages
   * @param databaseContext - Real-time context from database (services, providers, locations)
   */
  async askSalesAssistant(
    userMessage: string,
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>,
    databaseContext?: string,
  ): Promise<string> {
    const openaiKey = this.getOpenAiKey();
    const model = this.getOpenAiModel();

    const systemPrompt = `You are a sales assistant for ServiceProStars (SPS) platform. Your role is to guide customers to find the best service provider for their needs.

CONVERSATION FLOW - Always follow these steps in order:

1. **IDENTIFY THE SERVICE**
   - When a customer mentions a service need (e.g., "I need house cleaning"), confirm it's available
   - Say: "Great! We offer [SERVICE]. Let me help you find the perfect provider for you."
   - If they ask about a service (e.g., "Can you elaborate on cleaning?"), provide helpful information about that service

2. **ASK FOR ZIPCODE/LOCATION**
   - Ask: "To find providers near you, could you please share your zipcode or location?"
   - This helps match them with local providers

3. **ASK FOR BUDGET**
   - Once you have the zipcode, ask: "What's your budget for this service?"
   - This helps narrow down providers

4. **ASK FOR REQUIREMENTS/SPECIAL REQUESTS**
   - After budget, always ask: "Do you have any special requirements or preferences for this service? (e.g., eco-friendly, same-day service, insurance covered, etc.)"
   - This helps customize recommendations
   - Accept responses like "No special requirements" or let them list their preferences

5. **ANSWER PLATFORM-SPECIFIC QUESTIONS**
   - If users ask about services offered on SPS platform (e.g., "What's included in house cleaning?", "Do you offer plumbing?")
   - Answer these questions directly using information from PLATFORM DATA
   - Keep answers brief and then guide them back to finding a provider
   - Example: "Yes, we offer plumbing services with experienced providers. Would you like me to help you find one?"

6. **RECOMMEND PROVIDERS**
   - Use the TOP 3 PROVIDERS BY SERVICE section from PLATFORM DATA below
   - Filter/recommend based on:
     a) Matching service (primary)
     b) Matching zipcode/area if provided (secondary)
     c) Budget compatibility if mentioned (tertiary)
     d) Requirements match if provided (quaternary)
   - If no exact location match, recommend the closest/top-rated ones
   - Always show provider ratings to help customers decide
   - Present recommendations clearly with names, ratings, and areas served

7. **FORMAT YOUR RESPONSE**
   - Be conversational but focused
   - Ask ONE question at a time to guide the user
   - When recommending, show top providers with their ratings and service areas
   - When answering service questions, be informative but concise

IMPORTANT RULES:
- DO answer platform-specific questions about services
- DO NOT finalize deals, accept payments, or process orders
- DO NOT discuss company FAQs unrelated to finding providers
- DO redirect non-platform questions: "I'm here to help you find the right service provider. For other questions, please contact our support team."
- Always use real data from PLATFORM DATA section
- If a service isn't available, be honest and offer similar alternatives
- NEVER use markdown formatting (**text** or __text__) - write plain text only
- Keep responses concise and focused${databaseContext || ''}`;

    try {
      if (!openaiKey) {
        this.logger.warn('No OpenAI API key configured (OPENAI_API_KEY)');
        return 'AI is currently unavailable. Please contact support or try again later.';
      }

      this.logger.log(`Using OpenAI model ${model} for sales assistant`);

      // Build messages array for OpenAI
      const messages: Array<{ role: string; content: string }> = [
        { role: 'system', content: systemPrompt }
      ];

      // Add conversation history if provided
      if (conversationHistory && conversationHistory.length > 0) {
        conversationHistory.forEach(msg => {
          messages.push({ role: msg.role === 'user' ? 'user' : 'assistant', content: msg.content });
        });
      }

      // Add current user message
      messages.push({ role: 'user', content: userMessage });

      this.logger.log(`🤖 [Sales Assistant] Model: ${model}, Messages: ${messages.length}, User: "${userMessage.substring(0, 50)}..."`);

      const requestStartTime = Date.now();

      try {
        const res = await (globalThis as any).fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: model,
            messages: messages,
            max_tokens: 1000,
            temperature: 0.7,
          }),
        });

        const requestDuration = Date.now() - requestStartTime;

        if (!res.ok) {
          const raw = await res.text();
          let errorBody: any = null;
          try { errorBody = JSON.parse(raw); } catch {}
          this.logger.error(`❌ [Sales Assistant Error] Status: ${res.status}, Duration: ${requestDuration}ms`, errorBody?.error?.message || raw);
          return 'I apologize, but I\'m having trouble connecting right now. Please try again in a moment.';
        }

        const raw = await res.text();
        if (!raw) {
          this.logger.error(`❌ [Sales Assistant Error] Empty response, Status: ${res.status}`);
          return 'AI failed to respond. Please try again later.';
        }

        let body: any = null;
        try { body = JSON.parse(raw); } catch (parseErr) {
          this.logger.warn('⚠️ [Sales Assistant Parse Error] Response not JSON', (parseErr as Error).message);
          return 'Sorry, I could not generate a response. Please try again.';
        }

        if (body?.error) {
          this.logger.error('❌ [Sales Assistant API Error]', body.error);
          return 'I apologize, but I\'m having trouble connecting right now. Please try again in a moment.';
        }

        const tokens = body?.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
        this.logger.log(`✅ [Sales Assistant Success] Duration: ${requestDuration}ms, Tokens: ${tokens.total_tokens} (prompt: ${tokens.prompt_tokens}, completion: ${tokens.completion_tokens})`);

        const text = body?.choices?.[0]?.message?.content || body?.choices?.[0]?.text;
        return (text || 'Sorry, I could not generate a response.').toString();
      } catch (fetchErr) {
        this.logger.error('❌ [Sales Assistant Request Failed]', (fetchErr as Error).message);
        return 'I apologize, but I\'m having trouble connecting right now. Please try again in a moment.';
      }
    } catch (err) {
      this.logger.error('Sales assistant LLM request failed', (err as Error).message);
      return 'AI failed to respond. Please try again later.';
    }
  }
}
