import mongoose from 'mongoose';
import Comment from '../models/comment.model.js';
import Post from '../models/post.model.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Tao comment moi
export const createComment = asyncHandler(async (req, res) => {
  const { postId, content, parentCommentId } = req.body;
  const userId = req.user?._id || req.userId;

  // Kiem tra noi dung
  if (!content?.trim()) {
    throw new ApiError(400, "Nội dung bình luận không được để trống");
  }

  // Validate postId
  if (!mongoose.Types.ObjectId.isValid(postId)) {
    throw new ApiError(400, "ID bài viết không hợp lệ");
  }

  // Kiem tra post ton tai
  const post = await Post.findById(postId);
  if (!post) {
    throw new ApiError(404, "Không tìm thấy bài viết");
  }

  // Validate parentCommentId neu co
  if (parentCommentId && !mongoose.Types.ObjectId.isValid(parentCommentId)) {
    throw new ApiError(400, "ID bình luận cha không hợp lệ");
  }

  try {
    const comment = await Comment.create({
      content,
      postId,
      authorId: userId,
      parentCommentId: parentCommentId || null
    });

    await comment.populate('authorId', 'username avatar');

    res.status(201).json({
      success: true,
      data: comment,
    });
  } catch (error) {
    // Trung binh luan theo index
    if (error?.code === 11000) {
      throw new ApiError(409, "Bình luận bị trùng lặp");
    }
    throw new ApiError(500, "Lỗi khi tạo bình luận");
  }
});

// Lay tat ca comment cua mot post
export const getAllComments = asyncHandler(async (req, res) => {
  try {
    const { postId } = req.query;

    // Bat buoc co postId
    if (!postId) {
      throw new ApiError(400, "Cần truyền postId");
    }
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      throw new ApiError(400, "ID bài viết không hợp lệ");
    }

    const comments = await Comment.find({ postId })
      .populate("authorId", "username avatar")
      .sort("-createdAt");

    res.status(200).json({
      success: true,
      data: comments,
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, "Lỗi khi lấy danh sách bình luận");
  }
});

// Lay chi tiet comment
export const getCommentById = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, "ID bình luận không hợp lệ");
    }

    const comment = await Comment.findById(id)
      .populate('authorId', 'username avatar')
      .populate('postId', 'content');

    if (!comment) {
      throw new ApiError(404, "Không tìm thấy bình luận");
    }

    res.status(200).json({
      success: true,
      data: comment,
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, "Lỗi khi lấy thông tin bình luận");
  }
});

// Cap nhat comment
export const updateComment = asyncHandler(async (req, res) => {
  const { content } = req.body;

  if (!content?.trim()) {
    throw new ApiError(400, "Nội dung bình luận không được để trống");
  }

  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, "ID bình luận không hợp lệ");
    }

    const comment = await Comment.findById(id);

    if (!comment) {
      throw new ApiError(404, "Không tìm thấy bình luận");
    }

    const requesterId = (req.user?._id || req.userId)?.toString();
    if (comment.authorId.toString() !== requesterId) {
      throw new ApiError(403, "Bạn không có quyền cập nhật bình luận này");
    }

    comment.content = content;
    await comment.save();

    await comment.populate('authorId', 'username avatar');

    res.status(200).json({
      success: true,
      data: comment,
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, "Lỗi khi cập nhật bình luận");
  }
});

// Xoa comment
export const deleteComment = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, "ID bình luận không hợp lệ");
    }

    const comment = await Comment.findById(id);

    if (!comment) {
      throw new ApiError(404, "Không tìm thấy bình luận");
    }

    const requesterId = (req.user?._id || req.userId)?.toString();
    if (comment.authorId.toString() !== requesterId) {
      throw new ApiError(403, "Bạn không có quyền xóa bình luận này");
    }

    await Comment.deleteOne({ _id: comment._id });

    res.status(200).json({
      success: true,
      message: "Xóa bình luận thành công",
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, "Lỗi khi xóa bình luận");
  }
});
