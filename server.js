const express = require("express");
const { WebSocketServer } = require("ws");
const fs = require("fs");
const WebSocket = require("ws");

let relay;
let relayConnected = false;

function connectRelay() {
  console.log("Connecting to private relay...");

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

  relay.on("message", (msg) => {
    for (let client of wss.clients) {
      if (client.readyState === 1) {
        client.send(msg);
      }
    }
  });
}

connectRelay();
