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
      .json({ message: "Nội dung bình luận không được để trống" });
  }

  // Validate postId
  if (!mongoose.Types.ObjectId.isValid(postId)) {
    return res.status(400).json({ message: "ID bài viết không hợp lệ" });
  }

  // Kiem tra post ton tai
  const post = await Post.findById(postId);
  if (!post) {
    return res.status(404).json({ message: "Không tìm thấy bài viết" });
  }

  // Validate parentCommentId neu co
  if (parentCommentId && !mongoose.Types.ObjectId.isValid(parentCommentId)) {
    return res.status(400).json({ message: "ID bình luận cha không hợp lệ" });
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
      return res.status(409).json({ message: "Bình luận bị trùng lặp" });
    }
    return res.status(500).json({ message: "Lỗi khi tạo bình luận" });
  }
};

// Lay tat ca comment cua mot post
export const getAllComments = async (req, res) => {
  try {
    const { postId, page = 1, limit = 10 } = req.query;

    // Bat buoc co postId
    if (!postId) {
      return res.status(400).json({ message: "Cần truyền postId" });
    }
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ message: "ID bài viết không hợp lệ" });
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [comments, total] = await Promise.all([
      Comment.find({ postId })
        .populate("authorId", "userName fullName avatar")
        .sort("-createdAt")
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Comment.countDocuments({ postId }),
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
    return res.status(500).json({ message: "Lỗi khi lấy danh sách bình luận" });
  }
};

// Lay chi tiet comment
export const getCommentById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID bình luận không hợp lệ" });
    }

    const comment = await Comment.findById(id)
      .populate("authorId", "username avatar")
      .populate("postId", "content");

    if (!comment) {
      return res.status(404).json({ message: "Không tìm thấy bình luận" });
    }

    res.status(200).json({
      success: true,
      data: comment,
    });
  } catch (error) {
    return res.status(500).json({ message: "Lỗi khi lấy thông tin bình luận" });
  }
};

// Cap nhat comment
export const updateComment = async (req, res) => {
  const { content } = req.body;

  if (!content?.trim()) {
    return res
      .status(400)
      .json({ message: "Nội dung bình luận không được để trống" });
  }

  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID bình luận không hợp lệ" });
    }

    const comment = await Comment.findById(id);

    if (!comment) {
      return res.status(404).json({ message: "Không tìm thấy bình luận" });
    }

    const requesterId = (req.user?._id || req.userId)?.toString();
    if (comment.authorId.toString() !== requesterId) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền cập nhật bình luận này" });
    }

    comment.content = content;
    await comment.save();

    await comment.populate("authorId", "username avatar");

    res.status(200).json({
      success: true,
      data: comment,
    });
  } catch (error) {
    return res.status(500).json({ message: "Lỗi khi cập nhật bình luận" });
  }
};

// Xoa comment
export const deleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID bình luận không hợp lệ" });
    }

    const comment = await Comment.findById(id);

    if (!comment) {
      return res.status(404).json({ message: "Không tìm thấy bình luận" });
    }

    const requesterId = (req.user?._id || req.userId)?.toString();
    if (comment.authorId.toString() !== requesterId) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền xóa bình luận này" });
    }

    await comment.deleteOne();

    // Decrement Post comment count
    await Post.findByIdAndUpdate(comment.postId, {
      $inc: { commentCount: -1 },
    });

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
      message: "Đã xóa bình luận thành công",
    });
  } catch (error) {
    return res.status(500).json({ message: "Lỗi khi xóa bình luận" });
  }
};
