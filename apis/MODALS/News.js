// // models/News.js
// const mongoose = require('mongoose');

// const newsSchema = new mongoose.Schema({
//     id:{type:Number,unique:true,require:true},
//     title: { type: String, required: true },
//     description: { type: String, required: true },
//     image: { type: String },
//     date: { type: Date, default: Date.now },
//     status: { type: Number, default: 1 }, // 1 for active, 0 for inactive
// }, { timestamps: true }); // Automatically adds createdAt and updatedAt timestamps

// module.exports = mongoose.model('News', newsSchema);


const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema({
    id: { type: Number, unique: true, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    image: { type: String },
    date: { type: Date, default: Date.now },
    status: { type: Number, default: 1 }, // 1 for active, 0 for inactive
    dashboard: { type: Number,default: 0 },
    popup: { type: Number ,default: 0},
    news_section: { type: Number,default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('News', newsSchema);