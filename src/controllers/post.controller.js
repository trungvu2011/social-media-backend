// Post controller skeletons — placeholders only

import Post from '../models/post.model.js'; // Import Post model

// Create a new post
export const createPost = async (req, res) => {
  try {
    const { title, content, images } = req.body;
    const author = req.user.id; // Get authorId from req.user

    // Require either content or images
    if (!content && (!images || images.length === 0)) {
      return res.status(400).json({ message: "Content or images is required" });
    }

    const post = new Post({ title, content, images, author });
    await post.save();
    res.status(201).json(post);
  } catch (err) {
    res.status(500).json({ message: "Error creating post", error: err.message });
  }
};

// Get all posts with pagination, filtering, and search
export const getAllPosts = async (req, res) => {
  try {
    // Query params for pagination and filtering
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || '10', 10)));
    const skip = (page - 1) * limit;
    const { author, search, sortBy = 'createdAt', order = 'desc' } = req.query;

    // Build filter object
    const filter = {};
    if (author) filter.author = author;
    if (search) {
      const q = String(search).trim();
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'); // escape + case-insensitive
      filter.$or = [{ title: regex }, { content: regex }];
    }

    // Count total posts matching filter
    const total = await Post.countDocuments(filter);

    // Query posts with pagination and populate author fields
    const posts = await Post.find(filter)
      .sort({ [sortBy]: order === 'asc' ? 1 : -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'username avatar')
      .lean();

    const pages = Math.ceil(total / limit);

    res.json({
      data: posts,
      meta: {
        total,
        page,
        limit,
        pages,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Error getting posts", error: err.message });
  }
};

// Get a single post by ID
export const getPostById = async (req, res) => {
  try {
    const { id } = req.params;
    // Validate post ID format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }
    // Find post and populate author fields
    const post = await Post.findById(id).populate('author', 'username avatar').lean();
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: "Error getting post", error: err.message });
  }
};

// Update a post by ID (only author or admin)
export const updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    // Validate post ID format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }
    const { title, content, images } = req.body;
    const userId = req.user && req.user.id;

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Authorization: only author or admin can update
    const isAuthor = post.author && post.author.toString() === userId;
    const isAdmin = req.user && req.user.role === 'admin';
    if (!userId || (!isAuthor && !isAdmin)) {
      return res.status(403).json({ message: "Forbidden: not allowed to update this post" });
    }

    // Require at least one updatable field
    if (title === undefined && content === undefined && images === undefined) {
      return res.status(400).json({ message: "Nothing to update" });
    }
    if (
      (content === '' || content === null) &&
      (images === undefined || (Array.isArray(images) && images.length === 0)) &&
      (title === undefined || title === '')
    ) {
      return res.status(400).json({ message: "At least one of title, content or images is required" });
    }

    // Update fields if provided
    if (title !== undefined) post.title = title;
    if (content !== undefined) post.content = content;
    if (images !== undefined) post.images = images;

    const saved = await post.save();
    // Return populated result
    const populated = await Post.findById(saved._id).populate('author', 'username avatar').lean();
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: "Error updating post", error: err.message });
  }
};

// Delete a post by ID (only author or admin)
export const deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    // Validate post ID format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }
    const userId = req.user && req.user.id;

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Authorization: only author or admin can delete
    const isAuthor = post.author && post.author.toString() === userId;
    const isAdmin = req.user && req.user.role === 'admin';
    if (!userId || (!isAuthor && !isAdmin)) {
      return res.status(403).json({ message: "Forbidden: not allowed to delete this post" });
    }

    await Post.findByIdAndDelete(id);
    res.json({ message: "Post deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting post", error: err.message });
  }
};

// Get posts from users that the current user is following
export const getFollowedPosts = async (req, res) => {
  try {
    // Assume req.user.following is an array of userIds the current user follows
    const following = req.user.following;
    if (!Array.isArray(following) || following.length === 0) {
      return res.json({ data: [], meta: { total: 0, page: 1, limit: 10, pages: 0 } });
    }

    // Pagination query params
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || '10', 10)));
    const skip = (page - 1) * limit;

    // Count total posts from followed users
    const total = await Post.countDocuments({ author: { $in: following } });

    // Get posts, populate author info
    const posts = await Post.find({ author: { $in: following } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'username avatar')
      .lean();

    const pages = Math.ceil(total / limit);

    res.json({
      data: posts,
      meta: {
        total,
        page,
        limit,
        pages,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Error getting followed posts", error: err.message });
  }
};
