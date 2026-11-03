const { Pool } = require('pg');
const dotenv = require('dotenv');  // Import dotenv to load environment variables

// Load environment variables from the .env file
dotenv.config();

// Ensure that the database URL is available
if (!process.env.POSTGRES_URL) {
  console.error("Error: POSTGRES_URL environment variable is not set.");
  process.exit(1);  // Exit the process if the URL is not set
}

// Initialize the PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  // Fail a request predictably instead of leaving the browser waiting for the
  // default driver timeout when the database is unavailable or saturated.
  connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS || 7000),
  query_timeout: Number(process.env.DB_QUERY_TIMEOUT_MS || 10000),
  statement_timeout: Number(process.env.DB_STATEMENT_TIMEOUT_MS || 10000),
  idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS || 30000),
  max: Number(process.env.DB_POOL_MAX || 10),
});

// Test the connection and log success or failure
pool
  .connect()
  .then(client => {
    console.log("Successfully connected to PostgreSQL database.");
    client.release();  // Release the client after successful connection
  })
  .catch(error => {
    console.error("Failed to connect to PostgreSQL database:", error.message);
    process.exit(1);  // Exit the process in case of failure
  });

// Export the pool as a module
module.exports = pool;
