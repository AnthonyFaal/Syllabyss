import React, { useState, useEffect } from 'react';
import {
  createEvent,
  getChatEvents,
  registerForEvent,
  getEventParticipants,
  postEventMessage,
  getEventMessages
} from '../../api/APIs';
import { getUserId } from '../../utils/authToken';
import {
  FaCalendarPlus, FaUserPlus, FaComment, FaClock,
  FaUsers, FaCalendarAlt, FaTrophy, FaLightbulb,
  FaCode, FaEye, FaQuestion
} from 'react-icons/fa';
import { MdEventAvailable, MdEventBusy } from 'react-icons/md';
import './EventsTab.css';

const EventsTab = ({ chatId }) => {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [participants, setParticipants] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [joiningEventId, setJoiningEventId] = useState(null);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    event_type: 'study_session',
    start_time: '',
    end_time: '',
    max_participants: null
  });

  const eventTypes = [
    { value: 'study_session', label: 'Study Session' },
    { value: 'group_project', label: 'Group Project' },
    { value: 'quiz_competition', label: 'Quiz Competition' },
    { value: 'brainstorming', label: 'Brainstorming' },
    { value: 'pair_programming', label: 'Pair Programming' },
    { value: 'code_review', label: 'Code Review' },
    { value: 'qna_session', label: 'Q&A Session' }
  ];

  useEffect(() => {
    if (chatId) {
      loadEvents();
    }
  }, [chatId]);

  useEffect(() => {
    if (selectedEvent) {
      loadEventDetails(selectedEvent.event_id);
    }
  }, [selectedEvent]);

  const loadEvents = async () => {
    try {
      const result = await getChatEvents(chatId);
      setEvents(result.data?.events || []);
    } catch (error) {
      console.error('Failed to load events:', error);
    }
  };

 const loadEventDetails = async (eventId) => {
  try {
    const [messagesRes, participantsRes] = await Promise.all([
      getEventMessages(eventId),
      getEventParticipants(eventId)
    ]);
    const safeMessages = Array.isArray(messagesRes.data?.messages) ? messagesRes.data?.messages : [];
    const safeParticipants = Array.isArray(participantsRes.data?.participants)? participantsRes?.data.participants : [];

    setMessages(safeMessages);
    setParticipants(safeParticipants);
  } catch (error) {
    console.error('Failed to load event details:', error);
    setMessages([]);
    setParticipants([]);
  }
};


  const handleCreateEvent = async () => {
    try {
      await createEvent(chatId, newEvent);
      setShowCreateForm(false);
      setNewEvent({
        title: '',
        description: '',
        event_type: 'study_session',
        start_time: '',
        end_time: '',
        max_participants: null
      });
      loadEvents();
    } catch (error) {
      console.error('Failed to create event:', error);
    }
  };

  const handleJoinEvent = async (eventId) => {
    try {
      setJoiningEventId(eventId); // Show loader
      await registerForEvent(eventId, getUserId());
      await loadEventDetails(eventId); // Refresh participants/messages
    } catch (error) {
      console.error('Failed to join event:', error);
    } finally {
      setJoiningEventId(null); // Reset loader
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    try {
      await postEventMessage(selectedEvent.event_id, {
        message_text: newMessage
      });
      setNewMessage('');
      loadEventDetails(selectedEvent.event_id);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const formatDate = (dateString) => {
    const options = {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const getEventIcon = (type) => {
    switch (type) {
      case 'study_session': return <FaCalendarAlt />;
      case 'group_project': return <FaUsers />;
      case 'quiz_competition': return <FaTrophy />;
      case 'brainstorming': return <FaLightbulb />;
      case 'pair_programming': return <FaCode />;
      case 'code_review': return <FaEye />;
      case 'qna_session': return <FaQuestion />;
      default: return <FaCalendarAlt />;
    }
  };

  const isParticipant = () => {
  const currentUserId = String(getUserId());
  return Array.isArray(participants) && participants.some(
    (p) => String(p.user_id) === currentUserId
  );
};

  return (
    <div className="events-container">
      {!selectedEvent ? (
        <>
          <div className="events-header">
            <h3>Upcoming Events</h3>
            <button
              className="create-event-btn"
              onClick={() => setShowCreateForm(true)}
            >
              <FaCalendarPlus /> Create Event
            </button>
          </div>

          {showCreateForm && (
            <div className="create-event-form">
              <h4>Create New Event</h4>
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  placeholder="Event title"
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  placeholder="Event description"
                />
              </div>
              <div className="form-row">
              <div className="form-group">
                <label>Type</label>
                <select
                  value={newEvent.event_type}
                  onChange={(e) => setNewEvent({ ...newEvent, event_type: e.target.value })}
                >
                  {eventTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Max Participants</label>
                <input
                  type="number"
                  min="1"
                  value={newEvent.max_participants || ''}
                  onChange={(e) => setNewEvent({
                    ...newEvent,
                    max_participants: e.target.value ? parseInt(e.target.value) : null
                  })}
                />
              </div>
              </div>
            
              <div className="form-row">
                <div className="form-group">
                  <label>Start Time</label>
                  <input
                    type="datetime-local"
                    value={newEvent.start_time}
                    onChange={(e) => setNewEvent({ ...newEvent, start_time: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>End Time</label>
                  <input
                    type="datetime-local"
                    value={newEvent.end_time}
                    onChange={(e) => setNewEvent({ ...newEvent, end_time: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-actions">
                <button
                  className="cancel-btn"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </button>
                <button
                  className="create-btn"
                  onClick={handleCreateEvent}
                  disabled={!newEvent.title || !newEvent.start_time}
                >
                  Create Event
                </button>
              </div>
            </div>
          )}

          <div className="events-list">
            {Array.isArray(events) && events.length > 0 ? (
              events.map(event => (
                <div
                  key={event.event_id}
                  className="event-card"
                  onClick={() => setSelectedEvent(event)}
                >
                  <div className="event-icon">{getEventIcon(event.event_type)}</div>
                  <div className="event-details">
                    <h4>{event.title}</h4>
                    <div className="event-meta">
                      <span className="event-type">{eventTypes.find(t => t.value === event.event_type)?.label}</span>
                      <span className="event-time"><FaClock /> {formatDate(event.start_time)}</span>
                    </div>
                  </div>
                  <div className="event-status">
                    {event.status === 'completed'
                      ? <MdEventBusy className="completed-icon" />
                      : <MdEventAvailable className="upcoming-icon" />
                    }
                  </div>
                </div>
              ))
            ) : (
              <div className="no-events"><p>No events scheduled yet</p></div>
            )}
          </div>
        </>
      ) : (
        <div className="event-detail-view">
          <div className="event-detail-header">
            <button className="back-button" onClick={() => setSelectedEvent(null)}>← Back</button>
            <h3>{selectedEvent.title}</h3>
            <div className="event-header-meta">
              <span className={`event-status ${selectedEvent.status}`}>
                {selectedEvent.status.charAt(0).toUpperCase() + selectedEvent.status.slice(1)}
              </span>
              {!isParticipant() && (
                <button
                  className="join-event-btn"
                  onClick={() => handleJoinEvent(selectedEvent.event_id)}
                  disabled={joiningEventId === selectedEvent.event_id}
                >
                  {joiningEventId === selectedEvent.event_id ? (
                    <>
                      <span className="loader-spinner"></span> Joining...
                    </>
                  ) : (
                    <>
                      <FaUserPlus /> Join Event
                    </>
                  )}
                </button>
              )}

            </div>
          </div>

          <div className="event-main-content">
            {/* Event Info */}
            <div className="event-info-section">
              <div className="event-icon-large">{getEventIcon(selectedEvent.event_type)}</div>
              <div className="event-description"><p>{selectedEvent.description}</p></div>
              <div className="event-time-info">
                <div className="time-block"><strong>Start:</strong> <span>{formatDate(selectedEvent.start_time)}</span></div>
                {selectedEvent.end_time && (
                  <div className="time-block"><strong>End:</strong> <span>{formatDate(selectedEvent.end_time)}</span></div>
                )}
              </div>
              {selectedEvent.max_participants && (
                <div className="participants-info">
                  <FaUsers /> {participants.length}/{selectedEvent.max_participants} participants
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="event-messages-section">
              <div className="messages-container">
                  {Array.isArray(messages) && messages.length > 0 ? (
                    messages.map(msg => {
                      const isCurrentUser = msg.isCurrentUser; // This should come from backend
                      const isSystem = msg.is_system_message;

                      return (
                        <div
                          key={msg.message_id}
                          className={`message-bubble ${isSystem ? 'system' : isCurrentUser ? 'right' : 'left'}`}
                        >
                          {!isSystem && (
                            <div className="message-meta">
                              <span className="username">{msg.username}</span>
                              <span className="timestamp">
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          )}
                          <div className="message-content">
                            {msg.content}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p>No messages yet.</p>
                  )}
              </div>
              {isParticipant() && (
                <div className="message-input-container">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Send a message about this event..."
                  />
                  <button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                    <FaComment /> Send
                  </button>
                </div>
              )}
            </div>

            {/* Participants */}
            <div className="event-participants-section">
              <h4>Participants ({participants.length})</h4>
              <div className="participants-list">
                {Array.isArray(participants) && participants.length > 0 ? (
                  participants.map((p) => (
                    <div key={p.participant_id} className="participant-card">
                      <div className="participant-avatar">
                        {/* Optional: Add avatar/profile logic if you store it */}
                        <div className="initials-avatar">{p.username?.[0]?.toUpperCase()}</div>
                      </div>
                      <div className="participant-info">
                        <strong>{p.username}</strong>
                      </div>
                    </div>
                  ))
                ) : (
                  <p>No participants yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventsTab;
