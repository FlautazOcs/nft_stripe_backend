const express = require("express");
const bodyParser = require("body-parser");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// Test route
app.get("/", (req, res) => {
  res.send("🎉 NFT Stripe backend is live!");
});

// Webhook route (placeholder)
app.post("/webhook", (req, res) => {
  // Stripe logic will go here later
  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
// Placeholder server file
