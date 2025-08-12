// services/tutorService.js

const openai = require('../config/openaiClient');
const { OPEN_AI_MODEL } = require('../config/openaiClient');

class TutorService {
  constructor() {
    console.log('[TutorService] Initialized');
  }

  /**
   * Handles user messages by deciding whether to use context
   * and generating a response using OpenAI.
   */
  async handleMessage({ userId, message, userContext }) {
    if (!userId || !message) {
      throw new Error('userId and message are required');
    }

    console.log(`[TutorService] Handling message for user ${userId}: "${message}"`);

    const isGeneral = await this.isGeneralQuestion(message);

    const reply = await this.generateResponseWithOpenAI(message, isGeneral ? null : userContext);

    return {
      query: message,
      reply,
      source: 'openai',
      usedContext: !isGeneral
    };
  }

  /**
   * Determines if a user message is general or unrelated to learning context.
   */
  async isGeneralQuestion(message) {
    try {
      const response = await openai.chat.completions.create({
        model: OPEN_AI_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a classifier that only responds with "yes" or "no". Determine if this question is general and unrelated to academic progress or personal learning.'
          },
          {
            role: 'user',
            content: `Is this question general? "${message}"`
          }
        ],
        temperature: 0,
        max_tokens: 5
      });

      const reply = response.choices?.[0]?.message?.content?.toLowerCase().trim();
      const result = reply.includes('yes');

      console.log(`[TutorService] Classified as general question: ${result}`);
      return result;
    } catch (err) {
      console.error('[TutorService] Classification failed:', err);
      return false;
    }
  }

  /**
   * Generates a GPT response with or without context.
   */
  async generateResponseWithOpenAI(message, context = null) {
    let prompt = '';

    if (context) {
      prompt = `
You are a smart and helpful AI tutor. The user asked: "${message}".

Here is the user's learning context:
- Name: ${context.user.name || 'N/A'}
- Role: ${context.user.role || 'N/A'}
- Level: ${context.user.level || 'N/A'}
- Interest: ${context.interests?.[0]?.title || 'N/A'}
- Recent Course: ${context.recentCourse?.title || 'N/A'}
- Latest Quiz Score: ${context.latestQuiz?.score || 'N/A'}

Based on this context, provide a helpful learning recommendation, tip, or explanation related to the user's query. Be supportive, clear, and friendly.`;
    } else {
      prompt = `
You are a helpful and friendly AI assistant. The user asked: "${message}".
Give a clear, factual, or motivational response. Do not mention or assume any user-specific history.`;
    }

    try {
      const response = await openai.chat.completions.create({
        model: OPEN_AI_MODEL,
        messages: [
          {
            role: 'system',
            content: context
              ? 'You are a helpful AI tutor who gives personalized learning advice.'
              : 'You are a helpful AI assistant that answers general questions.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 300
      });

      const content = response.choices?.[0]?.message?.content?.trim();
      console.log('[TutorService] GPT Reply:', content);
      return content || "I'm not sure what to suggest at the moment.";
    } catch (error) {
      console.error('[TutorService] OpenAI API Error:', error);
      return "Sorry, I'm having trouble thinking right now. Try again later.";
    }
  }
}

module.exports = new TutorService();
