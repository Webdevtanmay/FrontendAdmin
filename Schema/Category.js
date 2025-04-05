const mongoose = require("mongoose");
const AutoIncrement = require("mongoose-sequence")(mongoose);

const catSchema = new mongoose.Schema({
  catname: {
    type: String,
    required: true,
  },
  catid: {
    type: Number,
    unique: true,
  },
});

// Auto-increment catid
catSchema.plugin(AutoIncrement, { inc_field: "catid" });

module.exports = mongoose.model("Category", catSchema);
