const express = require("express");
const { WebSocketServer } = require("ws");
const fs = require("fs");
const WebSocket = require("ws");

// Make wss available globally so relay handler can use it
let wss;

// Relay variables
let relay;
let relayConnected = false;

// Connect to private relay
function connectRelay() {
  console.log("Connecting to private relay...");

  // IMPORTANT: Correct relay URL (grreens with 3 R's)
  relay = new WebSocket("wss://grreens-relay.onrender.com/");

  relay.on("open", () => {
    relayConnected = true;
    console.log("Connected to private relay");
  });

  relay.on("close", () => {
    relayConnected = false;
    console.log("Relay disconnected, retrying in 5 seconds...");
    setTimeout(connectRelay, 5000);
  });

  relay.on("error", () => {
    relayConnected = false;
  });

  // Relay → Players broadcast
  relay.on("message", (msg) => {
    if (!wss) return; // Prevent crash if relay fires early

    for (let client of wss.clients) {
      if (client.readyState === 1) {
        client.send(msg);
      }
    }
  });
}

connectRelay();

// Load config
const config = JSON.parse(fs.readFileSync("config.json"));
const app = express();

app.use(express.static("public"));

// Start HTTP server
const server = app.listen(process.env.PORT || config.port, () => {
  console.log("EaglerX Enhanced Server running on port " + (process.env.PORT || config.port));
});

// Create WebSocket server AFTER relay handler exists
wss = new WebSocketServer({ server });

// Player data
let players = new Map();

// Player connection handler
wss.on("connection", (ws) => {
  console.log("Player connected");

  ws.send(JSON.stringify({
    type: "motd",
    text: config.motd
  }));

  players.set(ws, {
    rewindBuffer: [],
    lastUpdate: Date.now()
  });

  ws.on("message", (msg) => {
    let data;
    try {
      data = JSON.parse(msg);
    } catch {
      return;
    }

    // Forward to relay
    if (relayConnected) {
      relay.send(msg);
    }

    // Rewind buffer
    if (config.enableRewind) {
      const p = players.get(ws);
      p.rewindBuffer.push({ data, time: Date.now() });

      if (p.rewindBuffer.length > config.rewindSeconds * 20) {
        p.rewindBuffer.shift();
      }
    }

    // Broadcast to other players
    for (let client of wss.clients) {
      if (client !== ws && client.readyState === 1) {
        client.send(msg);
      }
    }
  });

  ws.on("close", () => {
    console.log("Player disconnected");
    players.delete(ws);
  });
});
