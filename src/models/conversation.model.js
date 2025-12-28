import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    members: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      ],
      validate: {
        validator: (v) => v.length === 2,
        message: "Conversation must have exactly 2 members",
      },
    },
    memberHash: {
      type: String,
      required: true,
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
  },
  { timestamps: true }
);

conversationSchema.index({ memberHash: 1 }, { unique: true });

export default mongoose.model("Conversation", conversationSchema);
