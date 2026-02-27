const express = require("express");
const { WebSocketServer } = require("ws");
const fs = require("fs");

// Load config
const config = JSON.parse(fs.readFileSync("config.json"));
const app = express();

app.use(express.static("public"));

// Start HTTP server
const server = app.listen(process.env.PORT || config.port, () => {
  console.log("EaglerX Enhanced Server running on port " + (process.env.PORT || config.port));
});

// Create WebSocket server
const wss = new WebSocketServer({ server });

// Player data
let players = new Map();

// Player connection handler
wss.on("connection", (ws) => {
  console.log("Player connected");

  // Send MOTD
  ws.send(JSON.stringify({
    type: "motd",
    text: config.motd
  }));

  // Track player rewind data
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
