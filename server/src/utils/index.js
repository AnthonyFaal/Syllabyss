// index.js inside /utils
const { validateEntity } = require('./validator');
const BaseRepository = require('../repository/baseRepository');
const generateCourseThumbnail = require('./generateThumbnail');
const {generateDeadline} = require("./deadlineGenerator");

module.exports = {
  validateEntity,
  BaseRepository,
  generateCourseThumbnail,
  generateDeadline,
};
