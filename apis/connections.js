require('dotenv').config();
const mongoose = require('mongoose');

const dbName = process.env.DB_NAME;
const username = process.env.DB_USER;
const ip = process.env.ip;
const dbport = process.env.dbport;
const password = encodeURIComponent(process.env.DB_PASSWORD);

const uri = `mongodb://${username}:${password}@${ip}:${dbport}/${dbName}?authSource=admin`;
// local host
// const uri = `mongodb://localhost:27017/${dbName}`;

// console.log("Connecting to MongoDB URI:", uri); // Log to check URI format

mongoose.set("strictQuery", false);

mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log('Mongoose connected successfully',dbName);
    })
    .catch((e) => {
        console.log('Mongoose connection error:', e);
    });
