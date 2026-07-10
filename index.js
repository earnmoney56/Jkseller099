const express = require('express');
const admin = require('firebase-admin');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

// 1. Firebase Initialize (Aapki credentials yahan aayengi)
// Note: Apni serviceAccountKey.json file yahan import karni hogi
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Meta Webhook Verification Token (Koi bhi secure word rakh lein)
const VERIFY_TOKEN = "JH_SELLER_SECRET_TOKEN"; 

// 2. META WEBHOOK VERIFICATION (GET METHOD)
app.get('/webhook', (req, res) => {
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    }
});

// 3. INCOMING MESSAGES CATCHER (POST METHOD)
app.post('/webhook', async (req, res) => {
    let body = req.body;

    console.log(JSON.stringify(body, null, 2));

    if (body.object) {
        if (body.entry && 
            body.entry[0].changes && 
            body.entry[0].changes[0].value.messages && 
            body.entry[0].changes[0].value.messages[0]
        ) {
            let messageData = body.entry[0].changes[0].value.messages[0];
            let customerPhone = messageData.from; // Customer ka number
            let messageText = messageData.text ? messageData.text.body : "Media/Other Message"; // Message text
            let timestamp = messageData.timestamp;

            try {
                // Firebase Firestore mein data save ho raha hai
                await db.collection('whatsapp_chats').add({
                    phone: customerPhone,
                    message: messageText,
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    status: 'received'
                });
                console.log(`Message saved in Firebase from: ${customerPhone}`);
            } catch (error) {
                console.error("Firebase Error: ", error);
            }
        }
        res.sendStatus(200);
    } else {
        res.sendStatus(404);
    }
});

// Port configuration
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
