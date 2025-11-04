import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: { type: String },
    images: [{ type: String }],
    likes: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
    likeCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
    visibility: { type: String, default: "public" },
  },
  { timestamps: true }
);

// Index de toi uu feed va cac sap xep pho bien
postSchema.index({ authorId: 1, createdAt: -1 });
postSchema.index({ likeCount: -1 });
postSchema.index({ commentCount: -1 });

export default mongoose.model("Post", postSchema);
