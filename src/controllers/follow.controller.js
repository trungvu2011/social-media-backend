import Follow from "../models/follow.model.js";
import User from "../models/user.model.js";
import mongoose from "mongoose";
import Notification from "../models/notification.model.js";

//Theo doi nguoi khác
export const createFollow = async (req, res) => {
  try {
    const { followingId } = req.body; //Lay followerId từ body
    const userId = req.userId; //Lay userId từ token đã xác thực

    if (followingId === userId) {
      return res.status(400).json({ message: "Ko theo doi chinh minh" });
    }

    const exist = await Follow.findOne({
      followerId: userId,
      followingId: followingId,
    });
    if (exist) {
      return res.status(400).json({ message: "Da theo doi nguoi nay" });
    }
    await Follow.create({ followerId: userId, followingId: followingId });

    // --------------- Notification Logic ---------------
    await Notification.create({
      receiverId: followingId,
      senderId: userId,
      type: "follow",
      referenceId: userId, // Link back to the follower
      content: "started following you",
    });
    // --------------------------------------------------

    res.status(201).json({ message: "Theo doi thanh cong" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi hệ thống" });
    console.error(err);
  }
};

//lay tat ca nguoi theo doi minh
export const getAllFollowers = async (req, res) => {
  try {
    const userId = req.params.userId;
    const followers = await Follow.find({ followingId: userId }).populate(
      "followerId",
      "userName fullName email avatar backgroundImage"
    );
    res.status(200).json(followers.map((f) => f.followerId));
  } catch (err) {
    res.status(500).json({ message: "Lỗi hệ thống" });
    console.error(err);
  }
};

//lay tat ca nguoi minh theo doi
export const getAllFollowing = async (req, res) => {
  try {
    const userId = req.params.userId;
    const following = await Follow.find({ followerId: userId }).populate(
      "followingId",
      "userName fullName email avatar backgroundImage birthday"
    );
    res.status(200).json(following.map((f) => f.followingId));
  } catch (err) {
    res.status(500).json({ message: "Lỗi hệ thống" });
    console.error(err);
  }
};

//xoa theo doi
export const deleteFollow = async (req, res) => {
  try {
    const userId = req.userId;
    const followingId = req.params.userId;

    if (followingId === userId) {
      return res.status(400).json({ message: "Ko xoa theo doi chinh minh" });
    }

    const exist = await Follow.findOneAndDelete({
      followerId: userId,
      followingId: followingId,
    });

    if (!exist) {
      return res.status(404).json({ message: "Ko tim thay theo doi" });
    }

    res.status(200).json({ message: "Xoa theo doi thanh cong" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi hệ thống" });
    console.error(err);
  }
};
// Lay goi y ket ban (nguoi chua follow)
export const getSuggestions = async (req, res) => {
  try {
    const userId = req.userId;

    // Strict casting to ObjectId
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Lay danh sach nguoi da follow strictly
    const followingIds = await Follow.find({
      followerId: userObjectId,
    }).distinct("followingId");

    // Them chinh minh vao danh sach loai tru
    followingIds.push(userObjectId);

    // Tim user khong nam trong danh sach da follow
    const suggestions = await User.find({ _id: { $nin: followingIds } })
      .select("userName fullName email avatar backgroundImage")
      .limit(4)
      .lean();

    res.status(200).json({
      success: true,
      data: suggestions,
      debug: {
        userId,
        followingCount: followingIds.length,
        followingIds: followingIds.slice(0, 3), // show first 3
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Lỗi hệ thống" });
    console.error(err);
  }
};
