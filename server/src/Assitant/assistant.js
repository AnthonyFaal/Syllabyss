const ModelClient = require("@azure-rest/ai-inference").default;
const { isUnexpected } = require("@azure-rest/ai-inference");
const { AzureKeyCredential } = require("@azure/core-auth");
const Sentiment = require('sentiment');

// Configuration
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = "https://api.deepseek.com/v1";
const DEEPSEEK_MODEL = "deepseek-chat";

// Initialize clients
const deepseekClient = ModelClient(DEEPSEEK_API_URL, new AzureKeyCredential(DEEPSEEK_API_KEY));
const sentimentAnalyzer = new Sentiment();

async function miriamKnowledgeBot(inputText) {
    // Analyze user input sentiment
    const sentiment = sentimentAnalyzer.analyze(inputText);
    
    try {
        // Detect intent
        const intent = detectIntent(inputText);
        
        // Generate response using DeepSeek
        const response = await generateKnowledgeResponse(inputText, intent);
        
        return {
            success: true,
            response: {
                text: response.content,
                intent: intent,
                sentiment: sentiment.score,
                confidence: 0.9,
                sources: response.sources || ["DeepSeek Knowledge Base"],
                timestamp: new Date().toISOString()
            }
        };
    } catch (error) {
        console.error("Knowledge bot error:", error);
        return {
            success: false,
            error: "I encountered an error processing your request",
            details: error.message,
            sentiment: sentiment.score
        };
    }
}

function detectIntent(inputText) {
    const text = inputText.toLowerCase();
    
    if (text.match(/\b(hello|hi|hey)\b/)) return "greeting";
    if (text.match(/\b(what|how|why|explain|define|describe)\b/)) return "explanation";
    if (text.match(/\b(search|find|look up)\b/)) return "information_search";
    if (text.match(/\b(compare|difference between)\b/)) return "comparison";
    if (text.match(/\b(history|origin|background)\b/)) return "historical_context";
    
    return "general_inquiry";
}

async function generateKnowledgeResponse(query, intent) {
    const systemPrompt = {
        "greeting": "You are Miriam, a friendly and knowledgeable AI assistant. Respond warmly and offer help.",
        "explanation": "You are Miriam, an expert educator. Provide clear, concise explanations suitable for a college-educated audience.",
        "information_search": "You are Miriam, a research specialist. Provide accurate information with key details.",
        "comparison": "You are Miriam, an analytical expert. Present balanced comparisons with clear distinctions.",
        "historical_context": "You are Miriam, a historical researcher. Provide accurate historical context with key dates and figures.",
        "general_inquiry": "You are Miriam, a knowledgeable assistant. Respond helpfully to the user's query."
    }[intent];
    
    const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: query }
    ];
    
    const response = await deepseekClient.path("/chat/completions").post({
        body: {
            model: DEEPSEEK_MODEL,
            messages: messages,
            temperature: 0.7,
            max_tokens: 1500,
            top_p: 0.9
        }
    });
    
    if (isUnexpected(response)) {
        throw new Error(response.body?.error?.message || "API request failed");
    }
    
    return {
        content: response.body.choices[0].message.content,
        sources: extractSources(response.body.choices[0].message.content)
    };
}

function extractSources(content) {
    // This would be enhanced with actual source extraction logic
    const sourceMatches = content.match(/\[source:\s*(.+?)\]/g);
    return sourceMatches ? 
        sourceMatches.map(s => s.replace(/\[source:\s*|\]/g, '')) : 
        ["DeepSeek Knowledge Base"];
}

module.exports = miriamKnowledgeBot;