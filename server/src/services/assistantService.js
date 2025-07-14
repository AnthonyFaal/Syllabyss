const openai = require("../config/openaiClient");
const Sentiment = require('sentiment');

const sentimentAnalyzer = new Sentiment();

class AssistantService {
  async getResponse(userInput, userContext = {}) {
    const sentiment = sentimentAnalyzer.analyze(userInput);
    const intent = this.detectIntent(userInput);

    try {
      const systemPrompt = this.getSystemPrompt(intent, userContext);

      const aiResponse = await openai.chat.completions.create({
        model: openai.OPEN_AI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userInput }
        ],
        temperature: 0.6,
        max_tokens: 1000,
        top_p: 0.9
      });

      return {
        success: true,
        data: {
          response: aiResponse.choices[0].message.content.trim(),
          sentiment: sentiment.score,
          intent,
          confidence: 0.9,
          sources: this.extractSources(aiResponse.choices[0].message.content),
          timestamp: new Date().toISOString()
        }
      };
    } catch (err) {
      console.error("AssistantService Error:", err);
      return {
        success: false,
        message: "I'm sorry, I encountered an error trying to assist you. Please try again later.",
        details: err.message,
        sentiment: sentiment.score
      };
    }
  }

  detectIntent(text) {
    const lowerText = text.toLowerCase();
    if (/\b(hello|hi|hey)\b/.test(lowerText)) return "greeting";
    if (/\b(what|how|why|explain|define|describe)\b/.test(lowerText)) return "explanation";
    if (/\b(search|find|look up)\b/.test(lowerText)) return "information_search";
    if (/\b(compare|difference between)\b/.test(lowerText)) return "comparison";
    if (/\b(history|origin|background)\b/.test(lowerText)) return "historical_context";
    return "general_inquiry";
  }

  getSystemPrompt(intent, userContext = {}) {
    const { name = "User" } = userContext;

    const prompts = {
      greeting: `You are Miriam, a friendly and knowledgeable assistant. Greet ${name} warmly and offer help with a positive tone.`,
      explanation: `You are Miriam, a professional educator. Provide ${name} with a clear, concise explanation suitable for a professional context.`,
      information_search: `You are Miriam, a research specialist. Provide ${name} with detailed, accurate information on their request.`,
      comparison: `You are Miriam, an analytical expert. Help ${name} understand differences clearly and fairly.`,
      historical_context: `You are Miriam, a historian. Give ${name} relevant historical context with key dates and facts.`,
      general_inquiry: `You are Miriam, a knowledgeable assistant. Assist ${name} with helpful, human-like responses without making them feel bad.`
    };

    return prompts[intent] || prompts.general_inquiry;
  }

  extractSources(content) {
    const matches = content.match(/\[source:\s*(.+?)\]/gi);
    return matches ? matches.map(m => m.replace(/\[source:\s*|\]/gi, '').trim()) : ["OpenAI Knowledge Base"];
  }
}

module.exports = new AssistantService();
