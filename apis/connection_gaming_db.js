require('dotenv').config();
const mongoose = require('mongoose');

const dbName = process.env.DB_NAME;
const username = process.env.DB_USER;
const ip = process.env.ip;
const dbport = process.env.dbport;
const password = encodeURIComponent(process.env.DB_PASSWORD);

const uri = `mongodb://${username}:${password}@${ip}:${dbport}/${dbName}?authSource=admin`;

// Create a separate mongoose instance for gaming DB
const gamingMongoose = new mongoose.Mongoose();

gamingMongoose.set("strictQuery", false);

// Create connection with specific options for gaming DB
const gamingConnection = gamingMongoose.createConnection(uri, { 
    useNewUrlParser: true, 
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000
});

gamingConnection.on('connected', () => {
    console.log('MongoDB connected successfully', dbName);
});

gamingConnection.on('error', (e) => {
    console.error('MongoDB connection error:', e);
});

module.exports = gamingConnection;
