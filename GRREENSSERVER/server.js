const express = require("express");
const { WebSocketServer } = require("ws");
const fs = require("fs");

const config = JSON.parse(fs.readFileSync("config.json"));
const app = express();

app.use(express.static("public"));

const server = app.listen(process.env.PORT || config.port, () => {
  console.log("EaglerX Enhanced Server running on port " + (process.env.PORT || config.port));
});

const wss = new WebSocketServer({ server });

let players = new Map();

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

    if (config.enableRewind) {
      const p = players.get(ws);
      p.rewindBuffer.push({ data, time: Date.now() });

      if (p.rewindBuffer.length > config.rewindSeconds * 20) {
        p.rewindBuffer.shift();
      }
    }

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
