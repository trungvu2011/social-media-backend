import Follow from "../models/follow.model.js";
import Post from "../models/post.model.js";
import mongoose from "mongoose";
import Notification from "../models/notification.model.js";
import { SOCKET_EVENTS } from "../lib/socket.events.js";

// Helper: parse images from body and uploaded files
const parseImages = (bodyImagesInput, filesField) => {
  const fileImages = Array.isArray(filesField)
    ? filesField.map((f) => f.path)
    : [];
  let bodyImages = [];
  let provided = false;

  if (Array.isArray(bodyImagesInput)) {
    bodyImages = bodyImagesInput;
    provided = true;
  } else if (
    typeof bodyImagesInput === "string" &&
    bodyImagesInput.trim() !== ""
  ) {
    const str = bodyImagesInput.trim();
    bodyImages = str.startsWith("[")
      ? JSON.parse(str)
      : str
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
    provided = true;
  }

  return { images: [...bodyImages, ...fileImages], provided };
};

const isValidObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(String(id));

// Tao bai viet moi
export const createPost = async (req, res) => {
  try {
    const rawText = req.body?.text ?? req.body?.content;
    const text = typeof rawText === "string" ? rawText : "";
    const userId = req.userId;

    const { images } = parseImages(req.body.images, req.files?.images);

    const authorId = userId;

    if ((!text || text.trim() === "") && images.length === 0) {
      return res
        .status(400)
        .json({ message: "Cần cung cấp nội dung hoặc hình ảnh" });
    }
    const post = new Post({ text, images, authorId });
    await post.save();

    // Emit Socket.io event: thông báo có post mới (không gửi data)
    const io = req.app.get("io");
    if (io) {
      // Broadcast to all followers
      const followers = await Follow.find({ followingId: userId });
      followers.forEach((follower) => {
        io.to(`user:${follower.followerId}`).emit(SOCKET_EVENTS.NEW_POST_AVAILABLE, {
          authorId: userId,
          timestamp: new Date(),
        });
      });
    }

    res.status(201).json(post);
  } catch (err) {
    return res.status(500).json({ message: "Lỗi khi tạo bài viết" });
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
      //"likeCount",
      "commentCount",
    ];

    if (!allowedSortFields.includes(sortBy)) {
      sortBy = "createdAt";
    }

    const filter = {};
    if (authorId && !/^[0-9a-fA-F]{24}$/.test(String(authorId))) {
      return res.status(400).json({ message: "ID tác giả không hợp lệ" });
    }
    if (authorId) filter.authorId = authorId;

    if (search) {
      const q = String(search).trim();
      if (q) {
        const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"); // escape + case-insensitive
        // Tim theo 'text' va fallback 'content' cho du lieu cu
        filter.$or = [{ text: regex }, { content: regex }];
      }
    }

    // Dem tong so bai viet phu hop
    const total = await Post.countDocuments(filter);

    // truy van chinh voi phan trang, sap xep va populate
    const posts = await Post.find(filter)
      .sort({ [sortBy]: order === "asc" ? 1 : -1 })
      .skip(skip)
      .limit(limit)
      .populate("authorId", "userName fullName avatar")
      .populate({
        path: "sharedPost",
        populate: {
          path: "authorId",
          select: "userName fullName avatar",
        },
      })
      .lean();

    // Chuan hoa truong text de luon co gia tri (fallback tu content neu can)
    const normalized = posts.map((p) => ({
      ...p,
      text: p.text ?? p.content ?? "",
    }));

    const pages = Math.ceil(total / limit);

    res.json({
      data: normalized,
      meta: { total, page, limit, pages },
    });
  } catch (err) {
    console.error("Error in getAllPosts:", err);
    return res
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
      return res.status(400).json({ message: "ID bài viết không hợp lệ" });
    }
    const post = await Post.findById(id)
      .populate("authorId", "userName fullName avatar")
      .populate({
        path: "sharedPost",
        populate: {
          path: "authorId",
          select: "userName fullName avatar",
        },
      })
      .lean();
    if (!post) {
      return res.status(404).json({ message: "Không tìm thấy bài viết" });
    }
    // Chuan hoa text
    post.text = post.text ?? post.content ?? "";
    res.json(post);
  } catch (err) {
    return res.status(500).json({ message: "Lỗi khi lấy thông tin bài viết" });
  }
};

// Cap nhat bai viet theo ID (chi tac gia duoc cap nhat)
export const updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    // Validate dinh dang ObjectId cho id
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "ID bài viết không hợp lệ" });
    }
    const rawText = req.body?.text ?? req.body?.content;
    const text = rawText === undefined ? undefined : String(rawText);
    const userId = req.userId;

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ message: "Không tìm thấy bài viết" });
    }

    const isAuthor = post.authorId && post.authorId.toString() === userId;
    if (!userId || !isAuthor) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền cập nhật bài viết này" });
    }

    const { images: parsedImages, provided: imagesProvided } = parseImages(
      req.body.images,
      req.files?.images
    );
    const newImages = imagesProvided ? parsedImages : undefined;

    // Yeu cau it nhat mot truong duoc cap nhat
    if (text === undefined && newImages === undefined) {
      return res.status(400).json({ message: "Không có gì để cập nhật" });
    }

    // Kiem tra khong duoc xoa het noi dung va anh
    if (
      (text === "" || text === null) &&
      newImages !== undefined &&
      newImages.length === 0
    ) {
      return res.status(400).json({ message: "Cần có nội dung hoặc hình ảnh" });
    }

    // Update fields if provided
    if (text !== undefined) post.text = text;
    if (newImages !== undefined) post.images = newImages;

    const saved = await post.save();
    const populated = await Post.findById(saved._id)
      .populate("authorId", "username avatar fullName")
      .lean();
    // Chuan hoa text (phong truong hop du lieu cu)
    populated.text = populated.text ?? populated.content ?? "";
    res.json(populated);
  } catch (err) {
    return res.status(500).json({ message: "Lỗi khi cập nhật bài viết" });
  }
};

// Xoa bai viet theo ID (chi tac gia duoc xoa)
export const deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    // Validate dinh dang ObjectId cho id
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "ID bài viết không hợp lệ" });
    }
    const userId = req.userId;

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ message: "Không tìm thấy bài viết" });
    }

    // Kiem tra quyen xoa
    // Kiem tra quyen xoa
    const user = await import("../models/user.model.js").then((m) =>
      m.default.findById(userId)
    );
    const isAdmin = user && user.role === "admin";
    const isAuthor = post.authorId && post.authorId.toString() === userId;

    if (!userId || (!isAuthor && !isAdmin)) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền xóa bài viết này" });
    }

    await Post.findByIdAndDelete(id);
    res.json({ message: "Xóa bài viết thành công" });
  } catch (err) {
    return res.status(500).json({ message: "Lỗi khi xóa bài viết" });
  }
};

// Lay bai viet tu nhung nguoi ma user dang theo doi
export const getFollowedPosts = async (req, res) => {
  try {
    const userId = req.userId;
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
      .populate("authorId", "userName fullName avatar")
      .populate({
        path: "sharedPost",
        populate: {
          path: "authorId",
          select: "userName fullName avatar",
        },
      })
      .lean();

    const normalized = posts.map((p) => ({
      ...p,
      text: p.text ?? p.content ?? "",
    }));
    const pages = Math.ceil(total / limit);

    res.json({
      data: normalized,
      meta: {
        total,
        page,
        limit,
        pages,
      },
    });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Lỗi khi lấy bài viết từ những người đang theo dõi" });
  }
};

// chuc nang like bai viet (atomic + idempotent)
export const likePost = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "ID bài viết không hợp lệ" });
    }
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: "Chưa xác thực" });
    }

    // Atomic conditional update: only add like and increment if user hasn't liked
    const result = await Post.updateOne(
      { _id: id, likes: { $ne: userId } },
      { $addToSet: { likes: userId } }
    );

    if (result.matchedCount === 0) {
      // Disambiguate: post not found vs already liked
      const exists = await Post.exists({ _id: id });
      if (!exists)
        return res.status(404).json({ message: "Không tìm thấy bài viết" });
      // Already liked -> return current state
    }

    const populated = await Post.findById(id)
      .populate("authorId", "username avatar")
      .lean();

    // --------------- Notification Logic ---------------
    if (result.matchedCount > 0) {
      const postAuthorId = populated.authorId._id;
      if (postAuthorId.toString() !== userId.toString()) {
        await Notification.create({
          receiverId: postAuthorId,
          senderId: userId,
          type: "like",
          referenceId: id,
          content: `liked your post`,
        });

        // Emit real-time notification
        const io = req.app.get("io");
        const user = await import("../models/user.model.js").then((m) =>
          m.default.findById(userId, "userName avatar")
        );
        if (io && user) {
          io.to(`user:${postAuthorId}`).emit(SOCKET_EVENTS.NOTIFICATION_NEW, {
            type: "like",
            sender: {
              id: userId,
              userName: user.userName,
              avatar: user.avatar,
            },
            postId: id,
            message: `${user.userName} liked your post`,
            timestamp: new Date(),
          });
        }
      }
    }

    // Emit real-time like event to post room
    const io = req.app.get("io");
    if (io && result.modifiedCount > 0) {
      io.to(`post:${id}`).emit(SOCKET_EVENTS.POST_LIKED, {
        postId: id,
        userId,
        likeCount: populated.likes.length,
        timestamp: new Date(),
      });
    }
    // --------------------------------------------------

    return res.json(populated);
  } catch (err) {
    return res.status(500).json({ message: "Lỗi khi thích bài viết" });
  }
};

// chuc nang bo thich (atomic + idempotent)
export const unlikePost = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "ID bài viết không hợp lệ" });
    }
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: "Chưa xác thực" });
    }

    const userIdObjectId = new mongoose.Types.ObjectId(userId);

    // Atomic conditional update: only pull like and decrement if user has liked
    const result = await Post.updateOne(
      { _id: id, likes: { $in: [userIdObjectId] } },
      { $pull: { likes: userIdObjectId } }
    );

    if (result.matchedCount === 0) {
      const exists = await Post.exists({ _id: id });
      if (!exists)
        return res.status(404).json({ message: "Không tìm thấy bài viết" });
      // Not liked -> return current state
    }

    const populated = await Post.findById(id)
      .populate("authorId", "username avatar")
      .lean();

    // Emit real-time unlike event to post room
    const io = req.app.get("io");
    if (io && result.modifiedCount > 0) {
      io.to(`post:${id}`).emit(SOCKET_EVENTS.POST_UNLIKED, {
        postId: id,
        userId,
        likeCount: populated.likes.length,
        timestamp: new Date(),
      });
    }

    return res.json(populated);
  } catch (err) {
    return res.status(500).json({ message: "Lỗi khi bỏ thích bài viết" });
  }
};

// Them binh luan vao bai viet
export const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "ID bài viết không hợp lệ" });
    }
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: "Chưa xác thực" });
    }

    const text = String(req.body?.text ?? req.body?.content ?? "").trim();
    if (!text) {
      return res
        .status(400)
        .json({ message: "Nội dung bình luận không được để trống" });
    }

    const commentDoc = { authorId: userId, text, createdAt: new Date() };

    const updated = await Post.findOneAndUpdate(
      { _id: id },
      {
        $push: { comments: { $each: [commentDoc], $position: 0 } }, // newest-first
        $inc: { commentCount: 1 },
        $set: { updatedAt: new Date() },
      },
      { new: true }
    )
      .populate("comments.authorId", "userName fullName avatar")
      .lean();

    if (!updated) {
      return res.status(404).json({ message: "Không tìm thấy bài viết" });
    }

    const newComment = Array.isArray(updated.comments)
      ? updated.comments[0]
      : null;

    // Emit real-time comment event to post room
    const io = req.app.get("io");
    if (io && newComment) {
      io.to(`post:${id}`).emit(SOCKET_EVENTS.COMMENT_ADDED, {
        postId: id,
        comment: newComment,
        commentCount: updated.commentCount || 0,
        timestamp: new Date(),
      });
    }

    return res.status(201).json({
      postId: id,
      comment: newComment,
      commentCount: updated.commentCount || 0,
    });
  } catch (err) {
    return res.status(500).json({ message: "Lỗi khi thêm bình luận" });
  }
};

// Lay danh sach binh luan cua bai viet (phan trang)
export const getComments = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "ID bài viết không hợp lệ" });
    }

    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.max(
      1,
      Math.min(100, parseInt(req.query.limit || "10", 10))
    );
    const skip = (page - 1) * limit;

    // Use $slice to paginate comments (assumes newest-first order)
    const doc = await Post.findById(id, {
      comments: { $slice: [skip, limit] },
      commentCount: 1,
      _id: 0,
    })
      .populate("comments.authorId", "userName fullName avatar")
      .lean();

    if (!doc) {
      return res.status(404).json({ message: "Không tìm thấy bài viết" });
    }

    const total = doc.commentCount || 0;
    const pages = Math.ceil(total / limit);

    return res.json({
      data: doc.comments || [],
      meta: { total, page, limit, pages },
    });
  } catch (err) {
    return res.status(500).json({ message: "Lỗi khi lấy bình luận" });
  }
};

// Xoa comment
export const deleteComment = async (req, res) => {
  try {
    const { id: postId, commentId: c1, cid: c2 } = req.params;
    const commentId = c1 || c2;

    if (!isValidObjectId(postId) || !isValidObjectId(commentId)) {
      return res
        .status(400)
        .json({ message: "ID bài viết hoặc bình luận không hợp lệ" });
    }

    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: "Chưa xác thực" });
    }

    // Lấy post chứa bình luận để kiểm tra quyền
    const post = await Post.findOne(
      { _id: postId, "comments._id": commentId },
      { authorId: 1, comments: { $elemMatch: { _id: commentId } } }
    ).lean();

    if (!post || !post.comments || post.comments.length === 0) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy bình luận hoặc bài viết" });
    }

    const comment = post.comments[0];
    const isPostOwner = post.authorId?.toString() === userId;
    const isCommentAuthor = comment?.authorId?.toString() === userId;

    if (!isPostOwner && !isCommentAuthor) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền xóa bình luận này" });
    }

    const result = await Post.updateOne(
      { _id: postId },
      {
        $pull: { comments: { _id: commentId } },
        $inc: { commentCount: -1 },
        $set: { updatedAt: new Date() },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Không tìm thấy bài viết" });
    }

    return res.status(200).json({
      success: true,
      message: "Xóa bình luận thành công",
      postId,
      commentId,
    });
  } catch (err) {
    return res.status(500).json({ message: "Lỗi khi xóa bình luận" });
  }
};
// Chia se bai viet
export const sharePost = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "ID bài viết không hợp lệ" });
    }
    const userId = req.userId;
    const text = req.body?.text ?? "";

    // 1. Tim bai viet goc
    const originalPost = await Post.findById(id);
    if (!originalPost) {
      return res.status(404).json({ message: "Không tìm thấy bài viết gốc" });
    }

    // 2. Xac dinh bai viet thuc su can share (tranh long nhau)
    // Neu originalPost da la mot bai share, thi ta se share bai viet GOC ban dau cua no
    const realOriginalPostId = originalPost.sharedPost
      ? originalPost.sharedPost
      : originalPost._id;

    // 3. Tao bai viet moi (bai share)
    const newPost = new Post({
      authorId: userId,
      text: text,
      sharedPost: realOriginalPostId,
    });

    await newPost.save();

    // 4. Tang shareCount cua bai viet goc
    await Post.findByIdAndUpdate(realOriginalPostId, {
      $inc: { shareCount: 1 },
    });

    // 5. Populate thong tin de tra ve frontend
    const populatedPost = await Post.findById(newPost._id)
      .populate("authorId", "userName fullName avatar")
      .populate({
        path: "sharedPost",
        populate: {
          path: "authorId",
          select: "userName fullName avatar",
        },
      });

    // 6. Notification (Optional: Thong bao cho nguoi duoc share)
    // Co the implement sau

    res.status(201).json(populatedPost);
  } catch (err) {
    console.error("Error sharing post:", err);
    return res.status(500).json({ message: "Lỗi khi chia sẻ bài viết" });
  }
};
