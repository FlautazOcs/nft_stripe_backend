const express = require('express');
const bodyParser = require('body-parser');
const { ethers } = require('ethers');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const abi = require('./abi.json');

const app = express();
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
const contractAddress = process.env.CONTRACT_ADDRESS;
const provider = new ethers.JsonRpcProvider('https://polygon-rpc.com');
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contract = new ethers.Contract(contractAddress, abi, wallet);

app.use(bodyParser.raw({ type: 'application/json' }));

app.get('/', (req, res) => {
  res.send('✅ Server running');
});

app.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    console.log(`📦 Stripe event received: ${event.type}`);
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return res.sendStatus(400);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const amount = session.amount_total / 100;
    const walletAddress = session.metadata?.wallet;

    console.log(`💰 Payment received: $${amount}`);
    console.log(`🎯 Wallet to mint to: ${walletAddress}`);

    if (!walletAddress || !ethers.isAddress(walletAddress)) {
      console.error('❌ Invalid or missing wallet address in metadata');
      return res.sendStatus(400);
    }

    let uri;

    if (amount === 80) {
      uri = 'ipfs://bafkreigkklmr5jyc62osvw3eq6zg2rc4ptocibfryncek3oge4p33xujzq';
    } else if (amount === 150) {
      uri = 'ipfs://bafkreie3isvhwhzn2yvg4eiuvzwbmnla3wwww5dd6gl233dx5hk3newbvy';
    } else if (amount === 250) {
      uri = 'ipfs://bafkreib2omhppf7wntque4xaal5wn37hr5mjbx36nxhmdeorsqmic4dayi';
    } else {
      console.error('❌ Unknown payment amount');
      return res.sendStatus(400);
    }

    try {
      const tx = await contract.safeMint(walletAddress, uri);
      console.log(`✅ Minted NFT! Tx: ${tx.hash}`);
    } catch (err) {
      console.error('❌ Minting failed:', err);
    }
  }

  res.status(200).send('OK');
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
