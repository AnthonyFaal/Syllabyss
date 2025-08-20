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

    if (isGeneral) {
      // 🎯 User asked something non-educational
      return {
        query: message,
        reply: "📘 I'm here to help with your learning journey. That question seems unrelated to your studies. Try asking me about your lessons, courses, skills, or progress!",
        source: 'system',
        usedContext: false
      };
    }

    // Otherwise generate a contextual education-focused reply
    const reply = await this.generateResponseWithOpenAI(message, userContext);

    return {
      query: message,
      reply,
      source: 'openai',
      usedContext: true
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
            content: 'You are a strict classifier. Respond only with "yes" or "no". Answer "yes" if the question is NOT related to education, learning, courses, skills, or academic progress. Otherwise answer "no".'
          },
          {
            role: 'user',
            content: `Is this question unrelated to education? "${message}"`
          }
        ],
        temperature: 0,
        max_tokens: 5
      });

      const reply = response.choices?.[0]?.message?.content?.toLowerCase().trim();
      const result = reply.includes('yes');

      console.log(`[TutorService] Classified as off-topic/general: ${result}`);
      return result;
    } catch (err) {
      console.error('[TutorService] Classification failed:', err);
      return false;
    }
  }

  /**
   * Generates a GPT response with context (always education-focused).
   */
  async generateResponseWithOpenAI(message, context = null) {
    let prompt = '';

    if (context) {
      prompt = `
The user asked: "${message}".

Here is the user's learning context:
- Name: ${context.user.name || 'N/A'}
- Role: ${context.user.role || 'N/A'}
- Level: ${context.user.level || 'N/A'}
- Interest: ${context.interests?.[0]?.title || 'N/A'}
- Recent Course: ${context.recentCourse?.title || 'N/A'}
- Latest Quiz Score: ${context.latestQuiz?.score || 'N/A'}

Based on this, provide a clear and supportive educational explanation, tip, or recommendation. Keep it focused on learning.`;
    } else {
      prompt = `The user asked: "${message}". Provide a helpful educational explanation or tip.`;
    }

    try {
      const response = await openai.chat.completions.create({
        model: OPEN_AI_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful AI tutor who only gives educational advice. Always keep responses relevant to learning, courses, or skills.'
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
