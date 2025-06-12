const moment = require('moment');

/**
 * Generates a user-friendly, achievable deadline.
 * @param {Object} options
 * @param {Date} options.startDate - Base date (default: now)
 * @param {String} options.durationType - 'course', 'module', or 'material'
 * @param {Number} options.durationValue - Estimated time to complete (minutes)
 * @param {String} options.durationUnit - Unit for durationValue (expected: 'minutes')
 * @param {String} options.strategy - 'simple', 'progressive', 'custom', or 'realistic'
 * @param {Number} options.complexityFactor - Optional multiplier
 * @returns {Date}
 */
const generateDeadline = (options = {}) => {
  const {
    startDate = new Date(),
    durationType = 'material',
    durationValue = 60, // default estimated time in minutes
    durationUnit = 'minutes',
    strategy = 'realistic', // use 'realistic' for HCI/UX-aware strategy
    complexityFactor = 1
  } = options;

  if (!durationValue || durationValue <= 0) {
    throw new Error('Duration value must be a positive number');
  }

  let deadline = moment(startDate);

  let bufferMinutes;

  if (strategy === 'realistic') {
    switch (durationType) {
      case 'course':
        if (durationValue <= 5) {
          bufferMinutes = 30;
        } else if (durationValue <= 30) {
          bufferMinutes = durationValue + 30;
        } else if (durationValue <= 120) {
          bufferMinutes = durationValue * 2;
        } else {
          bufferMinutes = durationValue * 3;
        }
        break;

      case 'module':
        if (durationValue <= 10) {
          bufferMinutes = 20;
        } else {
          bufferMinutes = durationValue * 1.5;
        }
        break;

      case 'material':
      default:
        if (durationValue <= 5) {
          bufferMinutes = 10;
        } else {
          bufferMinutes = durationValue * 1.2;
        }
        break;
    }
  } else {
    // fallback to previous strategies
    switch (strategy) {
      case 'simple':
        bufferMinutes = durationValue * complexityFactor;
        break;

      case 'progressive':
        const progressiveFactor = {
          course: 1.5,
          module: 1.2,
          material: 1
        }[durationType] || 1;
        bufferMinutes = durationValue * complexityFactor * progressiveFactor;
        break;

      case 'custom':
        if (durationType === 'course') {
          // converting weeks to minutes
          bufferMinutes = durationValue * complexityFactor * 7 * 24 * 60;
        } else if (durationType === 'module') {
          // converting days to minutes
          bufferMinutes = durationValue * complexityFactor * 24 * 60;
        } else {
          bufferMinutes = durationValue * complexityFactor;
        }
        break;

      default:
        throw new Error(`Unknown strategy: ${strategy}`);
    }
  }

  // Cap bufferMinutes to 24 hours max (1440 minutes)
  bufferMinutes = Math.min(bufferMinutes, 1440);

  deadline.add(bufferMinutes, 'minutes');

  // Round to next hour for better clarity
  deadline.minute(0).second(0).millisecond(0).add(1, 'hour');

  return deadline.toDate();
};

module.exports = {
  generateDeadline
};
