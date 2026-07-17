const WebSocket = require("ws");

// Store active connections per ticket
const ticketClients = new Map();
let wss;

const setupWebSocket = (server) => {
  wss = new WebSocket.Server({ server });

  wss.on("connection", (ws, req) => {
    console.log("Client connected");

    // Keep WebSocket alive
    ws.isAlive = true;

    ws.on("pong", () => {
      ws.isAlive = true;
    });

    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message);

        if (data.type === "subscribe" && data.ticketId) {
          if (!ticketClients.has(data.ticketId)) {
            ticketClients.set(data.ticketId, new Set());
          }
          ticketClients.get(data.ticketId).add(ws);
          ws.ticketId = data.ticketId;
          console.log(`User subscribed to ticket: ${data.ticketId}`);
        }
      } catch (error) {
        console.error("Invalid message format:", error);
      }
    });

    ws.on("close", () => {
      console.log("Client disconnected");

      if (ws.ticketId && ticketClients.has(ws.ticketId)) {
        ticketClients.get(ws.ticketId).delete(ws);

        // If no clients remain, remove the ticket entry
        if (ticketClients.get(ws.ticketId).size === 0) {
          ticketClients.delete(ws.ticketId);
        }
      }
    });

    ws.on("error", (err) => {
      console.error("WebSocket error:", err.message);
    });
  });

  // Ping clients every 30 seconds to keep connections alive
  setInterval(() => {
    wss.clients.forEach((client) => {
      if (!client.isAlive) {
        console.log("Terminating inactive client...");
        return client.terminate();
      }
      client.isAlive = false;
      client.ping();
    });
  }, 30000);

  console.log("✅ WebSocket server is running");
};

const broadcast = ({ ticketId, data }) => {
  console.log(`📢 Broadcasting to ticket ${ticketId}:`, data);

  if (ticketClients.has(ticketId)) {
    ticketClients.get(ticketId).forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  } else {
    console.log(`⚠️ No active WebSocket clients for ticket ${ticketId}`);
  }
};

module.exports = { setupWebSocket, broadcast };
