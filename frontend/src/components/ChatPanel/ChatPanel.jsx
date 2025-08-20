import React, { useState, useEffect, useRef } from 'react';
import { FaComments, FaCalendarAlt, FaUsers, FaShieldAlt } from 'react-icons/fa';
import { 
  getMessages, 
  sendMessage, 
  setTyping, 
  getTypingUsers,
  getMembers,
  defaultAvatar
} from '../../api/APIs';
import { getUserId } from '../../utils/authToken';
import EventsTab from '../events/EventsTab';
import ErrorBoundary from '../Error/ErrorBoundary';
import './ChatPanel.css';
import '../events/EventsTab.css' 

const ChatPanel = ({ activeChat, socket}) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const [members, setMembers] = useState([]);
  const [activeTab, setActiveTab] = useState('chats');
  const messagesEndRef = useRef(null);

 useEffect(() => {
  if (!activeChat) {
    setMessages([]);
    setTypingUsers([]);
    setMembers([]);
    return;
  }

  setActiveTab('chats');
  loadMessages();

  const typingInterval = setupTypingListener();

  // Add socket listener for new messages
const handleNewMessage = (message) => {
  if (message.chat_id === activeChat.chat_id) {
    // Format the incoming message properly
    const formattedMessage = {
      ...message,
      is_current_user: message.user_id === getUserId(),
      // Ensure all required fields are present
      profile_image: message.profile_image || defaultAvatar,
      user_name: message.user_name || 'Unknown User',
      timestamp: message.timestamp || new Date().toISOString()
    };
    
    setMessages(prev => [...prev, formattedMessage]);
    scrollToBottom();
  }
};

  socket?.on('newMessage', handleNewMessage);

  // Cleanup
  return () => {
    clearInterval(typingInterval);
    socket?.off('newMessage', handleNewMessage);
  };
}, [activeChat, socket]);


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
                const isCurrentUser = message.is_current_user;
                const isSystem = false;

                return (
                  <div 
                    key={message.message_id}
                    className={`message-wrapper ${isCurrentUser ? 'current-user' : 'other-user'}`}
                  >
                    {!isCurrentUser && !isSystem && (
                      <div className="message-avatar-container">
                        <img
                          src={message.profile_image || defaultAvatar}
                          alt={message.user_name}
                          className="message-avatar"
                        />
                      </div>
                    )}
                    
                    <div className={`message-bubble ${isSystem ? 'system' : isCurrentUser ? 'right' : 'left'}`}>
                      {!isSystem && (
                        <div className="message-meta">
                          <span className="username">{message.user_name}</span>
                          <span className="timestamp">
                            {new Date(message.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      )}
                      <div className="message-content">{message.message_text}</div>
                    </div>
                    
                    {isCurrentUser && !isSystem && (
                      <div className="message-avatar-container current-user-avatar">
                        <img
                          src={message.profile_image || defaultAvatar}
                          alt={message.user_name}
                          className="message-avatar"
                        />
                      </div>
                    )}
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
          <ErrorBoundary>
            <EventsTab chatId={activeChat?.chat_id} />
          </ErrorBoundary>
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
