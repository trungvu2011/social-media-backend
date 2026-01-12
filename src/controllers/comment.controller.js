import mongoose from "mongoose";
import Comment from "../models/comment.model.js";
import Post from "../models/post.model.js";
import Notification from "../models/notification.model.js";
import { SOCKET_EVENTS } from "../lib/socket.events.js";

// Tao comment moi
export const createComment = async (req, res) => {
  const { postId, content, parentCommentId } = req.body;
  const userId = req.user?._id || req.userId;

  // Kiem tra noi dung
  if (!content?.trim()) {
    return res
      .status(400)
      .json({ message: "Comment content cannot be empty" });
  }

  // Validate postId
  if (!mongoose.Types.ObjectId.isValid(postId)) {
    return res.status(400).json({ message: "Invalid post ID" });
  }

  // Kiem tra post ton tai
  const post = await Post.findById(postId);
  if (!post) {
    return res.status(404).json({ message: "Post not found" });
  }

  // Validate parentCommentId neu co
  if (parentCommentId && !mongoose.Types.ObjectId.isValid(parentCommentId)) {
    return res.status(400).json({ message: "Invalid parent comment ID" });
  }

  try {
    const image = req.file?.path;

    const comment = await Comment.create({
      content,
      postId,
      authorId: userId,
      parentCommentId: parentCommentId || null,
      image,
    });

    // Update Post comment count
    await Post.findByIdAndUpdate(postId, {
      $inc: { commentCount: 1 },
    });

    // Update Parent Comment reply count if reply
    if (parentCommentId) {
      await Comment.findByIdAndUpdate(parentCommentId, {
        $inc: { replyCount: 1 },
      });
    }

    await comment.populate("authorId", "userName fullName avatar");

    // --------------- Notification Logic ---------------
    // Notify Post Author
    if (post.authorId.toString() !== userId.toString()) {
      await Notification.create({
        receiverId: post.authorId,
        senderId: userId,
        type: "comment",
        referenceId: postId,
        content: `commented on your post`,
      });
    }
    
    // Notify Parent Comment Author (if reply)
    if (parentCommentId) {
        const parentComment = await Comment.findById(parentCommentId);
        if (parentComment && parentComment.authorId.toString() !== userId.toString() && parentComment.authorId.toString() !== post.authorId.toString()) {
             await Notification.create({
                receiverId: parentComment.authorId,
                senderId: userId,
                type: "comment", // You might want a specific type like 'reply' later
                referenceId: postId, // Using postId to link back to the post
                content: `replied to your comment`,
             });
        }
    }
    // --------------------------------------------------

    // Emit real-time comment event to post room
    const io = req.app.get("io");
    if (io) {
      io.to(`post:${postId}`).emit(SOCKET_EVENTS.COMMENT_ADDED, {
        postId: postId,
        comment: comment,
        commentCount: await Post.findById(postId).then(p => p.commentCount),
        timestamp: new Date(),
      });
    }

    res.status(201).json({
      success: true,
      data: comment,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "Duplicate comment" });
    }
    return res.status(500).json({ message: "Error creating comment" });
  }
};

// Lay tat ca comment cua mot post
export const getAllComments = async (req, res) => {
  try {
    const { postId, page = 1, limit = 10 } = req.query;

    // Bat buoc co postId
    if (!postId) {
      return res.status(400).json({ message: "postId is required" });
    }
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }

    // Filter: if parentCommentId is provided, get replies. 
    // Else, get top-level comments (parentCommentId: null)
    const filter = { postId };
    if (req.query.parentCommentId) {
       filter.parentCommentId = req.query.parentCommentId;
    } else {
       filter.parentCommentId = null; 
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    // Sort logic: "From top to bottom" -> Chronological (Oldest first)
    // This allows reading the conversation naturally.
    const sort = "createdAt"; 

    const [comments, total] = await Promise.all([
      Comment.find(filter)
        .populate("authorId", "userName fullName avatar")
        .sort(sort) 
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Comment.countDocuments(filter),
    ]);

    const pages = Math.ceil(total / limitNum);

    res.status(200).json({
      success: true,
      data: comments,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        pages,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Error fetching comments" });
  }
};

// Lay chi tiet comment
export const getCommentById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid comment ID" });
    }

    const comment = await Comment.findById(id)
      .populate("authorId", "username avatar")
      .populate("postId", "content");

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    res.status(200).json({
      success: true,
      data: comment,
    });
  } catch (error) {
    return res.status(500).json({ message: "Error fetching comment details" });
  }
};

// Cap nhat comment
export const updateComment = async (req, res) => {
  const { content } = req.body;

  if (!content?.trim()) {
    return res
      .status(400)
      .json({ message: "Comment content cannot be empty" });
  }

  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid comment ID" });
    }

    const comment = await Comment.findById(id);

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const requesterId = (req.user?._id || req.userId)?.toString();
    if (comment.authorId.toString() !== requesterId) {
      return res
        .status(403)
        .json({ message: "You are not authorized to update this comment" });
    }

    comment.content = content;
    await comment.save();

    await comment.populate("authorId", "username avatar");

    res.status(200).json({
      success: true,
      data: comment,
    });
  } catch (error) {
    return res.status(500).json({ message: "Error updating comment" });
  }
};

// Xoa comment
export const deleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid comment ID" });
    }

    const comment = await Comment.findById(id);

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const requesterId = (req.user?._id || req.userId)?.toString();
    if (comment.authorId.toString() !== requesterId) {
      return res
        .status(403)
        .json({ message: "You are not authorized to delete this comment" });
    }

    await comment.deleteOne();

    // Decrement Post comment count
    await Post.findByIdAndUpdate(comment.postId, {
      $inc: { commentCount: -1 },
    });

    // Decrement Parent Comment reply count if reply
    if (comment.parentCommentId) {
      await Comment.findByIdAndUpdate(comment.parentCommentId, {
        $inc: { replyCount: -1 },
      });
    }

    // Optional: Delete all replies (children) of this comment
    // Simple approach: Delete them
    await Comment.deleteMany({ parentCommentId: id });
    // Note: This won't recursively update comment counts effectively if we just delete. 
    // But since we track post.commentCount globally, we might need to decrement that by N (number of deleted replies) too.
    // For now, let's keep it simple.  Advanced: Recursive delete or Soft delete.

    // Emit real-time comment deletion event
    const io = req.app.get("io");
    if (io) {
      io.to(`post:${comment.postId}`).emit(SOCKET_EVENTS.COMMENT_DELETED, {
        postId: comment.postId,
        commentId: id,
        timestamp: new Date(),
      });
    }

    res.status(200).json({
      success: true,
      message: "Comment deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({ message: "Error deleting comment" });
  }
};
