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
   - REMEMBER the service they selected throughout the entire conversation

2. **ASK FOR ZIPCODE/LOCATION**
   - Ask: "To find providers near you, could you please share your zipcode or location?"
   - This helps match them with local providers

3. **ASK FOR BUDGET**
   - Once you have the zipcode, ask about budget using THE SPECIFIC SERVICE NAME
   - Example: "What's your budget for house cleaning?" or "What's your budget for plumbing services?"
   - DO NOT use generic "this service" - always mention the actual service name

4. **ASK FOR REQUIREMENTS/SPECIAL REQUESTS**
   - After budget, ask about requirements using THE SPECIFIC SERVICE NAME
   - Example: "Do you have any special requirements or preferences for house cleaning? (e.g., eco-friendly products, pet-friendly, same-day service, etc.)"
   - Example: "Do you have any special requirements for plumbing? (e.g., emergency service, licensed plumber, warranty needed, etc.)"
   - Tailor the examples to be relevant to the SPECIFIC SERVICE they selected
   - Accept responses like "No special requirements" or let them list their preferences

5. **ANSWER PLATFORM-SPECIFIC QUESTIONS**
   - If users ask about services offered on SPS platform (e.g., "What's included in house cleaning?", "Do you offer plumbing?")
   - Answer these questions directly using information from PLATFORM DATA
   - Keep answers brief and then guide them back to finding a provider
   - Example: "Yes, we offer plumbing services with experienced providers. Would you like me to help you find one?"

6. **RECOMMEND PROVIDERS**
   - When recommending, ALWAYS mention the SPECIFIC SERVICE NAME in your response
   - Example: "Based on your location and budget, here are the top providers for house cleaning in your area:" (not "for this service")
   - Use the TOP 3 PROVIDERS BY SERVICE section from PLATFORM DATA below
   - Filter/recommend based on:
     a) Matching service (primary)
     b) Matching zipcode/area if provided (secondary)
     c) Budget compatibility if mentioned (tertiary)
     d) Requirements match if provided (quaternary)
   - If no exact location match, say: "I found excellent [SERVICE NAME] providers near your area" instead of generic phrases
   - Always show provider ratings to help customers decide
   - Present recommendations clearly with names, ratings, and areas served

7. **FORMAT YOUR RESPONSE**
   - Be conversational but focused
   - ALWAYS use the SPECIFIC SERVICE NAME instead of "this service", "the service", etc.
   - Ask ONE question at a time to guide the user
   - When recommending, show top providers with their ratings and service areas
   - When answering service questions, be informative but concise

IMPORTANT RULES:
- CRITICAL: Always refer to the service by its SPECIFIC NAME (e.g., "house cleaning", "plumbing", "roof cleaning") NOT by generic terms like "this service" or "the service"
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

  /**
   * Extract structured data from conversation using OpenAI
   * Returns: { service, zipcode, budget, requirements }
   */
  async extractConversationData(
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
    availableServices: Array<{ id: number; name: string; description: string; category: string }>,
  ): Promise<{
    service: string | null;
    zipcode: string | null;
    budget: string | null;
    requirements: string | null;
  }> {
    const openaiKey = this.getOpenAiKey();
    const model = this.getOpenAiModel();

    if (!openaiKey) {
      this.logger.warn('No OpenAI API key configured');
      return { service: null, zipcode: null, budget: null, requirements: null };
    }

    // Build service list for AI
    const serviceList = availableServices.map(s => `- ${s.name} (${s.category})`).join('\n');

    this.logger.log(`\n${'='.repeat(80)}`);
    this.logger.log(`🔍 [DATA EXTRACTION] Starting extraction process`);
    this.logger.log(`📊 Available Services: ${availableServices.length} services`);
    this.logger.log(`💬 Conversation Messages: ${conversationHistory.length} messages`);
    this.logger.log(`${'='.repeat(80)}\n`);

    const systemPrompt = `You are a data extraction assistant. Your task is to extract structured information from a customer service conversation.

AVAILABLE SERVICES:
${serviceList}

Extract the following information from the conversation:
1. **service**: The service name the customer wants (match from the AVAILABLE SERVICES list above). Use fuzzy matching (e.g., "house cleaning" matches "House Cleaning", "plumber" matches "Plumbing"). Return null if no service is mentioned.

2. **zipcode**: The customer's zipcode or postal code (5-digit US zipcode). Return null if not mentioned.

3. **budget**: The customer's budget as a dollar amount (e.g., "$100", "$1,500"). Extract from phrases like "my budget is 300", "I can spend $500", "around 200 dollars". Return null if not mentioned.

4. **requirements**: The customer's specific requirements or preferences. Extract ONLY the actual requirement details, not the entire message. For example:
   - From "I need house cleaning services my area is 75003 and my budget is 300$ all I want is to clean the kitchen and the bathroom"
   - Extract: "clean the kitchen and the bathroom" (NOT the full message)
   - Look for phrases like "I want", "I need", "requirement is", "all I want is", "looking for"
   - Return null if no specific requirements mentioned.

Return ONLY a valid JSON object with these exact keys:
{
  "service": "Service Name" or null,
  "zipcode": "12345" or null,
  "budget": "$100" or null,
  "requirements": "specific requirement text" or null
}

IMPORTANT:
- Match service names from the AVAILABLE SERVICES list (use fuzzy matching)
- If customer says "clean" or "cleaning", try to match "House Cleaning", "Office Cleaning", etc.
- For requirements, extract ONLY the specific needs, not metadata like zipcode/budget
- Return null for any field not found in the conversation
- DO NOT include markdown formatting, code blocks, or explanations - ONLY the JSON object`;

    try {
      const messages: Array<{ role: string; content: string }> = [
        { role: 'system', content: systemPrompt }
      ];

      // Add all conversation history
      conversationHistory.forEach(msg => {
        messages.push({ role: msg.role, content: msg.content });
      });

      // Add extraction request
      messages.push({
        role: 'user',
        content: 'Extract the service, zipcode, budget, and requirements from the above conversation. Return ONLY the JSON object.'
      });

      this.logger.log(`📤 [REQUEST TO OPENAI]`);
      this.logger.log(`   Model: ${model}`);
      this.logger.log(`   Messages: ${messages.length} total`);
      this.logger.log(`   System Prompt Length: ${systemPrompt.length} chars`);
      this.logger.log(`   Conversation History:`);
      conversationHistory.forEach((msg, i) => {
        const preview = msg.content.substring(0, 80).replace(/\n/g, ' ');
        this.logger.log(`     ${i + 1}. [${msg.role}]: ${preview}${msg.content.length > 80 ? '...' : ''}`);
      });

      const requestStartTime = Date.now();

      const res = await (globalThis as any).fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          max_tokens: 500,
          temperature: 0.1, // Low temperature for consistent extraction
          response_format: { type: 'json_object' }, // Force JSON response
        }),
      });

      const requestDuration = Date.now() - requestStartTime;

      if (!res.ok) {
        const errorText = await res.text();
        this.logger.error(`❌ [EXTRACTION ERROR] Status: ${res.status}, Duration: ${requestDuration}ms`);
        this.logger.error(`   Error Response: ${errorText}`);
        return { service: null, zipcode: null, budget: null, requirements: null };
      }

      const body = await res.json();
      const extractedText = body?.choices?.[0]?.message?.content;
      const usage = body?.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

      this.logger.log(`\n📥 [RESPONSE FROM OPENAI]`);
      this.logger.log(`   ⏱️  Duration: ${requestDuration}ms`);
      this.logger.log(`   🎫 Tokens Used:`);
      this.logger.log(`      - Prompt: ${usage.prompt_tokens} tokens`);
      this.logger.log(`      - Completion: ${usage.completion_tokens} tokens`);
      this.logger.log(`      - Total: ${usage.total_tokens} tokens`);
      this.logger.log(`   💰 Estimated Cost: $${((usage.total_tokens / 1000) * 0.0015).toFixed(6)} (assuming gpt-4o-mini)`);

      if (!extractedText) {
        this.logger.error('❌ [EXTRACTION] No content in response');
        return { service: null, zipcode: null, budget: null, requirements: null };
      }

      this.logger.log(`   📄 Raw Response:`);
      this.logger.log(`${extractedText}`);

      // Parse the JSON response
      const extracted = JSON.parse(extractedText);

      this.logger.log(`\n✅ [EXTRACTION SUCCESS]`);
      this.logger.log(`   🎯 Extracted Data:`);
      this.logger.log(`      - Service: ${extracted.service || 'null'}`);
      this.logger.log(`      - Zipcode: ${extracted.zipcode || 'null'}`);
      this.logger.log(`      - Budget: ${extracted.budget || 'null'}`);
      this.logger.log(`      - Requirements: ${extracted.requirements || 'null'}`);

      // Validate extracted data
      let validatedZipcode = extracted.zipcode;
      let validatedBudget = extracted.budget;

      // Validate zipcode (must be 5 digits, between 00501 and 99950)
      if (extracted.zipcode) {
        const zipcodeClean = extracted.zipcode.replace(/[^0-9]/g, '');
        const zipcodeNum = parseInt(zipcodeClean, 10);
        
        if (zipcodeClean.length !== 5 || zipcodeNum < 501 || zipcodeNum > 99950) {
          this.logger.warn(`   ⚠️  Invalid zipcode "${extracted.zipcode}" - must be 5 digits (00501-99950)`);
          validatedZipcode = null;
        } else {
          validatedZipcode = zipcodeClean;
        }
      }

      // Validate budget (must be between $10 and $100,000)
      if (extracted.budget) {
        const budgetClean = extracted.budget.replace(/[$,]/g, '');
        const budgetNum = parseFloat(budgetClean);
        
        if (isNaN(budgetNum) || budgetNum < 10 || budgetNum > 100000) {
          this.logger.warn(`   ⚠️  Invalid budget "${extracted.budget}" - must be $10-$100,000`);
          validatedBudget = null;
        }
      }

      if (validatedZipcode !== extracted.zipcode || validatedBudget !== extracted.budget) {
        this.logger.log(`   🔍 After Validation:`);
        this.logger.log(`      - Zipcode: ${validatedZipcode || 'null'} ${validatedZipcode !== extracted.zipcode ? '(corrected)' : ''}`);
        this.logger.log(`      - Budget: ${validatedBudget || 'null'} ${validatedBudget !== extracted.budget ? '(corrected)' : ''}`);
      }

      this.logger.log(`${'='.repeat(80)}\n`);

      return {
        service: extracted.service || null,
        zipcode: validatedZipcode,
        budget: validatedBudget,
        requirements: extracted.requirements || null,
      };
    } catch (error) {
      this.logger.error(`❌ [EXTRACTION FAILED] ${(error as Error).message}`);
      this.logger.error(`   Stack: ${(error as Error).stack}`);
      return { service: null, zipcode: null, budget: null, requirements: null };
    }
  }
}
