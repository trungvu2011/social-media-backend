import Follow from "../models/follow.model.js";
import Post from "../models/post.model.js";
import { ApiError } from '../utils/ApiError.js';

// Tao bai viet moi
export const createPost = async (req, res) => {
  try {
    const { content } = req.body;
    const userId = req.userId;

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
      throw new ApiError(400, "Cần cung cấp nội dung hoặc hình ảnh");
    }
    const post = new Post({ content, images, authorId });
    await post.save();
    res.status(201).json(post);
  } catch (err) {
    // Nem loi chung neu co van de xay ra
    if (err instanceof ApiError) throw err;
    throw new ApiError(500, "Lỗi khi tạo bài viết");
  }
};
// Lay tat ca bai viet voi phan trang, loc va tim kiem
export const getAllPosts = async (req, res) => {
  try {
    // Phan trang
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.max(
      1,
      Math.min(100, parseInt(req.query.limit || "10", 10)) // Gioi han max la 100
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
    if (authorId && !/^[0-9a-fA-F]{24}$/.test(String(authorId))) {
      throw new ApiError(400, "ID tác giả không hợp lệ");
    }
    if (authorId) filter.authorId = authorId;

    if (search) {
      const q = String(search).trim();
      if (q) {
        const regex = new RegExp(
          q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          "i"
        ); // escape + case-insensitive
        // Chi tim theo content de phu hop voi schema
        filter.$or = [{ content: regex }];
      }
    }

    // Dem tong so bai viet phu hop
    const total = await Post.countDocuments(filter);

    // truy van chinh voi phan trang, sap xep va populate
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
      .json({ message: "Lỗi khi lấy danh sách bài viết", error: err.message });
  }
};

// Lay mot bai viet theo ID
export const getPostById = async (req, res) => {
  try {
    const { id } = req.params;
    // Kiem tra dinh dang ID bai viet
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError(400, "ID bài viết không hợp lệ");
    }

    const post = await Post.findById(id);
    if (!post) {
      throw new ApiError(404, "Không tìm thấy bài viết");
    }

    res.json(post);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(500, "Lỗi khi lấy thông tin bài viết");
  }
};

// Cap nhat bai viet theo ID (chi tac gia duoc cap nhat)
export const updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    // Validate dinh dang ObjectId cho id
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError(400, "ID bài viết không hợp lệ");
    }
    const { content } = req.body;
    const userId = req.userId;

    const post = await Post.findById(id);
    if (!post) {
      throw new ApiError(404, "Không tìm thấy bài viết");
    }

    // Kiem tra quyen: chi tac gia duoc cap nhat
    const isAuthor = post.authorId && post.authorId.toString() === userId;
    if (!userId || !isAuthor) {
      throw new ApiError(403, "Bạn không có quyền cập nhật bài viết này");
    }

    // Thu thap anh tu files hoac body nhu createPost
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
    const newImages = imagesProvided ? [...bodyImages, ...fileImages] : undefined;

    // Yeu cau it nhat mot truong duoc cap nhat
    if (content === undefined && newImages === undefined) {
      throw new ApiError(400, "Không có gì để cập nhật");
    }

    // Kiem tra khong duoc xoa het noi dung va anh
    if (
      (content === "" || content === null) &&
      newImages !== undefined &&
      newImages.length === 0
    ) {
      throw new ApiError(400, "Cần có nội dung hoặc hình ảnh");
    }

    // Cap nhat cac truong neu duoc cung cap
    if (content !== undefined) post.content = content;
    if (newImages !== undefined) post.images = newImages;

    const saved = await post.save();
    // Tra ve ket qua da populate
    const populated = await Post.findById(saved._id)
      .populate("authorId", "username avatar fullName")
      .lean();
    res.json(populated);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(500, "Lỗi khi cập nhật bài viết");
  }
};

// Xoa bai viet theo ID (chi tac gia duoc xoa)
export const deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    // Validate dinh dang ObjectId cho id
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError(400, "ID bài viết không hợp lệ");
    }
    const userId = req.userId;

    const post = await Post.findById(id);
    if (!post) {
      throw new ApiError(404, "Không tìm thấy bài viết");
    }

    // Kiem tra quyen xoa
    const isAuthor = post.authorId && post.authorId.toString() === userId;
    if (!userId || !isAuthor) {
      throw new ApiError(403, "Bạn không có quyền xóa bài viết này");
    }

    await Post.findByIdAndDelete(id);
    res.json({ message: "Xóa bài viết thành công" });
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(500, "Lỗi khi xóa bài viết");
  }
};

// Lay bai viet tu nhung nguoi ma user dang theo doi
export const getFollowedPosts = async (req, res) => {
  try {
    const userId = req.userId;
    console.log("Current User ID:", userId);
    const following = await Follow.find({ followerId: userId }).distinct(
      "followingId"
    );

    if (!Array.isArray(following) || following.length === 0) {
      return res.json({
        data: [],
        meta: { total: 0, page: 1, limit: 10, pages: 0 },
      });
    }

    // Phan trang cua query
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.max(
      1,
      Math.min(100, parseInt(req.query.limit || "10", 10))
    );
    const skip = (page - 1) * limit;

    // Dem tong so bai viet tu nhung nguoi dang theo doi
    const total = await Post.countDocuments({ authorId: { $in: following } });

    // Lay bai viet, populate thong tin tac gia
    const posts = await Post.find({ authorId: { $in: following } })
      .sort({ createdAt: -1 })
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
    throw new ApiError(
      500,
      "Lỗi khi lấy bài viết từ những người đang theo dõi"
    );
  }
};
