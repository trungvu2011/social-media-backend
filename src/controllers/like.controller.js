import mongoose from "mongoose";
import Like from "../models/like.model.js";
import Post from "../models/post.model.js";
import Comment from "../models/comment.model.js";
import Notification from "../models/notification.model.js";

// Tao like moi (ho tro post/comment)
export const createLike = async (req, res) => {
  try {
    const userId = req.userId;
    console.log("Creating like for user:", userId);
    const { targetType, targetId, reactionType } = req.body;
    console.log("Request body:", targetType, targetId, reactionType);

    // Kiem tra targetType
    const ALLOWED_TYPES = ["post", "comment"];
    if (!ALLOWED_TYPES.includes(String(targetType))) {
      return res
        .status(400)
        .json({ message: "Loại đối tượng không hợp lệ (post|comment)" });
    }

    // Kiem tra targetId
    if (!mongoose.Types.ObjectId.isValid(targetId)) {
      return res.status(400).json({ message: "ID đối tượng không hợp lệ" });
    }

    // Kiem tra doi tuong ton tai
    const targetExists =
      targetType === "post"
        ? await Post.findById(targetId)
        : await Comment.findById(targetId);
    if (!targetExists) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy đối tượng để thích" });
    }

    // Kiem tra da like chua
    const existingLike = await Like.findOne({ userId, targetType, targetId });
    if (existingLike) {
      return res
        .status(400)
        .json({ message: "Bạn đã thích đối tượng này rồi" });
    }

    // Tao like moi
    const payload = { userId, targetType, targetId };
    if (reactionType) payload.reactionType = reactionType;
    const like = await Like.create(payload);

    await like.populate("userId", "username avatar");

    // --------------- Notification Logic ---------------
    const receiverId = targetExists.authorId || targetExists.userId; // Post has authorId, Comment has authorId.
    // If targetExists is a Comment, it has authorId.
    // Ensure we don't notify self
    if (receiverId && receiverId.toString() !== userId.toString()) {
      await Notification.create({
        receiverId,
        senderId: userId,
        type: "like",
        referenceId: targetId,
        content: `liked your ${targetType}`,
      });
    }
    // --------------------------------------------------

    res.status(201).json({
      success: true,
      data: like,
    });
  } catch (error) {
    return res.status(500).json({ message: "Lỗi khi tạo lượt thích" });
  }
};

// Lay danh sach likes (co the filter theo targetType/targetId/userId)
export const getAllLikes = async (req, res) => {
  try {
    const { targetType, targetId, userId } = req.query;
    const filter = {};

    if (targetType) {
      const ALLOWED_TYPES = ["post", "comment"];
      if (!ALLOWED_TYPES.includes(String(targetType))) {
        return res
          .status(400)
          .json({ message: "Loại đối tượng không hợp lệ (post|comment)" });
      }
      filter.targetType = targetType;
    }

    if (targetId) {
      if (!mongoose.Types.ObjectId.isValid(targetId)) {
        return res.status(400).json({ message: "ID đối tượng không hợp lệ" });
      }
      filter.targetId = targetId;
    }

    if (userId) {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: "ID người dùng không hợp lệ" });
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
    return res
      .status(500)
      .json({ message: "Lỗi khi lấy danh sách lượt thích" });
  }
};

// Lay chi tiet like theo id
export const getLikeById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ message: "Định dạng ID like không hợp lệ" });
    }

    const like = await Like.findById(id).populate("userId", "username avatar");

    if (!like) {
      return res.status(404).json({ message: "Không tìm thấy lượt thích" });
    }

    res.status(200).json({
      success: true,
      data: like,
    });
  } catch (error) {
    return res.status(500).json({ message: "Lỗi khi lấy chi tiết lượt thích" });
  }
};

// Cap nhat like (chi cho phep sua reactionType)
export const updateLike = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ message: "Định dạng ID like không hợp lệ" });
    }

    const like = await Like.findById(id);
    if (!like) {
      return res.status(404).json({ message: "Không tìm thấy lượt thích" });
    }

    const requesterId = (req.user?._id || req.userId)?.toString();
    if (like.userId.toString() !== requesterId) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền cập nhật lượt thích này" });
    }

    const { reactionType } = req.body;
    const update = {};
    if (reactionType) update.reactionType = reactionType;

    const updatedLike = await Like.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true }
    );

    res.status(200).json({
      success: true,
      data: updatedLike,
    });
  } catch (error) {
    return res.status(500).json({ message: "Lỗi khi cập nhật lượt thích" });
  }
};

// Xoa like
export const deleteLike = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ message: "Định dạng ID like không hợp lệ" });
    }

    const like = await Like.findById(id);
    if (!like) {
      return res.status(404).json({ message: "Không tìm thấy lượt thích" });
    }

    const requesterId = (req.user?._id || req.userId)?.toString();
    if (like.userId.toString() !== requesterId) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền xóa lượt thích này" });
    }

    await Like.deleteOne({ _id: like._id });

    res.status(200).json({
      success: true,
      data: null,
    });
  } catch (error) {
    return res.status(500).json({ message: "Lỗi khi xóa lượt thích" });
  }
};
