import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    type: { type: String },
    referenceId: { type: mongoose.Schema.Types.ObjectId },
    content: { type: String },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Notification", notificationSchema);
