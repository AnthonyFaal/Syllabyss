import React, { useState, useEffect, useRef } from 'react';
import { FaComments, FaCalendarAlt, FaUsers, FaShieldAlt } from 'react-icons/fa';
import { 
  getMessages, 
  sendMessage, 
  setTyping, 
  getTypingUsers,
  getMembers
} from '../../api/APIs';
import { getUserId } from '../../utils/authToken';
import './ChatPanel.css';

const ChatPanel = ({ activeChat }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const [members, setMembers] = useState([]);
  const [activeTab, setActiveTab] = useState('chats');
  const messagesEndRef = useRef(null);

  const defaultAvatar = 'https://cdn-icons-png.flaticon.com/512/565/565547.png';

  useEffect(() => {
    if (activeChat) {
      setActiveTab('chats');
      loadMessages();
      const typingInterval = setupTypingListener();

      return () => clearInterval(typingInterval);
    } else {
      setMessages([]);
      setTypingUsers([]);
      setMembers([]);
    }
  }, [activeChat]);

  const loadMessages = async () => {
    try {
      const result = await getMessages(activeChat.chat_id);
      setMessages(result.data || []);
      scrollToBottom();
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const setupTypingListener = () => {
    return setInterval(async () => {
      try {
        const users = await getTypingUsers(activeChat.chat_id);
        setTypingUsers(users.data || []);
      } catch (err) {
        console.error('Failed to get typing users:', err);
      }
    }, 3000);
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
      console.error('Failed to send message:', error);
    }
  };

  const handleTyping = async () => {
    if (newMessage.trim()) {
      try {
        await setTyping(activeChat.chat_id, getUserId());
      } catch (err) {
        console.error('Failed to set typing status:', err);
      }
    }
  };

  const handleTabClick = async (tab) => {
    setActiveTab(tab);
    if (tab === 'members') {
      try {
        const result = await getMembers(activeChat.chat_id);
        setMembers(result.data?.data || []);
      } catch (err) {
        console.error('Failed to load members:', err);
        setMembers([]);
      }
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatDisplayName = (name, length = 2) => {
  if (!name) return 'U';
  if (length === 1) return name.charAt(0).toUpperCase();
  if (name.length <= 10) return name;
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, length)
    .toUpperCase();
};


  if (!activeChat) {
    return <div className="no-chat-selected">Select a chat to start messaging</div>;
  }

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <div className="chat-tabs">
          <button
            className={`tab-btn ${activeTab === 'chats' ? 'active' : ''}`}
            onClick={() => handleTabClick('chats')}
            title="Chats"
          >
            <FaComments color="#4a90e2" /> Chats
          </button>

          {!activeChat?.is_bot && (
            <>
              <button
                className={`tab-btn ${activeTab === 'events' ? 'active' : ''}`}
                onClick={() => handleTabClick('events')}
                title="Events"
              >
                <FaCalendarAlt color="#28a745" /> Events
              </button>

              <button
                className={`tab-btn ${activeTab === 'members' ? 'active' : ''}`}
                onClick={() => handleTabClick('members')}
                title="Members"
              >
                <FaUsers color="#f39c12" /> Members
              </button>
            </>
          )}
        </div>

        {activeTab === 'chats' && (
          <div className="chat-title-wrapper">
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
                  <span></span><span></span><span></span>
                </div>
                <span>
                  {typingUsers.length === 1
                    ? `${typingUsers[0].user_name} is typing...`
                    : `${typingUsers.length} people are typing...`}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {activeTab === 'chats' && (
        <>
          <div className="messages-container">
            {messages.map(message => {
              const isCurrentUser = message.chat_member_id === getUserId();
              return (
                <div
                  key={message.message_id}
                  className={`message ${isCurrentUser ? 'current-user' : ''}`}
                >
                  {!isCurrentUser && (
                    <img
                      src={message.profile_image || defaultAvatar}
                      alt={message.user_name}
                      className="message-avatar"
                    />
                  )}
                  <div className="message-content-wrapper">
                    {!isCurrentUser && (
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
                </div>
              );
            })}
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
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </>
      )}

      {activeTab === 'events' && (
        <div className="messages-container">
          <p>📅 Upcoming Events will appear here...</p>
        </div>
      )}

      {activeTab === 'members' && (
        <div className="messages-container">
          {Array.isArray(members) && members.length > 0 ? (
            members.map((member) => (
              <div key={member.user_id} className="member-card">
                {member.profile_image ? (
                  <img
                    src={member?.profile_image}
                    alt={member?.name}
                    className="message-avatar"
                  />
                ) : (
                  <div className="initials-avatar">
                    {formatDisplayName(member?.name, 1)}
                  </div>
                )}
                <div className="message-content-wrapper">
                  <strong>{member.name}</strong>
                  {member.is_admin && (
                    <span className="admin-badge">
                      <FaShieldAlt style={{ marginRight: '4px' }} /> Admin
                    </span>
                  )}
                  <div className="message-time">
                    Joined: {new Date(member.joined_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p>👥 No members found...</p>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatPanel;
