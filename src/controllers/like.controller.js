import mongoose from "mongoose";
import Like from "../models/like.model.js";
import Post from "../models/post.model.js";
import Comment from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Tao like moi (ho tro post/comment)
export const createLike = asyncHandler(async (req, res) => {
  try {
    const userId = (req.user?._id || req.userId);
    const { targetType = "post", targetId, reactionType } = req.body;

    // Kiem tra targetType
    const ALLOWED_TYPES = ["post", "comment"];
    if (!ALLOWED_TYPES.includes(String(targetType))) {
      throw new ApiError(400, "Loại đối tượng không hợp lệ (post|comment)");
    }

    // Kiem tra targetId
    if (!mongoose.Types.ObjectId.isValid(targetId)) {
      throw new ApiError(400, "ID đối tượng không hợp lệ");
    }

    // Kiem tra doi tuong ton tai
    const targetExists = targetType === "post"
      ? await Post.findById(targetId)
      : await Comment.findById(targetId);
    if (!targetExists) {
      throw new ApiError(404, "Không tìm thấy đối tượng để thích");
    }

    // Kiem tra da like chua
    const existingLike = await Like.findOne({ userId, targetType, targetId });
    if (existingLike) {
      throw new ApiError(400, "Bạn đã thích đối tượng này rồi");
    }

    // Tao like moi
    const payload = { userId, targetType, targetId };
    if (reactionType) payload.reactionType = reactionType;
    const like = await Like.create(payload);

    await like.populate("userId", "username avatar");

    res.status(201).json({
      success: true,
      data: like,
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, "Lỗi khi tạo lượt thích");
  }
});

// Lay danh sach likes (co the filter theo targetType/targetId/userId)
export const getAllLikes = asyncHandler(async (req, res) => {
  try {
    const { targetType, targetId, userId } = req.query;
    const filter = {};

    if (targetType) {
      const ALLOWED_TYPES = ["post", "comment"];
      if (!ALLOWED_TYPES.includes(String(targetType))) {
        throw new ApiError(400, "Loại đối tượng không hợp lệ (post|comment)");
      }
      filter.targetType = targetType;
    }

    if (targetId) {
      if (!mongoose.Types.ObjectId.isValid(targetId)) {
        throw new ApiError(400, "ID đối tượng không hợp lệ");
      }
      filter.targetId = targetId;
    }

    if (userId) {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, "ID người dùng không hợp lệ");
      }
      filter.userId = userId;
    }

    const likes = await Like.find(filter)
      .populate("userId", "username avatar")
      .sort("-createdAt");

    res.status(200).json({
      success: true,
      data: likes,
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, "Lỗi khi lấy danh sách lượt thích");
  }
});

// Lay chi tiet like theo id
export const getLikeById = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, "Định dạng ID like không hợp lệ");
    }

    const like = await Like.findById(id).populate("userId", "username avatar");

    if (!like) {
      throw new ApiError(404, "Không tìm thấy lượt thích");
    }

    res.status(200).json({
      success: true,
      data: like,
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, "Lỗi khi lấy chi tiết lượt thích");
  }
});

// Cap nhat like (chi cho phep sua reactionType)
export const updateLike = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, "Định dạng ID like không hợp lệ");
    }

    const like = await Like.findById(id);
    if (!like) {
      throw new ApiError(404, "Không tìm thấy lượt thích");
    }

    const requesterId = (req.user?._id || req.userId)?.toString();
    if (like.userId.toString() !== requesterId) {
      throw new ApiError(403, "Bạn không có quyền cập nhật lượt thích này");
    }

    const { reactionType } = req.body;
    const update = {};
    if (reactionType) update.reactionType = reactionType;

    const updatedLike = await Like.findByIdAndUpdate(id, { $set: update }, { new: true });

    res.status(200).json({
      success: true,
      data: updatedLike,
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, "Lỗi khi cập nhật lượt thích");
  }
});

// Xoa like
export const deleteLike = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, "Định dạng ID like không hợp lệ");
    }

    const like = await Like.findById(id);
    if (!like) {
      throw new ApiError(404, "Không tìm thấy lượt thích");
    }

    const requesterId = (req.user?._id || req.userId)?.toString();
    if (like.userId.toString() !== requesterId) {
      throw new ApiError(403, "Bạn không có quyền xóa lượt thích này");
    }

    await Like.deleteOne({ _id: like._id });

    res.status(200).json({
      success: true,
      data: null,
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, "Lỗi khi xóa lượt thích");
  }
});