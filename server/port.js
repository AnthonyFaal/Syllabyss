const PORT = process.env.PORT || 4000;

// Use VERCEL_URL in production, fallback to localhost for dev
const HOST =
  process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : `http://localhost:${PORT}`;

module.exports = { HOST, PORT };
