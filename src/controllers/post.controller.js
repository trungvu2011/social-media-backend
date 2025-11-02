import Post from "../models/post.model.js";

// Tạo bài viết mới
export const createPost = async (req, res) => {
  try {
    const { content, userId } = req.body;

    const fileImages = Array.isArray(req.files?.images)
      ? req.files.images.map((f) => f.path)
      : [];
    let bodyImages = [];
    if (Array.isArray(req.body.images)) {
      bodyImages = req.body.images;
    } else if (
      typeof req.body.images === "string" &&
      req.body.images.trim() !== ""
    ) {
      const str = req.body.images.trim();
      bodyImages = str.startsWith("[")
        ? JSON.parse(str)
        : str
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
    }
    const images = [...bodyImages, ...fileImages];

    const authorId = userId;

    if ((!content || content.trim() === "") && images.length === 0) {
      return res.status(400).json({ message: "Content or images is required" });
    }

    const post = new Post({ content, images, authorId });
    await post.save();
    res.status(201).json(post);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error creating post", error: err.message });
  }
};
// Lấy tất cả bài viết với phân trang, lọc và tìm kiếm
export const getAllPosts = async (req, res) => {
  try {
    // Phân trang
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.max(
      1,
      Math.min(100, parseInt(req.query.limit || "10", 10)) // Giới hạn max là 100
    );
    const skip = (page - 1) * limit;

    const { authorId, search, order = "desc" } = req.query;
    let { sortBy = "createdAt" } = req.query;

    const allowedSortFields = [
      "createdAt",
      "updatedAt",
      "likeCount",
      "commentCount",
    ];

    if (!allowedSortFields.includes(sortBy)) {
      sortBy = "createdAt";
    }

    const filter = {};
    if (authorId) filter.authorId = authorId;

    if (search) {
      const q = String(search).trim();
      if (q) {
        const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"); // escape + case-insensitive
        filter.$or = [{ title: regex }, { content: regex }];
      }
    }

    // Đếm tổng số bài viết khớp với filter
    const total = await Post.countDocuments(filter);

    // Truy vấn chính với phân trang, sắp xếp và populate
    const posts = await Post.find(filter)
      .sort({ [sortBy]: order === "asc" ? 1 : -1 })
      .skip(skip)
      .limit(limit)
      .populate("authorId", "username avatar")
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
    console.error("Error in getAllPosts:", err);
    res
      .status(500)
      .json({ message: "Error getting posts", error: err.message });
  }
};

// Lấy một bài viết theo ID
export const getPostById = async (req, res) => {
  try {
    const { id } = req.params;
    // Validate post ID format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }
    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: "Error getting post", error: err.message });
  }
};

// Cập nhật bài viết theo ID (chỉ tác giả hoặc quản trị viên)
export const updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.userId;

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Authorization: only author can update
    const isAuthor = post.authorId && post.authorId.toString() === userId;
    if (!userId || !isAuthor) {
      return res
        .status(403)
        .json({ message: "Forbidden: not allowed to update this post" });
    }

    // Collect images from files and/or body like createPost
    const fileImages = Array.isArray(req.files?.images)
      ? req.files.images.map((f) => f.path)
      : [];
    let bodyImages = [];
    let bodyImagesProvided = false;
    if (Array.isArray(req.body.images)) {
      bodyImages = req.body.images;
      bodyImagesProvided = true;
    } else if (
      typeof req.body.images === "string" &&
      req.body.images.trim() !== ""
    ) {
      const str = req.body.images.trim();
      bodyImages = str.startsWith("[")
        ? JSON.parse(str)
        : str
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
      bodyImagesProvided = true;
    }

    const imagesProvided = bodyImagesProvided || fileImages.length > 0;
    const newImages = imagesProvided
      ? [...bodyImages, ...fileImages]
      : undefined;

    // Require at least one updatable field
    if (content === undefined && newImages === undefined) {
      return res.status(400).json({ message: "Nothing to update" });
    }

    // Validate not clearing everything to empty
    if (
      (content === "" || content === null) &&
      newImages !== undefined &&
      newImages.length === 0
    ) {
      return res.status(400).json({
        message: "At least one of content or images is required",
      });
    }

    // Update fields if provided
    if (content !== undefined) post.content = content;
    if (newImages !== undefined) post.images = newImages;

    const saved = await post.save();
    // Return populated result
    const populated = await Post.findById(saved._id)
      .populate("authorId", "userName avatar fullName")
      .lean();
    res.json(populated);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error updating post", error: err.message });
  }
};

// Delete a post by ID (only author can delete)
export const deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Authorization: only author can delete
    const isAuthor = post.authorId && post.authorId.toString() === userId;
    if (!userId || !isAuthor) {
      return res
        .status(403)
        .json({ message: "Forbidden: not allowed to delete this post" });
    }

    await Post.findByIdAndDelete(id);
    res.json({ message: "Post deleted successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error deleting post", error: err.message });
  }
};

// Get posts from users that the current user is following
export const getFollowedPosts = async (req, res) => {
  try {
    // Assume req.user.following is an array of userIds the current user follows
    const following = req.user.following;
    if (!Array.isArray(following) || following.length === 0) {
      return res.json({
        data: [],
        meta: { total: 0, page: 1, limit: 10, pages: 0 },
      });
    }

    // Pagination query params
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.max(
      1,
      Math.min(100, parseInt(req.query.limit || "10", 10))
    );
    const skip = (page - 1) * limit;

    // Count total posts from followed users
    const total = await Post.countDocuments({ author: { $in: following } });

    // Get posts, populate author info
    const posts = await Post.find({ author: { $in: following } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("author", "username avatar")
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
    res
      .status(500)
      .json({ message: "Error getting followed posts", error: err.message });
  }
};
