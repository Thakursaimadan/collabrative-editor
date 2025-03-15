import mongoose from "mongoose";
const SharedLinkSchema = new mongoose.Schema({
  linkId: String,
  permission: { type: String, enum: ["view", "edit"], required: true }, 
  createdAt: { type: Date, default: Date.now },
});

const SharedWithSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  permission: { type: String, enum: ["view", "edit"], required: true },
});

const DocumentSchema = new mongoose.Schema({
  _id: String,
  content: Object,
  title: String,
  lastUpdated: { type: Date, default: Date.now },
  created: { type: Date, default: Date.now },
  owner: String,
  sharedLinks: [SharedLinkSchema],
  sharedWith: [SharedWithSchema], 
});

const Document = mongoose.model("Document", DocumentSchema);
export default Document;