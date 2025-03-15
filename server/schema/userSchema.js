// schema/userSchema.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  _id: String,
  name: String,
  password: String,
  documents: [{ type: String, ref: "Document" }],
});

export default mongoose.model("User", userSchema);
