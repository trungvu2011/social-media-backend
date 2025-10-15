import mongoose from "mongoose";

const likeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    targetType: { type: String, enum: ["post", "comment"], required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    reactionType: { type: String, default: "like" },
  },
  { timestamps: true }
);

export default mongoose.model("Like", likeSchema);
