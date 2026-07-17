const mongoose = require("mongoose");
// const validator = require('validator')

const gameSchema = new mongoose.Schema({
  name: {
    type: String,
    required: false,
  },
  g_uid: {
    type: String,
    unique: true,
    required:true
  },
image:{
    type: String,
    required: false,
},
type:{
    type: String,
    required: false,
},
provider:{
    type: String,
    required: false,
},
has_lobby:{
    type: Number,
    required: false,
},
is_mobile:{
    type: Number,
    required: false,
},
has_freespins:{
    type: Number,
    required: false,
},
has_tables:{
    type: Number,
    required: false,
},
freespin_valid_until_full_day:{
    type: Number,
    required: false,
},
status:{
    type: Number,
    required: false,
    default:0
},
 
});
const gameData = new mongoose.model("gameData", gameSchema);
module.exports = gameData;
