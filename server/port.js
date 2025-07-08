// port.js
const os = require('os');

function getLocalIPAddress() {
  const interfaces = os.networkInterfaces();

  for (const interfaceName of Object.keys(interfaces)) {
    for (const iface of interfaces[interfaceName]) {
      // Skip over internal (i.e. 127.0.0.1) and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }

  return 'localhost'; // fallback
}

const HOST = getLocalIPAddress();
const PORT = process.env.PORT || 4000;

module.exports = { HOST, PORT };
