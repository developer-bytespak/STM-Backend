# AI Summary Generation Logic

## Overview
The summary generation extracts key information from the AI sales assistant conversation and formats it for handoff to service providers.

## Process Flow

### 1. **Trigger**
- User clicks "Finish & Get Recommendations" button in the AI chat
- Frontend calls: `POST /customer/ai-chat/sessions/:sessionId/summary`

### 2. **Session Retrieval**
```typescript
// Gets the AI chat session with all messages
const session = await prisma.ai_chat_sessions.findFirst({
  where: { session_id, user_id },
  include: { messages: { orderBy: { created_at: 'asc' } } }
});
```

### 3. **Check for Existing Summary**
- If summary already exists → return it immediately (idempotent)
- Prevents regenerating if user clicks button multiple times

### 4. **Build Conversation History**
```typescript
// Converts database messages to AI conversation format
const conversationHistory = session.messages.map((msg) => ({
  role: msg.sender_type === 'user' ? 'user' : 'assistant',
  content: msg.message,
}));
```

### 5. **AI Prompt**
The system sends this prompt to the AI (Gemini 2.5 Flash or OpenAI):

```
"Based on our conversation, please generate a structured summary in this exact format: 
'Service: {service} | Location: {zipcode} | Budget: {budget} | Requirements: {details}'. 
Extract all relevant information from the conversation."
```

### 6. **AI Processing**
- AI analyzes the entire conversation history
- Extracts:
  - **Service type** (e.g., "Plumbing", "House Cleaning")
  - **Location/Zipcode** (e.g., "75001", "Dallas, TX")
  - **Budget range** (e.g., "$500-1000", "Under $500")
  - **Requirements/Details** (e.g., "Fix leaky faucet in kitchen, prefer eco-friendly materials")

### 7. **Summary Format**
The AI generates a structured string:
```
"Service: Plumbing | Location: 75001 | Budget: $500-1000 | Requirements: Fix leaky faucet in kitchen, eco-friendly materials preferred"
```

### 8. **Storage**
```typescript
// Saves summary to database
await prisma.ai_chat_sessions.update({
  where: { id: session.id },
  data: { summary }
});
```

### 9. **Usage Flow**
- Summary is stored in `ai_chat_sessions.summary`
- **Step 1**: Customer clicks a recommended provider in AI chat
  - Navigates to provider portfolio page: `/{slug}?from_ai=true&session_id={sessionId}`
  - Customer can view provider's portfolio, services, reviews, etc.
  
- **Step 2**: Customer clicks "Open Chat" button (shown instead of "Book Now" when from AI flow)
  - Frontend calls: `POST /customer/ai-chat/chats/create` with `providerId` and `aiSessionId`
  - Backend:
    1. Retrieves session summary from `ai_chat_sessions.summary`
    2. Creates chat record with `from_ai_flow=true` and `ai_session_id`
    3. Creates first message: `"[AI Summary] {summary}"`
    4. Returns `chatId`
  - Frontend opens chat using `createConversationFromAI()`
  - Provider sees AI summary as the first message with full context

## Example Conversation → Summary

**Conversation:**
- User: "I need plumbing services"
- AI: "What's your location?"
- User: "75001, Dallas"
- AI: "What's your budget?"
- User: "Around $500-1000"
- AI: "What specific work do you need?"
- User: "Fix a leaky faucet in my kitchen, I prefer eco-friendly materials"

**Generated Summary:**
```
"Service: Plumbing | Location: 75001 | Budget: $500-1000 | Requirements: Fix leaky faucet in kitchen, eco-friendly materials preferred"
```

## Key Features

1. **Context-Aware**: Uses full conversation history, not just last message
2. **Structured Format**: Consistent format for easy parsing/display
3. **Idempotent**: Can be called multiple times safely
4. **Error Handling**: Falls back gracefully if AI fails
5. **Single Source of Truth**: Summary stored once, reused for all provider chats

## AI Model Behavior

The AI (Gemini 2.5 Flash) is instructed to:
- Extract information from natural conversation
- Handle missing information gracefully (use "Not specified" if needed)
- Maintain structured format even if customer was vague
- Focus on service requirements, not FAQs or complaints

