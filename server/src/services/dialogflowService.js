// service/DialogflowService.js
const dialogflow = require('@google-cloud/dialogflow');
const uuid = require('uuid');
const path = require('path');

const { BaseRepository } = require('../utils/index');

class DialogflowService {
  constructor() {
    const credentialsPath = path.join(__dirname, '../config/ibm-app-728be-4fb224d0fb5e.json');
    const serviceAccount = require(credentialsPath);

    this.projectId = serviceAccount.project_id;
    this.sessionClient = new dialogflow.SessionsClient({
      credentials: {
        client_email: serviceAccount.client_email,
        private_key: serviceAccount.private_key,
      }
    });

    this.userRepo = new BaseRepository('users', 'user_id');
    this.interestRepo = new BaseRepository('user_interest_flows', 'id');
    this.quizRepo = new BaseRepository('user_quiz_attempts', 'id');
  }

  async detectIntent({ userId, message }) {
    const sessionId = uuid.v4();
    const sessionPath = this.sessionClient.projectAgentSessionPath(this.projectId, sessionId);

    // Pull user context using BaseRepository instances
    const user = await this.userRepo.getOne({ user_id: userId });
    const interests = await this.interestRepo.getAll({ user_id: userId });
    const quizzes = await this.quizRepo.getAll({ user_id: userId });

    const interestField = interests?.[0]?.selected_field || 'General';
    const specialization = interests?.[0]?.selected_specialization || 'None';
    const experience = interests?.[0]?.selected_experience || 'Beginner';
    const avgScore = quizzes.length ? (quizzes.reduce((sum, q) => sum + q.score, 0) / quizzes.length) : null;

    const context = {
      field: interestField,
      specialization,
      experience,
      avgScore,
      fullName: `${user?.first_name || ''} ${user?.last_name || ''}`.trim()
    };

    const request = {
      session: sessionPath,
      queryInput: {
        text: {
          text: message,
          languageCode: 'en-US',
        },
      },
      queryParams: {
        payload: {
          fields: this._convertToStruct(context),
        },
      },
    };

    const [response] = await this.sessionClient.detectIntent(request);
    return response.queryResult.fulfillmentText;
  }

  _convertToStruct(obj) {
    const fields = {};
    for (const key in obj) {
      const val = obj[key];
      fields[key] = typeof val === 'number'
        ? { numberValue: val }
        : { stringValue: val || 'Unknown' };
    }
    return { fields };
  }
}

module.exports = DialogflowService;
