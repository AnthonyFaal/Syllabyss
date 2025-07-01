import React, { useState, useEffect, useRef } from 'react';
import { 
  getMessages, 
  sendMessage, 
  setTyping, 
  getTypingUsers
} from '../../api/APIs';
import { getUserId } from '../../utils/authToken';
import './ChatPanel.css';

const ChatPanel = ({ activeChat }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const messagesEndRef = useRef(null);

  const defaultAvatar = 'https://cdn-icons-png.flaticon.com/512/565/565547.png';

  useEffect(() => {
    if (activeChat) {
      loadMessages();
      setupTypingListener();
    }
    return () => {
      setMessages([]);
      setTypingUsers([]);
    };
  }, [activeChat]);

  const loadMessages = async () => {
    try {
      const result = await getMessages(activeChat.chat_id);
      const msgs = result.data || [];
      setMessages(msgs);
      scrollToBottom();
    } catch (error) {
      console.error("Failed to load messages:", error);
    }
  };

  const setupTypingListener = () => {
    const interval = setInterval(async () => {
      try {
        const users = await getTypingUsers(activeChat.chat_id);
        setTypingUsers(users.data || []);
      } catch (err) {
        console.error("Failed to get typing users:", err);
      }
    }, 3000);

    return () => clearInterval(interval);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    
    try {
      await sendMessage(activeChat.chat_id, {
       message_text: newMessage,
       user_id: getUserId()
      });
      setNewMessage('');
      loadMessages();
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleTyping = async () => {
    if (newMessage.trim()) {
      await setTyping(activeChat.chat_id, getUserId());
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatDisplayName = (name) => {
    if (!name) return 'User';
    if (name.length <= 10) return name;
    return name.split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <div className="chat-title">
          <img 
            src={activeChat?.profile_image || defaultAvatar} 
            alt={activeChat?.chat_name} 
            className="chat-avatar"
          />
          <h3>{activeChat?.chat_name}</h3>
        </div>
        {typingUsers.length > 0 && (
          <div className="typing-indicator">
            <div className="typing-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <span>
              {typingUsers.length === 1 
                ? `${typingUsers[0].user_name} is typing...` 
                : `${typingUsers.length} people are typing...`}
            </span>
          </div>
        )}
      </div>
      
      <div className="messages-container">
        {messages.map(message => (
          <div 
  key={message.message_id} 
  className={`message ${message.is_current_user ? 'current-user' : ''}`}
>
  {!message.is_current_user && (
    <img 
      src={message.profile_image || defaultAvatar}
      alt={message.user_name}
      className="message-avatar"
    />
  )}
  <div className="message-content-wrapper">
    {!message.is_current_user && (
      <div className="message-sender">
        {formatDisplayName(message.user_name)}
      </div>
    )}
    <div className="message-bubble">
      <div className="message-text">{message.message_text}</div>
      <div className="message-time">
        {new Date(message.timestamp).toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        })}
      </div>
    </div>
  </div>
  {message.is_current_user && (
    <img 
      src={message.profile_image || defaultAvatar}
      alt={message.user_name}
      className="message-avatar"
    />
  )}
</div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="message-input-container">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => {
            setNewMessage(e.target.value);
            handleTyping();
          }}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Type a message..."
          className="message-input"
        />
        <button 
          onClick={handleSendMessage}
          className="send-button"
          disabled={!newMessage.trim()}
        >
          <svg className="send-icon" viewBox="0 0 24 24">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ChatPanel;