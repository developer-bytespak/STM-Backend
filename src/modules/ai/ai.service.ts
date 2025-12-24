import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  /**
   * Send a user message to the configured LLM provider and return text response
   * Prefers Google (GOOGLE_API_KEY) if present, otherwise falls back to OpenAI
   */
  async askAgent(userMessage: string): Promise<string> {
    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API;

    const systemPrompt = `You are an assistant that ONLY answers questions about ServiceProStars (SPS) services, offerings and pricing. If a question is outside SPS scope, politely refuse and offer to connect to support.`;

    try {
      if (geminiKey) {
        this.logger.log('Using Gemini (Google Generative) API for AI response');
        const url = `https://generativelanguage.googleapis.com/v1beta2/models/text-bison-001:generate?key=${geminiKey}`;
        const res = await (globalThis as any).fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: `${systemPrompt}\nUser: ${userMessage}`,
            maxOutputTokens: 300,
          }),
        });

        const raw = await res.text();
        if (!raw) {
          this.logger.error('Empty response body from Gemini', `status=${res.status}`);
          return 'AI failed to respond. Please try again later.';
        }

        let body: any = null;
        try {
          body = JSON.parse(raw);
        } catch (parseErr) {
          this.logger.warn('Gemini response is not valid JSON, using raw text', (parseErr as Error).message);
        }

        const text = body?.candidates?.[0]?.output || body?.output?.[0]?.content?.[0]?.text || body?.text || raw;
        return (text || 'Sorry, I could not generate a response.').toString();
      }

      if (openaiKey) {
        this.logger.log('Using OpenAI API for AI response');
        const res = await (globalThis as any).fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userMessage },
            ],
            max_tokens: 500,
            temperature: 0.1,
          }),
        });

        const raw = await res.text();
        if (!raw) {
          this.logger.error('Empty response body from OpenAI', `status=${res.status}`);
          return 'AI failed to respond. Please try again later.';
        }

        let body: any = null;
        try {
          body = JSON.parse(raw);
        } catch (parseErr) {
          this.logger.warn('OpenAI response is not valid JSON, using raw text', (parseErr as Error).message);
        }

        const text = body?.choices?.[0]?.message?.content || body?.choices?.[0]?.text || raw;
        return (text || 'Sorry, I could not generate a response.').toString();
      }

      this.logger.warn('No LLM API key configured (OPENAI_API_KEY or GEMINI_API_KEY)');
      return 'AI is currently unavailable. Please contact support or try again later.';
    } catch (err) {
      this.logger.error('LLM request failed', (err as Error).message);
      return 'AI failed to respond. Please try again later.';
    }
  }
}
