const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { ethers } = require('ethers');
const abi = require('./abi.json');
const Stripe = require('stripe');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.raw({ type: 'application/json' }));

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, abi, wallet);

const bronzeURI = 'ipfs://bafkreif3uebizni7me5cxw53h6mhkpsyqv32kmx2pcu3t45roamsd74va4';
const silverURI = 'ipfs://bafkreibbv2t2d5scvwipyhysutmwraqctiu5ud2t6w7kdmsn4mhpga7pci';
const goldURI   = 'ipfs://bafkreiebozhtpyxn2fw2umyzgnqe62frwt4ztfgwkppkvmlr3jbum3wt5a';

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

app.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    const walletField = session.custom_fields?.find(f => f.key === 'Wallet');
    const recipient = walletField?.text?.value;

    const amountPaid = session.amount_total; // 💡 Keep in cents
    console.log(`💳 Payment received: $${amountPaid / 100}`);
    console.log(`👛 Wallet to mint to: ${recipient}`);

    if (!recipient || !ethers.isAddress(recipient)) {
      console.error('❌ Invalid or missing wallet address');
      return res.status(400).end();
    }

    let tokenURI;
    if (amountPaid === 10000) tokenURI = bronzeURI;
    else if (amountPaid === 25000) tokenURI = silverURI;
    else if (amountPaid === 50000) tokenURI = goldURI;
    else {
      console.error('❌ Unknown payment amount');
      return res.status(400).end();
    }

    try {
      const tx = await contract.safeMint(recipient, tokenURI);
      console.log(`✅ Minted NFT for ${recipient}: ${tokenURI}`);
      console.log(`🔗 TX: ${tx.hash}`);
    } catch (err) {
      console.error('❌ Minting failed:', err);
      return res.status(500).end();
    }
  }

  res.status(200).end();
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
