/**
 * Formats a timestamp into human-readable relative time
 * @param {string|Date} timestamp - ISO timestamp or Date object
 * @returns {string} Formatted time string
 */
export const formatLastActiveTime = (timestamp) => {
  if (!timestamp) return 'Never';
  
  const now = new Date();
  const messageDate = new Date(timestamp);
  const diffInDays = Math.floor((now - messageDate) / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) {
    // Today - show time only
    return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffInDays === 1) {
    return 'Yesterday';
  } else if (diffInDays < 7) {
    return `${diffInDays} days ago`;
  } else {
    // Older than a week - show date
    return messageDate.toLocaleDateString();
  }
};

/**
 * Additional date utilities can be added here
 */
export const formatMessageTime = (timestamp) => {
  // Different formatting for message timestamps if needed
  return formatLastActiveTime(timestamp);
};