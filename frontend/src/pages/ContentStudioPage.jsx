// pages/Collaboration.js
import React, { useEffect, useState } from "react";
import "./Collaboration.css";
import {
  getPublicChats,
  getUserChats,
  createChat,
  joinChat
} from '../api/APIs'; 
import PageLoader from "../components/Loader/pageLoader";
import ChatPanel from "../components/ChatPanel/ChatPanel";
import { getUserId } from "../utils/authToken";
import { formatLastActiveTime } from '../utils/global';
import io from 'socket.io-client';

const Collaboration = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('myGroups'); // 'myGroups' or 'generalChats'
  const [chatData, setChatData] = useState({
    myGroups: {
      success: true,
      data: []
    },
    generalChats: {
      success: true,
      data: []
    }
  });
  const [activeChat, setActiveChat] = useState(null);
  const [showCreateChat, setShowCreateChat] = useState(false);
  const [newChatName, setNewChatName] = useState('');
  const [newChatAvatar, setNewChatAvatar] = useState('');
  const [socket, setSocket] = useState(null);

  const defaultAvatar = 'https://cdn-icons-png.flaticon.com/512/565/565547.png';

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io('http://localhost:4000');
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!socket) return;

    // Listen for chat updates
    socket.on('chatUpdate', (updatedChat) => {
      setChatData(prev => {
        const updateChatInList = (list) => {
          if (!list.data?.data) return list;
          return {
            ...list,
            data: {
              ...list.data,
              data: list.data.data.map(chat => 
                chat.chat_id === updatedChat.chat_id ? updatedChat : chat
              )
            }
          };
        };

        return {
          myGroups: updateChatInList(prev.myGroups),
          generalChats: updateChatInList(prev.generalChats)
        };
      });

      // Update active chat if it's the one being updated
      if (activeChat && activeChat.chat_id === updatedChat.chat_id) {
        setActiveChat(updatedChat);
      }
    });

    // Listen for new messages
    socket.on('newMessage', (message) => {
      setChatData(prev => {
        const updateChatWithNewMessage = (list) => {
          if (!list.data?.data) return list;
          return {
            ...list,
            data: {
              ...list.data,
              data: list.data.data.map(chat => {
                if (chat.chat_id === message.chat_id) {
                  return {
                    ...chat,
                    last_message: message
                  };
                }
                return chat;
              })
            }
          };
        };

        return {
          myGroups: updateChatWithNewMessage(prev.myGroups),
          generalChats: updateChatWithNewMessage(prev.generalChats)
        };
      });
    });

    return () => {
      socket.off('chatUpdate');
      socket.off('newMessage');
    };
  }, [socket, activeChat]);

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const [myGroups, generalChats] = await Promise.all([
          getUserChats(getUserId()),
          getPublicChats()
        ]);
        
        setChatData({
          myGroups: myGroups,
          generalChats: generalChats
        });

        // Set the first chat as active by default if available
        if (myGroups.data?.data?.length > 0) {
          setActiveChat(myGroups.data.data[0]);
        }
      } catch (error) {
        console.error("Failed to load chats:", error);
        setChatData({
          myGroups: {
            success: false,
            data: []
          },
          generalChats: {
            success: false,
            data: []
          }
        });
      } finally {
        setLoading(false);
      }
    };

    fetchChats();
  }, []);

  const handleCreateChat = async () => {
    try {
      const result = await createChat({
        chat_name: newChatName,
        profile_image: newChatAvatar || defaultAvatar,
        is_private: false
      });
      
      // Add the new chat to both myGroups and generalChats if it's public
      setChatData(prev => ({
        ...prev,
        myGroups: {
          ...prev.myGroups,
          data: {
            ...prev.myGroups.data,
            data: [...(prev.myGroups.data?.data || []), result.data]
          }
        },
        generalChats: {
          ...prev.generalChats,
          data: {
            ...prev.generalChats.data,
            data: [...(prev.generalChats.data?.data || []), result.data]
          }
        }
      }));
      
      setNewChatName('');
      setNewChatAvatar('');
      setShowCreateChat(false);
      setActiveChat(result.data);

      // Emit socket event for new chat
      if (socket) {
        socket.emit('newChat', result.data);
      }
    } catch (error) {
      console.error("Failed to create chat:", error);
    }
  };

  const handleJoinChat = async (chatId) => {
    try {
      await joinChat(chatId, getUserId());
      
      // Update the chat lists
      const [myGroups, generalChats] = await Promise.all([
        getUserChats(getUserId()),
        getPublicChats()
      ]);
      
      setChatData({
        myGroups: myGroups,
        generalChats: generalChats
      });
      
      // Set the joined chat as active
      const joinedChat = generalChats.data?.data?.find(chat => chat.chat_id === chatId);
      if (joinedChat) {
        setActiveChat(joinedChat);
      }

      // Emit socket event for joining chat
      if (socket) {
        socket.emit('joinChat', { chatId, userId: getUserId() });
      }
    } catch (error) {
      console.error("Failed to join chat:", error);
    }
  };

  const isMemberOfChat = (chatId) => {
    return chatData.myGroups.data?.data?.some(chat => chat.chat_id === chatId);
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="collaboration-container">
      <div className="chat-list-container">
        <div className="sidebar-header">
          <div className="chat-tabs">
            <button 
              className={`tab-button ${activeTab === 'myGroups' ? 'active' : ''}`}
              onClick={() => setActiveTab('myGroups')}
              title="My Groups"
            >
              👥
            </button>
            <button 
              className={`tab-button ${activeTab === 'generalChats' ? 'active' : ''}`}
              onClick={() => setActiveTab('generalChats')}
              title="General Chats"
            >
              🌐
            </button>
          </div>
          <button 
            className="create-chat-btn"
            onClick={() => setShowCreateChat(!showCreateChat)}
            title="Create new chat"
          >
            {showCreateChat ? '×' : '+'}
          </button>
        </div>
        
        {showCreateChat && (
          <div className="create-chat-form">
            <div className="avatar-preview">
              <img 
                src={newChatAvatar || defaultAvatar} 
                alt="New chat avatar" 
                className="preview-avatar"
              />
            </div>
            <input
              type="text"
              value={newChatAvatar}
              onChange={(e) => setNewChatAvatar(e.target.value)}
              placeholder="Paste avatar image URL"
            />
            <input
              type="text"
              value={newChatName}
              onChange={(e) => setNewChatName(e.target.value)}
              placeholder="Enter chat name"
            />
            <button onClick={handleCreateChat}>Create Chat</button>
          </div>
        )}
        
        <div className="chat-list">
          {activeTab === 'myGroups' ? (
            Array.isArray(chatData.myGroups.data?.data) && chatData.myGroups.data.data.length > 0 ? (
              chatData.myGroups.data.data.map(chat => (
                <div 
                  key={chat.chat_id} 
                  className={`chat-card ${activeChat?.chat_id === chat.chat_id ? 'active' : ''}`}
                  onClick={() => setActiveChat(chat)}
                >
                  <img 
                    src={chat.profile_image || defaultAvatar} 
                    alt={chat.chat_name} 
                    className="chat-avatar"
                  />
                  <div className="chat-details">
                    <h3>{chat.chat_name}</h3>
                    <p className="last-message">
                     {chat.last_message?.message_text
                      ? chat.last_message.message_text.length > 20
                        ? chat.last_message.message_text.slice(0, 20) + '...'
                        : chat.last_message.message_text
                      : 'No messages yet'}

                    </p>
                    <p className="last-active">
                       {formatLastActiveTime(chat.last_message?.timestamp || chat.joined_at)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-chats">
                <img src={defaultAvatar} alt="No chats" className="no-chats-icon" />
                <p>No Groups yet</p>
                <p>Create one to get started!</p>
              </div>
            )
          ) : (
            Array.isArray(chatData.generalChats.data?.data) && chatData.generalChats.data.data.length > 0 ? (
              chatData.generalChats.data.data.map(chat => (
                <div 
                  key={chat.chat_id} 
                  className={`chat-card ${activeChat?.chat_id === chat.chat_id ? 'active' : ''}`}
                  onClick={() => isMemberOfChat(chat.chat_id) ? setActiveChat(chat) : null}
                >
                  <img 
                    src={chat.profile_image || defaultAvatar} 
                    alt={chat.chat_name} 
                    className="chat-avatar"
                  />
                  <div className="chat-details">
                    <h3>{chat.chat_name}</h3>
                    <p className="last-message">
                     {chat.last_message?.message_text
                      ? chat.last_message.message_text.length > 20
                        ? chat.last_message.message_text.slice(0, 20) + '...'
                        : chat.last_message.message_text
                      : 'No messages yet'}

                    </p>
                    <p className="last-active">
                      {formatLastActiveTime(chat.last_message?.timestamp || chat.joined_at)}
                    </p>
                    {!isMemberOfChat(chat.chat_id) && (
                      <button className="join-chat-btn" onClick={(e) => {
                        e.stopPropagation();
                        handleJoinChat(chat.chat_id);
                      }}>
                        Join
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="no-chats">
                <img src={defaultAvatar} alt="No chats" className="no-chats-icon" />
                <p>No public chats found</p>
                <p>Create one to get started!</p>
              </div>
            )
          )}
        </div>
      </div>
      
      <div className="chat-panel-container">
        {activeChat ? (
          <ChatPanel activeChat={activeChat} socket={socket} />
        ) : (
          <div className="no-chat-selected">
            <img src={defaultAvatar} alt="Select a chat" className="welcome-avatar" />
            <h3>Select a chat to start collaborating</h3>
            <p>Or create/join one to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Collaboration;