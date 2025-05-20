import React, { useState } from "react";
import { FaTimes } from "react-icons/fa";
import MiriamAvatar from "../../assets/Avatar.jpeg"; // Ensure correct path
import "./ChatAssistant.css";

const dummyReplies = [
  "Hello! How can I assist you today?",
  "Sure, I can help with that!",
  "Interesting question, let me explain...",
  "You're doing great, keep going!",
  "Let’s dive a bit deeper into that topic.",
  "That's a smart question!",
  "Great job asking that. Here's what I found...",
];

const ChatAssistant = ({ onClose }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (input.trim() === "") return;

    const userMessage = { from: "user", text: input };
    const botReply = {
      from: "bot",
      text: dummyReplies[Math.floor(Math.random() * dummyReplies.length)],
    };

    setMessages((prev) => [...prev, userMessage]);

    // Simulate delay
    setTimeout(() => {
      setMessages((prev) => [...prev, botReply]);
    }, 800);

    setInput("");
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
              <img
                src={MiriamAvatar}
                alt="Miriam"
                className="avatar"
              />
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
