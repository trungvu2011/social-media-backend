import mongoose from 'mongoose';
import Like from '../models/like.model.js';
import Post from '../models/post.model.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Create new like
export const createLike = asyncHandler(async (req, res) => {
  const { postId } = req.body;
  const userId = req.user._id;

  // Validate postId
  if (!mongoose.Types.ObjectId.isValid(postId)) {
    throw new ApiError(400, "Invalid post ID");
  }

  // Check if post exists
  const post = await Post.findById(postId);
  if (!post) {
    throw new ApiError(404, "Post not found");
  }

  // Check if already liked
  const existingLike = await Like.findOne({ post: postId, user: userId });
  if (existingLike) {
    throw new ApiError(400, "You have already liked this post");
  }

  // Create new like
  const like = await Like.create({
    post: postId,
    user: userId
  });

  // Add try-catch for populate
  try {
    await like.populate('user', 'name avatar');
  } catch (error) {
    throw new ApiError(500, "Error populating user data");
  }

  // Return minimal data
  res.status(201).json({
    success: true,
    data: {
      _id: like._id,
      post: like.post,
      user: like.user
    }
  });
});

// Get all likes
export const getAllLikes = asyncHandler(async (req, res) => {
  const { postId } = req.query;

  // Optional validation if postId is provided
  if (postId && !mongoose.Types.ObjectId.isValid(postId)) {
    throw new ApiError(400, "Invalid post ID");
  }

  const filter = postId ? { post: postId } : {};
  
  const likes = await Like.find(filter)
    .populate('user', 'name avatar')
    .sort('-createdAt');

  res.status(200).json({
    success: true, 
    data: likes
  });
});

// Get like details
export const getLikeById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Validate ID format
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid like ID format");
  }

  const like = await Like.findById(req.params.id)
    .populate('user', 'name avatar')
    .populate('post', 'content');

  if (!like) {
    throw new ApiError(404, "Like not found");
  }

  res.status(200).json({
    success: true,
    data: like
  });
});

// Update like (rarely used)
export const updateLike = asyncHandler(async (req, res) => {
  const like = await Like.findById(req.params.id);

  if (!like) {
    throw new ApiError(404, "Like not found");
  }

  // Only like creator can update
  if (like.user.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You don't have permission to update this like");
  }

  const updatedLike = await Like.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );

  res.status(200).json({
    success: true,
    data: updatedLike
  });
});

// Delete like
export const deleteLike = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Validate ID format 
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid like ID format");
  }

  const like = await Like.findById(req.params.id);

  if (!like) {
    throw new ApiError(404, "Like not found");
  }

  // Only like creator can delete
  if (like.user.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You don't have permission to delete this like");
  }

  // Use deleteOne instead of deprecated remove()
  await Like.deleteOne({ _id: like._id });

  // Return minimal success response
  res.status(200).json({
    success: true,
    data: null
  });
});
