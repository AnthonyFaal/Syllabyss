const { validateEntity, BaseRepository } = require('../utils/index');
const { getIO } = require('../config/socket');

class EventController {
  constructor() {
    this.eventRepo = new BaseRepository('chat_events', 'event_id');
    this.eventParticipantRepo = new BaseRepository('event_participants', 'participant_id');
    this.eventMessageRepo = new BaseRepository('event_messages', 'message_id');
    this.chatMemberRepo = new BaseRepository('chat_members', 'chat_member_id');
    this.userRepo= new BaseRepository('users', "user_id")

    this.createEvent = this.createEvent.bind(this);
    this.getChatEvents = this.getChatEvents.bind(this);
    this.updateEvent = this.updateEvent.bind(this);
    this.deleteEvent = this.deleteEvent.bind(this);
    this.registerForEvent = this.registerForEvent.bind(this);
    this.getEventParticipants = this.getEventParticipants.bind(this);
    this.updateParticipantStatus = this.updateParticipantStatus.bind(this);
    this.postEventMessage = this.postEventMessage.bind(this);
    this.getEventMessages = this.getEventMessages.bind(this);
  }

  createEvent = async (req, res) => {
    try {
      const { chat_id } = req.params;
      const created_by = req.user.id;
      const eventData = req.body;
      console.log(eventData);

      validateEntity(eventData, 'event', 'create');

      const isMember = await this.chatMemberRepo.getOne({ chat_id, user_id: created_by });
      if (!isMember) return res.status(403).json({ success: false, message: 'Not a chat member' });

      const event = await this.eventRepo.create({ ...eventData, chat_id, created_by, status: 'upcoming' });
      await this.eventParticipantRepo.create({ event_id: event.event_id, user_id: created_by, chat_member_id: isMember.chat_member_id, status: 'registered' });

      getIO().to(`chat_${chat_id}`).emit('event_created', event);
      res.status(201).json({ success: true, event });

    } catch (error) {
      console.error('Create event error:', error);
      res.status(500).json({ success: false, message: 'Failed to create event' });
    }
  };

  getChatEvents = async (req, res) => {
    try {
      const { chat_id } = req.params;
      const { status } = req.query;
      const events = await this.eventRepo.getAll(status ? { chat_id, status } : { chat_id });
      res.json({ success: true, events });
    } catch (error) {
      console.error('Get events error:', error);
      res.status(500).json({ success: false, message: 'Failed to get events' });
    }
  };

  updateEvent = async (req, res) => {
    try {
      const { event_id } = req.params;
      const updates = req.body;

      validateEntity(updates, 'event', 'update');
      const event = await this.eventRepo.getById(event_id);
      if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

      delete updates.chat_id;
      delete updates.created_by;

      const updatedEvent = await this.eventRepo.update(event_id, updates);
      getIO().to(`chat_${event.chat_id}`).emit('event_updated', updatedEvent);
      res.json({ success: true, event: updatedEvent });

    } catch (error) {
      console.error('Update event error:', error);
      res.status(500).json({ success: false, message: 'Failed to update event' });
    }
  };

  deleteEvent = async (req, res) => {
    try {
      const { event_id } = req.params;
      const event = await this.eventRepo.getById(event_id);
      if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

      await this.eventParticipantRepo.deleteWhere('event_id', [event_id]);
      await this.eventRepo.delete(event_id);

     getIO().to(`chat_${event.chat_id}`).emit('event_deleted', { event_id });
      res.json({ success: true, message: 'Event deleted successfully' });

    } catch (error) {
      console.error('Delete event error:', error);
      res.status(500).json({ success: false, message: 'Failed to delete event' });
    }
  };

  registerForEvent = async (req, res) => {
    try {
      const { event_id } = req.params;
      const user_id = req.user.id;

      console.log(`➡️ Attempting registration`);
      console.log(`➡️ user_id: ${user_id}`);
      console.log(`➡️ event_id: ${event_id}`);

      const event = await this.eventRepo.getById(event_id);
      console.log("✅ Event fetched:", event);

      if (!event) {
        console.warn("❌ Event not found");
        return res.status(404).json({ success: false, message: 'Event not found' });
      }

      const exists = await this.eventParticipantRepo.getOne({ event_id, user_id });
      console.log("🔁 Existing registration check:", exists);

      if (exists) {
        console.warn("❌ User already registered");
        return res.status(400).json({ success: false, message: 'Already registered' });
      }

      const chatMember = await this.chatMemberRepo.getOne({ chat_id: event.chat_id, user_id });
      console.log("👥 Chat membership check:", chatMember);

      if (!chatMember) {
        console.warn("❌ User is not a chat member");
        return res.status(403).json({ success: false, message: 'Not a chat member' });
      }

      if (event.max_participants) {
        const count = await this.eventParticipantRepo.count({ event_id });
        console.log(`👥 Participant count: ${count}/${event.max_participants}`);

        if (count >= event.max_participants) {
          console.warn("❌ Max participants reached");
          return res.status(400).json({ success: false, message: 'Max participants reached' });
        }
      }

      const registration = await this.eventParticipantRepo.create({
        event_id,
        user_id,
        chat_member_id: chatMember.chat_member_id,
        status: 'registered'
      });

      console.log("✅ Registration successful:", registration);

      getIO().to(`chat_${event.chat_id}`).emit('event_registration', {
        event_id,
        user_id,
        action: 'registered'
      });

      res.status(201).json({ success: true, registration });

    } catch (error) {
      console.error('❌ Register event error:', error.stack || error);
      res.status(500).json({ success: false, message: 'Failed to register' });
    }
  };

  getEventParticipants = async (req, res) => {
    try {
      const { event_id } = req.params;
      const { status } = req.query;
      
      // First get all participants for the event
      const participants = await this.eventParticipantRepo.getAll(
        status ? { event_id, status } : { event_id }
      );

      // Then fetch user details for each participant
      const participantsWithUsers = await Promise.all(
        participants.map(async (participant) => {
          const user = await this.userRepo.getById(participant.user_id);
          return {
            ...participant,
            username: user.name, 
          };
        })
      );

      res.json({ 
        success: true, 
        participants: participantsWithUsers 
      });

    } catch (error) {
      console.error('Get participants error:', error);
      res.status(500).json({ success: false, message: 'Failed to get participants' });
    }
  };

  updateParticipantStatus = async (req, res) => {
    try {
      const { participant_id } = req.params;
      const { status } = req.body;

      validateEntity({ status }, 'eventParticipant', 'update');

      const participant = await this.eventParticipantRepo.getById(participant_id);
      if (!participant) return res.status(404).json({ success: false, message: 'Participant not found' });

      const event = await this.eventRepo.getById(participant.event_id);
      const updated = await this.eventParticipantRepo.update(participant_id, { status });

      getIO().to(`chat_${event.chat_id}`).emit('participant_status_updated', updated);
      res.json({ success: true, participant: updated });

    } catch (error) {
      console.error('Update participant error:', error);
      res.status(500).json({ success: false, message: 'Failed to update participant' });
    }
  };

  postEventMessage = async (req, res) => {
    try {
      const { event_id } = req.params;
      const user_id = req.user.id;
      const { message_text, is_system_message = false, chat_member_id=user_id} = req.body;

      validateEntity({ event_id, content: message_text, is_system_message,  chat_member_id }, 'eventMessage', 'create');

      if (!is_system_message) {
        const isParticipant = await this.eventParticipantRepo.getOne({ event_id, user_id });
        if (!isParticipant) return res.status(403).json({ success: false, message: 'Not a participant' });
      }

      const event = await this.eventRepo.getById(event_id);
      const message = await this.eventMessageRepo.create({ event_id, content: message_text, is_system_message,  chat_member_id });

     getIO().to(`chat_${event.chat_id}`).emit('event_message', message);
      res.status(201).json({ success: true, message });

    } catch (error) {
      console.error('Post event message error:', error);
      res.status(500).json({ success: false, message: 'Failed to post message' });
    }
  };

  getEventMessages = async (req, res) => {
    try {
      const { event_id } = req.params;
      const userId = req.user.id;
      const messages = await this.eventMessageRepo.getAll({ event_id });

      const messagesWithUsers = await Promise.all(
        messages.map(async (message) => {
          let username = 'System';
          let isCurrentUser = false;

          if (message.chat_member_id) {
            const user = await this.userRepo.getById(message.chat_member_id);
            if (user) {
              isCurrentUser = user.user_id === userId;
              username = isCurrentUser ? 'You' : user.name;
            } else {
              username = 'Unknown User';
            }
          }   

          return {
            ...message,
            username,
            isCurrentUser
          };
        })
      );

      res.json({ 
        success: true, 
        messages: messagesWithUsers 
      });

    } catch (error) {
      console.error('Get event messages error:', error);
      res.status(500).json({ success: false, message: 'Failed to get messages' });
    }
  };

}

module.exports = new EventController();
