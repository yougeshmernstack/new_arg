const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    commentId: { type: String, required: true },
    user_type: { type: String, required: true },
    uid: { type: Number, required: true },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

const ticketSchema = new mongoose.Schema({
    ticketId: { type: String, required: true, unique: true },
    uid: { type: Number, required: true },
    subject: { type: String, required: true },
    description: { type: String, required: true },
    attachments: [{ type: String }],
    status: { type: String, enum: ['Open', 'In Progress', 'Closed'], default: 'Open' },
    priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Low' },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, },
    comments: [commentSchema],
    assigned_to: { type: Number }
});

module.exports = mongoose.model('Ticket', ticketSchema);
