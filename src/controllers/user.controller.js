import User from "../models/user.model.js";
import Session from "../models/session.model.js";
import bcrypt from "bcryptjs";
import { generateAccessToken, generateRefreshToken } from "../lib/utils.js";

//Sign up
export const signUp = async (req, res) => {
  const { userName, email, password } = req.body;
  try {
    if (!userName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }
    // Kiểm tra trùng email
    const existUser = await User.findOne({ email });
    if (existUser) return res.status(400).json({ message: "Email đã tồn tại" });

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      userName,
      email,
      password: hashedPassword,
    });

    if (newUser) {
      await newUser.save();

      res.status(201).json({
        user: { id: newUser.id, name: newUser.name, email: newUser.email },
      });
    } else {
      res.status(400).json({ message: "Lỗi", error: "Invalid user data!" });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

//Login
export const login = async (req, res) => {
  try {
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
    const refreshToken = generateRefreshToken(user._id);

    //luu refresh token vao db
    await Session.create({
      userId: user._id,
      refreshToken: refreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    //gui token ve client
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      message: "Login successful",
      user: { id: user.id, name: user.name, email: user.email },
      accessToken,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

//sign out
export const signOut = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(400).json({ message: "No refresh token provided" });
    }
    //xoa refresh token trong db
    await Session.deleteOne({ refreshToken: refreshToken });

    // Xóa cookie refresh token trên client
    res.clearCookie("refreshToken");

    res.sendStatus(200);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

//Get user profile
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
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
