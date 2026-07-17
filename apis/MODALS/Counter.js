const mongoose = require('mongoose');

// Define the schema for the counter
const CounterSchema = new mongoose.Schema({
  ID: { type: String, required: true }, // Unique ID for the counter
  seq: { type: Number, default: 0 }     // Sequence number
});

// Create a model from the schema
const Counter = mongoose.model('Counter', CounterSchema);

// Function to get the next transaction ID
async function getNextTxId(ID) {
    try {
        // Initialize sequence at 2500 if it doesn't exist
        const initialSequence = 70000;

        // Find and increment the sequence number for the given counter ID
        const result = await Counter.findOneAndUpdate(
            { ID }, // The ID of the counter (e.g., 'transactionId')
            { $inc: { seq: 1 } }, // Increment the sequence by 1
            {
                new: true,
                upsert: true, // Create the document if it doesn't exist
                setDefaultsOnInsert: true // Set defaults when inserting
            }
        );

        // If the sequence was newly created, initialize it to 2500
        if (result.seq === 1) { // Meaning this was the first increment
            result.seq = initialSequence;
            await result.save(); // Save the updated sequence starting from 2500
            return result.seq;
        }

        // Return the incremented sequence number
        return result.seq;
    } catch (error) {
        console.error('Error in getting next transaction ID:', error);
        throw error;
    }
};
module.exports = getNextTxId;