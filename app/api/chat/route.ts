/**
 * AI Chat API - Conversational AI Assistant for CRO Insights
 * Supports streaming responses and context-aware conversations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { ChatRequest, ChatMessage, SuggestedAction } from '@/lib/types/collaboration';
import { rateLimit } from '@/lib/utils/rate-limit';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  try {
    // Authentication
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting (20 messages per minute for chat)
    const rateLimitResult = await rateLimit(user.id);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          limit: rateLimitResult.limit,
          remaining: rateLimitResult.remaining,
          reset: rateLimitResult.reset,
        },
        { status: 429 }
      );
    }

    const body: ChatRequest = await request.json();
    const { conversation_id, message, context } = body;

    // Validate input
    if (!message || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Get or create conversation
    let conversationId = conversation_id;

    if (!conversationId) {
      // Create new conversation
      const { data: newConversation, error: createError } = await supabase
        .from('chat_conversations')
        .insert({
          user_id: user.id,
          analysis_id: context?.analysis_id,
          title: message.slice(0, 100), // Use first part of message as title
          context: context || {},
          status: 'active',
        })
        .select()
        .single();

      if (createError || !newConversation) {
        console.error('Failed to create conversation:', createError);
        return NextResponse.json(
          { error: 'Failed to create conversation' },
          { status: 500 }
        );
      }

      conversationId = newConversation.id;
    }

    // Get conversation history
    const { data: messages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(20); // Last 20 messages for context

    if (messagesError) {
      console.error('Failed to get messages:', messagesError);
    }

    const conversationHistory = messages || [];

    // Save user message
    const { error: saveUserMessageError } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: conversationId,
        role: 'user',
        content: message,
        metadata: {},
      });

    if (saveUserMessageError) {
      console.error('Failed to save user message:', saveUserMessageError);
    }

    // Build system prompt with context
    const systemPrompt = buildSystemPrompt(context);

    // Build conversation for AI
    const aiMessages = buildAIMessages(systemPrompt, conversationHistory, message);

    // Get AI response (GPT-4 by default for chat)
    const aiResponse = await getAIResponse(aiMessages);

    // Save assistant message
    const { data: assistantMessage, error: saveAssistantError } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: aiResponse.content,
        metadata: {
          model: aiResponse.model,
          tokens: aiResponse.tokens,
        },
      })
      .select()
      .single();

    if (saveAssistantError || !assistantMessage) {
      console.error('Failed to save assistant message:', saveAssistantError);
    }

    // Detect suggested actions from AI response
    const suggestedActions = detectSuggestedActions(aiResponse.content, context);

    return NextResponse.json({
      success: true,
      conversation_id: conversationId,
      message: assistantMessage,
      suggested_actions: suggestedActions,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * Build system prompt with context awareness
 */
function buildSystemPrompt(context?: ChatRequest['context']): string {
  let prompt = `You are an expert CRO (Conversion Rate Optimization) AI assistant. Your role is to help users:

1. **Understand insights**: Explain findings, provide context, and clarify recommendations
2. **Refine analysis**: Suggest improvements, identify gaps, and propose additional insights
3. **Prioritize actions**: Help users decide what to test first based on impact and effort
4. **Generate hypotheses**: Create testable hypotheses from insights and themes
5. **Plan experiments**: Design A/B tests and provide implementation guidance

**Communication Style**:
- Be concise but thorough
- Use data and research to support recommendations
- Ask clarifying questions when needed
- Provide actionable next steps
- Reference specific insights/themes when relevant

**Context-Aware Responses**:
- If user references "this insight" or "that theme", use the provided context
- Always ground recommendations in CRO best practices
- Explain the "why" behind suggestions
`;

  if (context) {
    if (context.url) {
      prompt += `\n\n**Current Analysis**: ${context.url}`;
    }

    if (context.insights && Array.isArray(context.insights) && context.insights.length > 0) {
      prompt += `\n\n**Available Insights**: ${context.insights.length} insights extracted`;
      prompt += `\nTop insights:\n${context.insights.slice(0, 5).map((i: any, idx) => `${idx + 1}. [${i.severity}] ${i.title}`).join('\n')}`;
    }

    if (context.themes && Array.isArray(context.themes) && context.themes.length > 0) {
      prompt += `\n\n**Identified Themes**: ${context.themes.length} themes`;
      prompt += `\nThemes:\n${context.themes.map((t: any, idx) => `${idx + 1}. ${t.title}`).join('\n')}`;
    }

    if (context.hypotheses && Array.isArray(context.hypotheses) && context.hypotheses.length > 0) {
      prompt += `\n\n**Generated Hypotheses**: ${context.hypotheses.length} testable hypotheses`;
    }
  }

  return prompt;
}

/**
 * Build messages for AI conversation
 */
function buildAIMessages(
  systemPrompt: string,
  history: any[],
  newMessage: string
): Array<{ role: string; content: string }> {
  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: systemPrompt },
  ];

  // Add conversation history
  for (const msg of history) {
    if (msg.role === 'user' || msg.role === 'assistant') {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }
  }

  // Add new message
  messages.push({
    role: 'user',
    content: newMessage,
  });

  return messages;
}

/**
 * Get AI response using GPT-4
 */
async function getAIResponse(
  messages: Array<{ role: string; content: string }>
): Promise<{ content: string; model: string; tokens: number }> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: messages as any,
    temperature: 0.7,
    max_tokens: 1000,
  });

  const choice = completion.choices[0];
  if (!choice) {
    throw new Error('No response from AI');
  }

  return {
    content: choice.message?.content || 'I apologize, but I couldn\'t generate a response.',
    model: completion.model,
    tokens: completion.usage?.total_tokens || 0,
  };
}

/**
 * Detect suggested actions from AI response
 */
function detectSuggestedActions(
  response: string,
  context?: ChatRequest['context']
): SuggestedAction[] {
  const actions: SuggestedAction[] = [];

  // Detect common action patterns
  const lowerResponse = response.toLowerCase();

  if (lowerResponse.includes('run a test') || lowerResponse.includes('create an experiment')) {
    actions.push({
      type: 'create_experiment',
      label: 'Create Experiment',
      description: 'Set up an A/B test based on this recommendation',
      data: {},
    });
  }

  if (lowerResponse.includes('add insight') || lowerResponse.includes('document this')) {
    actions.push({
      type: 'add_insight',
      label: 'Add Custom Insight',
      description: 'Save this as a custom insight',
      data: {},
    });
  }

  if (lowerResponse.includes('hypothesis') && !lowerResponse.includes('no hypothesis')) {
    actions.push({
      type: 'create_hypothesis',
      label: 'Create Hypothesis',
      description: 'Generate a testable hypothesis',
      data: {},
    });
  }

  if (context?.url && (lowerResponse.includes('analyze again') || lowerResponse.includes('re-run'))) {
    actions.push({
      type: 'run_analysis',
      label: 'Run New Analysis',
      description: 'Analyze the page again with updated parameters',
      data: { url: context.url },
    });
  }

  return actions;
}

/**
 * GET endpoint to retrieve conversation history
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversation_id');

    if (!conversationId) {
      // Return list of user's conversations
      const { data: conversations, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(20);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ conversations });
    }

    // Return specific conversation with messages
    const { data: conversation, error: convError } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const { data: messages, error: msgError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (msgError) {
      return NextResponse.json({ error: msgError.message }, { status: 500 });
    }

    return NextResponse.json({
      conversation,
      messages,
    });
  } catch (error) {
    console.error('GET Chat API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
