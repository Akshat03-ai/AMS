const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  : require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const app = express();
app.use(cors());
app.use(express.json());

// Import routes
const officerRoutes = require('./routes/officer');
const storeManagerRoutes = require('./routes/store-manager');
const adminRoutes = require('./routes/admin');
const authRoutes = require('./routes/auth');

// Routes
app.use('/api', officerRoutes);
app.use('/api', storeManagerRoutes);
app.use('/api', adminRoutes);
app.use('/api', authRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'AMS Backend Running', timestamp: new Date() });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});