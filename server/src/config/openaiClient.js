// config/openaiClient.js
const OpenAI = require("openai");

const OPEN_AI_KEY = process.env.OPEN_AI_KEY;
const OPEN_AI_BASE_URL = "https://models.github.ai/inference"; // or your OpenAI base URL
const OPEN_AI_MODEL = "openai/gpt-4.1";

const openai = new OpenAI({
  apiKey: OPEN_AI_KEY,
  baseURL: OPEN_AI_BASE_URL,
});

module.exports = openai;
module.exports.OPEN_AI_MODEL = OPEN_AI_MODEL;
