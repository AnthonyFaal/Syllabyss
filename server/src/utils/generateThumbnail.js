const { createCanvas } = require('canvas');
const { uploadFileBuffer } = require('./cloudinary'); // Path to your Cloudinary upload function

async function generateCourseThumbnail(course) {
  const width = 600;
  const height = 300;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, width, height);

  // Title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px Arial';
  ctx.fillText(course.title, 20, 60);

  // Difficulty
  ctx.font = '20px Arial';
  ctx.fillStyle = '#00adb5';
  ctx.fillText(`Level: ${course.difficulty_level}`, 20, 110);

  // Duration
  ctx.fillStyle = '#eeeeee';
  ctx.fillText(`Duration: ${course.estimated_duration} min`, 20, 150);

  // Convert canvas to buffer
  const buffer = canvas.toBuffer('image/png');

  // Upload to Cloudinary
  const cloudinaryUrl = await uploadFileBuffer(buffer, 'course_thumbnails');
  return cloudinaryUrl;
}

module.exports = generateCourseThumbnail;
