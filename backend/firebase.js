const admin = require("firebase-admin");

let serviceAccount;
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;

if (serviceAccountJson) {
  try {
    serviceAccount = JSON.parse(serviceAccountJson);
  } catch (err) {
    console.error("Invalid FIREBASE_SERVICE_ACCOUNT JSON", err);
    throw err;
  }
} else {
  serviceAccount = require("./serviceAccountKey.json");
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

module.exports = {
  admin,
  db,
};
