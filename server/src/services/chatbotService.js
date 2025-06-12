// services/chatbotService.js
const dialogflow = require('@google-cloud/dialogflow');
const uuid = require('uuid');

// Set up your Dialogflow session client
const sessionClient = new dialogflow.SessionsClient();
const projectId = process.env.DIALOGFLOW_PROJECT_ID;

async function detectIntent(text, sessionId) {
  const sessionPath = sessionClient.projectAgentSessionPath(projectId, sessionId);

  const request = {
    session: sessionPath,
    queryInput: {
      text: {
        text,
        languageCode: 'en-US',
      },
    },
  };

  const responses = await sessionClient.detectIntent(request);
  const result = responses[0].queryResult;

  return {
    intent: result.intent.displayName,
    confidence: result.intentDetectionConfidence,
    responseText: result.fulfillmentText,
  };
}

module.exports = {
  detectIntent
};
