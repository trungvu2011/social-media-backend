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
        .json({ message: "Invalid target type (post|comment)" });
    }

    // Kiem tra targetId
    if (!mongoose.Types.ObjectId.isValid(targetId)) {
      return res.status(400).json({ message: "Invalid target ID" });
    }

    // Kiem tra doi tuong ton tai
    const targetExists =
      targetType === "post"
        ? await Post.findById(targetId)
        : await Comment.findById(targetId);
    if (!targetExists) {
      return res
        .status(404)
        .json({ message: "Target not found" });
    }

    // Kiem tra da like chua
    const existingLike = await Like.findOne({ userId, targetType, targetId });
    if (existingLike) {
      return res
        .status(400)
        .json({ message: "You have already liked this item" });
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
    return res.status(500).json({ message: "Error creating like" });
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
          .json({ message: "Invalid target type (post|comment)" });
      }
      filter.targetType = targetType;
    }

    if (targetId) {
      if (!mongoose.Types.ObjectId.isValid(targetId)) {
        return res.status(400).json({ message: "Invalid target ID" });
      }
      filter.targetId = targetId;
    }

    if (userId) {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
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
      .json({ message: "Error fetching likes" });
  }
};

// Lay chi tiet like theo id
export const getLikeById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ message: "Invalid like ID format" });
    }

    const like = await Like.findById(id).populate("userId", "username avatar");

    if (!like) {
      return res.status(404).json({ message: "Like not found" });
    }

    res.status(200).json({
      success: true,
      data: like,
    });
  } catch (error) {
    return res.status(500).json({ message: "Error fetching like details" });
  }
};

// Cap nhat like (chi cho phep sua reactionType)
export const updateLike = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ message: "Invalid like ID format" });
    }

    const like = await Like.findById(id);
    if (!like) {
      return res.status(404).json({ message: "Like not found" });
    }

    const requesterId = (req.user?._id || req.userId)?.toString();
    if (like.userId.toString() !== requesterId) {
      return res
        .status(403)
        .json({ message: "You are not authorized to update this like" });
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
    return res.status(500).json({ message: "Error updating like" });
  }
};

// Xoa like
export const deleteLike = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ message: "Invalid like ID format" });
    }

    const like = await Like.findById(id);
    if (!like) {
      return res.status(404).json({ message: "Like not found" });
    }

    const requesterId = (req.user?._id || req.userId)?.toString();
    if (like.userId.toString() !== requesterId) {
      return res
        .status(403)
        .json({ message: "You are not authorized to delete this like" });
    }

    await Like.deleteOne({ _id: like._id });

    res.status(200).json({
      success: true,
      data: null,
    });
  } catch (error) {
    return res.status(500).json({ message: "Error deleting like" });
  }
};

export const likeUnlikePost = async (req, res) => {
  try {
    const userId = req.userId;
    const { id: postId } = req.params;

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const userLikedPost = post.likes.includes(userId);

    if (userLikedPost) {
      // Unlike
      await Post.updateOne({ _id: postId }, { $pull: { likes: userId } });
      await User.updateOne({ _id: userId }, { $pull: { likedPosts: postId } });

      const updatedLikess = post.likes.filter(
        (id) => id.toString() !== userId.toString()
      );
      res.status(200).json(updatedLikess);
    } else {
      // Like
      post.likes.push(userId);
      await User.updateOne({ _id: userId }, { $push: { likedPosts: postId } });
      await post.save();

      const notification = new Notification({
        from: userId,
        to: post.userId,
        type: "like",
        post: postId, // Corrected logic if necessary
      });
      await notification.save();

      const updatedLikes = post.likes;
      res.status(200).json(updatedLikes);
    }
  } catch (error) {
    console.log("Error in likeUnlikePost controller: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Lay danh sach bai viet da like cua user
export const getLikedPostsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    // Find posts where likes array contains userId
    const posts = await Post.find({ likes: userId })
      .populate("authorId", "userName fullName avatar")
      .sort("-createdAt"); // Note: Sorts by post creation time, not like time

    // Format data
    const formattedPosts = posts.map((post) => {
      return {
        _id: post._id,
        authorId: post.authorId,
        content: post.content, // post model dang dung ca text/content, se chuan hoa o client
        text: post.text,
        images: post.images,
        likes: post.likes,
        commentCount: post.commentCount,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
      };
    });

    res.status(200).json({
      success: true,
      data: formattedPosts,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error fetching liked posts list" });
  }
};
