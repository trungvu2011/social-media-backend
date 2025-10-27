import Comment from '../models/comment.model.js';
import Post from '../models/post.model.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Create new comment
export const createComment = asyncHandler(async (req, res) => {
  const { postId, content } = req.body;
  const userId = req.user._id;

  // Validate content
  if (!content?.trim()) {
    throw new ApiError(400, "Comment content cannot be empty");
  }

  // Check if post exists
  const post = await Post.findById(postId);
  if (!post) {
    throw new ApiError(404, "Post not found");
  }

  const comment = await Comment.create({
    content,
    post: postId,
    user: userId
  });

  await comment.populate('user', 'name avatar');

  res.status(201).json({
    success: true,
    data: comment
  });
});

// Get all comments for a post
export const getAllComments = asyncHandler(async (req, res) => {
  const { postId } = req.query;

  const comments = await Comment.find({ post: postId })
    .populate('user', 'name avatar')
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    data: comments
  });
});

// Get comment details
export const getCommentById = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.id)
    .populate('user', 'name avatar')
    .populate('post', 'content');

  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  res.status(200).json({
    success: true,
    data: comment
  });
});

// Update comment
export const updateComment = asyncHandler(async (req, res) => {
  const { content } = req.body;
  
  if (!content?.trim()) {
    throw new ApiError(400, "Comment content cannot be empty");
  }

  const comment = await Comment.findById(req.params.id);

  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  // Check update permission
  if (comment.user.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You don't have permission to update this comment");
  }

  comment.content = content;
  await comment.save();

  res.status(200).json({
    success: true,
    data: comment
  });
});

// Delete comment
export const deleteComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.id);

  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  // Check delete permission
  if (comment.user.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You don't have permission to delete this comment");
  }

  await comment.remove();

  res.status(200).json({
    success: true,
    message: "Comment deleted successfully"
  });
});
