/* eslint-disable no-unused-vars */
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
  const [isConnected, setIsConnected] = useState(socket?.connected || false);


  const defaultAvatar = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAOEAAADhCAMAAAAJbSJIAAAALVBMVEXQ0NCxsbG0tLTPz8/Hx8e3t7fAwMDMzMy9vb21tbW6urrBwcGurq7FxcXT09M4BFhyAAAE60lEQVR4nO2dW5OjIBCFVUSNEv7/z92YzQVjVIRmOKTO97IPUzXl2Ya+QNNTVYQQQgghhBBCCCGEEEIIIYQQQgghhBCSBDuT+yNSYfvrMF60voxD16rfk9kOTW3qN2Of+4tE6Qfjqrtj6jb3Z4nR6k91Lzv+wlq1alyZ781UvkQ17Oi7LVWd+wMjsdc9eXcuRXuc3QX6kqhyf2Ywtj+Wd6dUiXZ/BzroMiV6rdAHo6rK86l9461vptFDW5RK2/ob0DFlQW71GiJwjo6lJHJTmMBZYxF2tOECZ1r47RgpsDZDbgVHRAqcJUJb0U6R+tAl2i7WgneJ19w6toleog9QPWpYoP9Gk1vKBq2Qvts67XJr+YpvteQlEbLeEBRY14hG3DpRC+OSW84a74LXD8CIcR1FFdaAYd/2ohoBl2l1urLfBzPqWzl3A7gR7whKRIwXM3JhH7VOtIOUwjG3lC3EjAir0Er5U1iFlVRURN2HtyqYCj2ZcgvZREihwcxpZqRs+PMKgW/4j+/uvUBN2m50MgpxF6lQPARepDIKDfJNokjq3eCdYbyR2IfQJhSJFrhZ94xEtIA88X4TfXCKvUZvBWKsMzVXZDdTqU7HlsAdtMDqEn+4rzvgfKbqZW4vgDei0C0wcHEodc+Ne4QhpVDjehsZgcgKhc4SgRUGNl5+AlzhyxzqI+dtMtdrqB1DdyRKC9Tb0QcCCrGrp+jSoobsw1gQrxA3Z/tPdAsmcDB8ECsR3YTV/Gp0/SrWE2Ma4FjoEhj5p74AAz4IO8vADoQLwhoWkLO1FWFhsZw1GlgLN9DJzCchCnEPL74QVGSUtA2DDhbxk5klp30N8Bnid9RZheglxZqT7hSzs3uXk48tS1ujM6eq4bL86JMTHcNlCpyfXP64QO+4X54bfeIbMZBboPbx9qZFpdwu3p4GtyP4AO83e0VVFQt8K4zCwr1V7yklXvqeFxW2A75Wc5hHmL1vjzys+Jqi0Jcxiq+de2rMq+/neM6CeTXqzfmB0eCj+Npnz9BrZ9m22df4+s9QT8W4Gq1ycm0nxO3lbs1rIo2TAA2gGvtFcFhc5G5pbJx8zV3OZsDbj7b/DO+LVEy1w+diNbU7GMp+NDmgTY2yrV5vtuXxp1X9NOra/KcZh9ZdinY9VcM0Hc5i3XImX6c+9e06vm95XAhDWrVaf8528kypN0OKye51bHuQXXsY4Sie6GvGycqbI3TfXA4GlNneI+3JZEjV1T61gzHdzlrtv7iob78kw91wf2K8Za2nfj360Vbt5N82bS5/q/FgQvAXmrG7OVH74OZRp20PtaFR/+FEvoi3P3oc7xsvqJmh+aNCUuiNYQjmL847lJ9vSCUx/VReuaFlgaQ+ehR6UhFF0s0oNlcvhpRWPH3tmYSU4zFlp7IFk661SGR6pwTJOm9yC3uTKCxmjPSfJDJiblkuSdoYgUyYpnVDSY7UiyZFf1H2dG1JgkscsVFsMsh3wWEt0hTLFCHldpHPa4SGB8khvhGFh8zGMwpvRJtb0BpZgXDbsBYvhOG2obhCqUlzckg7UzhHI518i80lFUQ2XGAc0CyRVSj5lw+kkM1MIU4RP6DCc0DV9w+o8BSC4+TlED2q+X2FlW7wEL5JVM4/u7/53A9VxA9hWsIIIYQQQgghhBBCCCGEEEIIIYQQQgghOPwDhx9CCdDcDFsAAAAASUVORK5CYII=';

  useEffect(() => {
  if (!socket) return;

  const onConnect = () => {
    setIsConnected(true);
    if (activeChat) {
      socket.emit('join_chats', [activeChat.chat_id]);
    }
  };

  const onDisconnect = () => {
    setIsConnected(false);
  };

  socket.on('connect', onConnect);
  socket.on('disconnect', onDisconnect);

  return () => {
    socket.off('connect', onConnect);
    socket.off('disconnect', onDisconnect);
  };
}, [socket, activeChat]);

useEffect(() => {
  if (!activeChat || !socket) return;

  // Load initial messages
  loadMessages();

  // Setup typing listener
  const typingInterval = setupTypingListener();

  // Message listener
  const handleNewMessage = (message) => {
    if (message.chat_id === activeChat.chat_id) {
      setMessages(prev => [...prev, message]);
      scrollToBottom();
    }
  };

  // Join chat room
  socket.emit('join_chats', [activeChat.chat_id]);

  // Add listeners
  socket.on('newMessage', handleNewMessage);

  // Cleanup
  return () => {
    clearInterval(typingInterval);
    socket.off('newMessage', handleNewMessage);
    socket.emit('leave_chats', [activeChat.chat_id]);
  };
}, [activeChat, socket]); // Add socket to dependencies

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
  if (!newMessage.trim() || !socket?.connected) return;
  
  try {
    const message = {
      chat_id: activeChat.chat_id,
      message_text: newMessage,
      user_id: getUserId()
    };
    
    // First send to API
    const apiResponse = await sendMessage(message);
    
    if (apiResponse.success) {
      // Then emit via socket
      socket.emit('sendMessage', message, (socketResponse) => {
        if (!socketResponse.success) {
          console.error('Socket failed but API succeeded:', socketResponse.error);
        }
      });
      
      setNewMessage('');
    } else {
      console.error('Failed to send message via API:', apiResponse.error);
    }
    
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
                <span className="connection-status">
              {socket?.connected ? '🟢' : '🔴'}
            </span>
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
