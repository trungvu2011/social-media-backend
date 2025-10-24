import User from "../models/user.model.js";
import Session from "../models/session.model.js";
import bcrypt from "bcryptjs";
import { generateAccessToken, generateRefreshToken } from "../lib/utils.js";
import jwt from "jsonwebtoken";
import BrevoProvider from "../config/brevo.js";
import crypto from "crypto";

/**
 * ============================================
 * AUTH CONTROLLER
 * --------------------------------------------
 * Responsibilities:
 * - Handle authentication & authorization flow
 * - Validate user credentials
 * - Issue access & refresh tokens
 * - Handle auth-related errors consistently
 *
 * Notes:
 * - Business logic is kept minimal
 * - Heavy validation should be delegated to middleware
 * - Token-related logic must stay centralized
 * ============================================
 */
// Google Login
//Cho phep nguoi dung dang nhap bang google
export const googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ message: "No credential provided" });
    }

    const googleRes = await fetch(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: {
          Authorization: `Bearer ${credential}`,
        },
      }
    );
    const googleData = await googleRes.json();

    if (googleData.error || !googleData.email) {
      console.error("Google verify error:", googleData);
      return res.status(400).json({ message: "Invalid Google token" });
    }

    const { email, name, picture, sub } = googleData;

    let user = await User.findOne({ email });

    if (!user) {
      const randomPassword =
        Math.random().toString(36).slice(-8) +
        Math.random().toString(36).slice(-8);
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      user = new User({
        userName: email.split("@")[0] + "_" + sub.slice(-4), // Ensure unique username
        fullName: name,
        email,
        password: hashedPassword,
        avatar: picture,
        isVerified: true,
      });
      await user.save();
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await Session.create({
      userId: user._id,
      refreshToken: hashedRefreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000,
    });

    res.status(200).json({
      message: "Google login successful",
      user: {
        id: user.id,
        userName: user.userName,
        fullName: user.fullName,
        email: user.email,
        avatar: user.avatar,
        backgroundImage: user.backgroundImage,
        role: user.role,
      },
      accessToken,
    });
  } catch (e) {
    console.error("Google Login Error:", e);
    res.status(500).json({ message: "System error" });
  }
};

//Sign up
// ------------------------------------------------
// REGISTER
// ------------------------------------------------
// Flow:
// 1. Validate input fields
// 2. Check if email already exists
// 3. Hash password before saving
// 4. Create new user record
// 5. Return sanitized user data
//
// Notes:
// - Password hashing must be done using bcrypt
// - Email uniqueness is enforced at DB level
// ------------------------------------------------
export const signUp = async (req, res) => {
  const { userName, fullName, email, password } = req.body;
  try {
    if (!userName || !fullName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }
    // Kiểm tra trùng email va username
    // Kiểm tra trùng email
    const existUser = await User.findOne({
      $or: [{ email }, { userName }],
    });
    if (existUser)
      return res.status(400).json({
        message:
          existUser.email === email
            ? "Email đã tồn tại!"
            : "Username đã tồn tại!",
      });

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      userName,
      fullName,
      email,
      password: hashedPassword,
    });

    if (newUser) {
      await newUser.save();

      res.status(201).json({
        user: {
          id: newUser.id,
          userName: newUser.userName,
          fullName: newUser.fullName,
          email: newUser.email,
          role: newUser.role,
        },
      });
    } else {
      res.status(400).json({ message: "Lỗi", error: "Invalid user data!" });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

// ------------------------------------------------
// LOGIN
// ------------------------------------------------
// Flow:
// 1. Validate request payload (email, password)
// 2. Normalize email to avoid case mismatch
// 3. Check user existence in database
// 4. Compare password hash
// 5. Generate access & refresh tokens
// 6. Return user info without sensitive fields
//
// Error cases:
// - Missing credentials
// - Invalid email or password
// - User not found
// ------------------------------------------------
export const login = async (req, res) => {
  try {
    //validate request
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    //kiem tra email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }
    //kiem tra mat khau
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    //tao access token va refresh token
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken();

    //luu refresh token vao db
    const hashedRefreshToken = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");
    await Session.create({
      userId: user._id,
      refreshToken: hashedRefreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    //gui token ve client
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000,
    });

    res.status(200).json({
      message: "Login successful",
      user: {
        id: user.id,
        userName: user.userName,
        fullName: user.fullName,
        email: user.email,
        avatar: user.avatar,
        backgroundImage: user.backgroundImage,
        role: user.role,
      },
      accessToken,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

//sign out
// ------------------------------------------------
// LOGOUT
// ------------------------------------------------
// Responsibilities:
// - Invalidate refresh token
// - Clear authentication-related cookies (if any)
//
// Notes:
// - Stateless JWT logout depends on token blacklist
// - This endpoint is idempotent
// ------------------------------------------------
export const signOut = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(400).json({ message: "No refresh token provided" });
    }
    //xoa refresh token trong db
    const hashedRefreshToken = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");
    await Session.findOneAndDelete({ refreshToken: hashedRefreshToken });

    // Xóa cookie refresh token trên client
    res.clearCookie("refreshToken");
    res.clearCookie("accessToken");

    res.sendStatus(200);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

//Refresh access token
// ------------------------------------------------
// REFRESH TOKEN
// ------------------------------------------------
// Flow:
// 1. Extract refresh token from request
// 2. Verify refresh token validity
// 3. Check token expiration & integrity
// 4. Generate new access token
//
// Security notes:
// - Refresh token should have longer TTL
// - Token rotation can be added later
// ------------------------------------------------
export const refreshAccessToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({
        error: ERROR_CODES.UNAUTHORIZED,
        message: "No refresh token provided",
      });
    }
    const hashedRefreshToken = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");
    const session = await Session.findOne({ refreshToken: hashedRefreshToken });
    if (!session) {
      return res.status(401).json({
        error: ERROR_CODES.UNAUTHORIZED,
        message: "Invalid refresh token",
      });
    }
    const userId = session.userId;
    const newAccessToken = generateAccessToken(userId);

    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000,
    });
    res.status(200).json({ accessToken: newAccessToken });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

//Forgot password
export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Email not found" });
    }

    // Tạo token hết hạn 15 phút
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: "15m",
    });
    const resetLink = `${process.env.WEBSITE_DOMAIN}/reset-password?token=${token}`;
    const to = email;
    const html = `
    <h1>Password Reset Request</h1>
    <p>We received a request to reset your password. Click the link below to reset it:</p>
    <h3>${resetLink}</h3>
    <p>If you did not request a password reset, please ignore this email.</p>
    <p>Thank you!</p>
    `;
    const customSubject = "HUST-SOCIAL-MEDIA: Password Reset Request";
    await BrevoProvider.sendEmail(to, customSubject, html);
    res.json({ message: "Password reset link has been sent to your email." });
  } catch (err) {
    res.status(500).json({ message: "Lỗi hệ thống" });
    console.error(err);
  }
};

//Reset password
export const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.status(200).json({ message: "Password has been reset successfully" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi hệ thống" });
    console.error(err);
  }
};

//Change password
export const changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid old password" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).json({ message: "Password changed successfully" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi hệ thống" });
    console.error(err);
  }
};

//Get user profile by user
export const getProfile = async (req, res) => {
  try {
    const profileUserId = req.params.id;
    const user = await User.findById(profileUserId).select("-password -__v");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ user });
  } catch (err) {
    res.status(500).json({ message: "Lỗi hệ thống" });
    console.error(err);
  }
};

//Get user profile by id
export const getProfileById = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Lỗi hệ thống" });
    console.error(err);
  }
};

//Get user profile by username
export const getProfileByUserName = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ userName: username }).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Lỗi hệ thống" });
    console.error(err);
  }
};
//Update user
export const updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const {
      userName,
      email,
      password,
      fullName,
      bio,
      genre,
      birthday,
      isVerified,
    } = req.body;
    if (userName) user.userName = userName;
    if (email) user.email = email;
    if (password) user.password = await bcrypt.hash(password, 10);
    if (fullName) user.fullName = fullName;
    if (bio) user.bio = bio;
    if (genre) user.genre = genre;
    if (birthday) user.birthday = birthday;
    if (isVerified !== undefined) user.isVerified = isVerified;

    // Xử lý ảnh đại diện và ảnh bìa nếu có
    const avatar = req.files?.avatar ? req.files.avatar[0].path : null;
    const backgroundImage = req.files?.backgroundImage
      ? req.files.backgroundImage[0].path
      : null;

    if (avatar) user.avatar = avatar;
    if (backgroundImage) user.backgroundImage = backgroundImage;

    const updatedUser = await user.save();
    res.status(200).json({
      _id: updatedUser._id,
      userName: updatedUser.userName,
      email: updatedUser.email,
      fullName: updatedUser.fullName,
      bio: updatedUser.bio,
      genre: updatedUser.genre,
      birthday: updatedUser.birthday,
      isVerified: updatedUser.isVerified,
      avatar: updatedUser.avatar,
      backgroundImage: updatedUser.backgroundImage,
    });
  } catch (err) {
    res.status(500).json({ message: "Lỗi hệ thống" });
    console.error(err);
  }
};

// Admin: Get all users with post count
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.aggregate([
      {
        $lookup: {
          from: "posts",
          localField: "_id",
          foreignField: "authorId",
          as: "posts",
        },
      },
      {
        $project: {
          _id: 1,
          userName: 1,
          fullName: 1,
          email: 1,
          avatar: 1,
          role: 1,
          createdAt: 1,
          postCount: { $size: "$posts" },
        },
      },
      { $sort: { createdAt: -1 } },
    ]);
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Lỗi hệ thống" });
    console.error(err);
  }
};

// Admin: Delete user
export const deleteUserByAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    // Also delete related data if necessary (posts, comments, etc.) - simplified for now
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi hệ thống" });
    console.error(err);
  }
};

// Admin: Get dashboard stats
export const getAdminStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const Post = await import("../models/post.model.js").then((m) => m.default);
    const totalPosts = await Post.countDocuments();

    // Get growth data for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const userGrowth = await User.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const postGrowth = await Post.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      totalUsers,
      totalPosts,
      userGrowth,
      postGrowth,
    });
  } catch (err) {
    res.status(500).json({ message: "Lỗi hệ thống" });
    console.error(err);
  }
};

//Search users
export const searchUsers = async (req, res) => {
  try {
    const { key, page = 1, limit = 10 } = req.query;
    if (!key || key.trim() === "") {
      return res.status(400).json({
        message: "Search query is required",
      });
    }
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const regex = new RegExp(key.trim(), "i");

    const total = await User.countDocuments({
      $or: [{ userName: regex }, { fullName: regex }],
    });
    const users = await User.find({
      $or: [{ userName: regex }, { fullName: regex }],
    })
      .select("_id userName fullName avatar")
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);
    res.status(200).json({ total, page: pageNum, limit: limitNum, users });
  } catch (err) {
    res.status(500).json({
      error: ERROR_CODES.SERVER_ERROR,
      message: "Internal server error",
    });
    console.error(err);
  }
};
