import mongoose from "mongoose";

const likeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // targetType dinh danh loai doi tuong: post | comment
    targetType: { type: String, enum: ["post", "comment"], required: true },
    // targetId la _id cua Post hoac Comment
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    // reactionType de mo rong (vi du: like, love, ...), mac dinh la like
    reactionType: { type: String, default: "like" },
  },
  { timestamps: true }
);

// Ngan chan viec nguoi dung thich trung mot doi tuong nhieu lan
likeSchema.index({ userId: 1, targetType: 1, targetId: 1 }, { unique: true });

export default mongoose.model("Like", likeSchema);
