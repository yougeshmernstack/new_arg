const mongoose = require("mongoose");

const versionSchema = new mongoose.Schema({
    version: {
        type: String,
        required: true,
    },
    releaseDate: {
        type: Date,
        default: Date.now
    },
    description: {
        type: String,
        required: true,
    },
});

const Version = mongoose.model("Version", versionSchema);
module.exports = Version;
