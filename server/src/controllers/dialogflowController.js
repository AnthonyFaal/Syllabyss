// controllers/DialogflowController.js
const DialogflowService = require('../services/dialogflowService');

class DialogflowController {
  constructor() {
    this.dialogflowService = new DialogflowService();
    this.askBot = this.askBot.bind(this);
  }

  async askBot(req, res) {
  try {
    const userId = req.user?.id;
    const { message } = req.body;

    if (!userId || !message) {
      return res.status(400).json({ success: false, message: 'Authenticated user and message are required' });
    }

    const reply = await this.dialogflowService.detectIntent({ userId, message });
    res.status(200).json({ success: true, reply });
  } catch (error) {
    console.error('Dialogflow error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
}

module.exports = new DialogflowController();
