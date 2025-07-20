const express = require("express");
const bodyParser = require("body-parser");
const Stripe = require("stripe");
const { ethers } = require("ethers");
require("dotenv").config();

const app = express();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
const PORT = process.env.PORT || 3000;

const abi = [ // replace this with your full contract ABI
  "function safeMint(address to, string memory uri) public returns (uint256)"
];

const contractAddress = process.env.CONTRACT_ADDRESS;
const provider = new ethers.JsonRpcProvider("https://polygon-rpc.com");
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contract = new ethers.Contract(contractAddress, abi, wallet);

// Stripe raw body middleware for webhook verification
app.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  let event;

  try {
    const sig = req.headers["stripe-signature"];
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.sendStatus(400);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    // 👇 Customize product logic here
    const email = session.customer_email;
    const metadata = session.metadata || {};
    const walletAddress = metadata.wallet; // must be passed in from frontend
    const productId = session.display_items?.[0]?.custom?.name || "Unknown";

    let tokenURI;
    if (session.amount_total === 8000) tokenURI = "ipfs://bafkreigkklmr5jyc62osvw3eq6zg2rc4ptocibfryncek3oge4p33xujzq"; // Bronze
    else if (session.amount_total === 15000) tokenURI = "ipfs://bafkreie3isvhwhzn2yvg4eiuvzwbmnla3wwww5dd6gl233dx5hk3newbvy"; // Silver
    else if (session.amount_total === 25000) tokenURI = "ipfs://bafkreib2omhppf7wntque4xaal5wn37hr5mjbx36nxhmdeorsqmic4dayi"; // Gold

    if (walletAddress && tokenURI) {
      try {
        const tx = await contract.safeMint(walletAddress, tokenURI);
        await tx.wait();
        console.log(`✅ Minted NFT for ${walletAddress}`);
      } catch (err) {
        console.error("❌ Error minting NFT:", err);
      }
    } else {
      console.warn("Missing wallet address or token URI");
    }
  }

  res.sendStatus(200);
});

// Test route
app.get("/", (req, res) => {
  res.send("🎉 NFT Stripe backend is live!");
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
