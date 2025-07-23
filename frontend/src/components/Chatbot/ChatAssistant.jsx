/* eslint-disable no-unused-vars */
import React, { useState } from "react";
import { FaTimes } from "react-icons/fa";
import MiriamAvatar from "../../assets/Avatar.jpeg";
import "./ChatAssistant.css";
import Filter from "bad-words";

const filter = new Filter();

const ChatAssistant = ({ onClose, onSendMessage }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const isGreeting = (text) => {
    const greetings = ["hello", "hi", "hey", "good morning", "good afternoon"];
    const cleaned = text.toLowerCase().trim();
    return greetings.some((greet) => cleaned.includes(greet));
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const text = input.trim();
    const userMessage = { from: "user", text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    // Profanity filter
    if (filter.isProfane(text)) {
      const blockedReply = {
        from: "bot",
        text: "Let's keep our conversation respectful 😊",
      };
      setMessages((prev) => [...prev, blockedReply]);
      return;
    }

    // Greeting logic
    if (isGreeting(text)) {
      const greetingReply = {
        from: "bot",
        text: "Hello! How can I assist you today?",
      };
      setMessages((prev) => [...prev, greetingReply]);
      return;
    }

    // Call Dialogflow API (onSendMessage should be provided from parent)
    try {
      const response = await onSendMessage(text);
      const botReply = {
        from: "bot", 
        text: response?.reply || "I'm not sure how to respond to that yet.",
      };
      setMessages((prev) => [...prev, botReply]);
    } catch (err) {
      const errorReply = {
        from: "bot",
        text: "Sorry, something went wrong. Please try again later.",
      };
      setMessages((prev) => [...prev, errorReply]);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSend();
  };

  return (
    <div className="chat-assistant">
      <div className="chat-header">
        <h3>Miriam - AI Tutor</h3>
        <button className="chat-close" onClick={onClose}>
          <FaTimes />
        </button>
      </div>

      <div className="chat-body">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`chat-message ${msg.from === "user" ? "user" : "bot"}`}
          >
            {msg.from === "bot" && (
              <img src={MiriamAvatar} alt="Miriam" className="avatar" />
            )}
            <span>{msg.text}</span>
          </div>
        ))}
      </div>

      <div className="chat-input">
        <input
          type="text"
          placeholder="Ask me something..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button onClick={handleSend}>Send</button>
      </div>
    </div>
  );
};

export default ChatAssistant;
