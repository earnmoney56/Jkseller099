const express = require('express');
const admin = require('firebase-admin');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

// Firebase Initialize safely
if (!admin.apps.length) {
  const serviceAccount = require("./serviceAccountKey.json");
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const VERIFY_TOKEN = "JH_SELLER_SECRET_TOKEN"; 

// GET METHOD (Verification)
app.get('/webhook', (req, res) => {
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            return res.status(200).send(challenge);
        } else {
            return res.sendStatus(403);
        }
    }
    return res.sendStatus(400);
});

// POST METHOD (Catching messages)
app.post('/webhook', async (req, res) => {
    let body = req.body;

    if (body.object) {
        if (body.entry && 
            body.entry[0].changes && 
            body.entry[0].changes[0].value.messages && 
            body.entry[0].changes[0].value.messages[0]
        ) {
            let messageData = body.entry[0].changes[0].value.messages[0];
            let customerPhone = messageData.from;
            let messageText = messageData.text ? messageData.text.body : "Media/Other Message";

            try {
                await db.collection('whatsapp_chats').add({
                    phone: customerPhone,
                    message: messageText,
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    status: 'received'
                });
            } catch (error) {
                console.error("Firebase Error: ", error);
            }
        }
        return res.sendStatus(200);
    } else {
        return res.sendStatus(404);
    }
});

// Vercel compatibility ke liye export kiya hai
module.exports = app;
