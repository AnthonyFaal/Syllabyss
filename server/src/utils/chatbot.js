function getBotResponse(message) {
  // Dummy logic — can expand later
  if (message.toLowerCase().includes('weather')) {
    return "The weather today is sunny!";
  } else if (message.toLowerCase().includes('hello')) {
    return "Hi there! How can I help you today?";
  }
  return "I'm a bot, but I'm still learning!";
}

module.exports = { getBotResponse };
