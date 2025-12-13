import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: { type: String, required: true },
    image: { type: String },
    likeCount: { type: Number, default: 0 },
    parentCommentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
    },
  },
  { timestamps: true }
);

// Ngan chan binh luan trung lap theo postId + authorId + content
commentSchema.index({ postId: 1, authorId: 1, content: 1 }, { unique: true });

export default mongoose.model("Comment", commentSchema);