import Follow from "../models/follow.model.js";
import User from "../models/user.model.js";
import mongoose from "mongoose";
import Notification from "../models/notification.model.js";

// ==================================================
// FOLLOW CONTROLLER
// --------------------------------------------------
// Responsibilities:
// - Handle follow / unfollow actions
// - Retrieve followers & following lists
// - Generate follow-related notifications
// - Provide user suggestions (not yet followed)
//
// Notes:
// - All endpoints assume authentication middleware
// - userId is extracted from verified JWT token
// ==================================================

//Theo doi nguoi khác
// --------------------------------------------------
// CREATE FOLLOW
// --------------------------------------------------
// Purpose:
// - Allow authenticated user to follow another user
//
// Flow:
// 1. Extract followingId from request body
// 2. Get current userId from auth token
// 3. Prevent self-following
// 4. Check if follow relationship already exists
// 5. Create follow record
// 6. Create notification for followed user
//
// Error cases:
// - Following self
// - Already followed
// --------------------------------------------------
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
// --------------------------------------------------
// GET ALL FOLLOWERS
// --------------------------------------------------
// Purpose:
// - Retrieve all users who are following a given user
//
// Flow:
// 1. Get target userId from route params
// 2. Query follow records where followingId = userId
// 3. Populate follower user information
// 4. Return only follower user objects
//
// Notes:
// - Sensitive fields are excluded via populate select
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
// --------------------------------------------------
// GET ALL FOLLOWING
// --------------------------------------------------
// Purpose:
// - Retrieve all users that a given user is following
//
// Flow:
// 1. Get userId from route params
// 2. Query follow records where followerId = userId
// 3. Populate following user information
// 4. Return following user list
// --------------------------------------------------
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
// --------------------------------------------------
// DELETE FOLLOW (UNFOLLOW)
// --------------------------------------------------
// Purpose:
// - Allow user to unfollow another user
//
// Flow:
// 1. Extract current userId from token
// 2. Extract followingId from route params
// 3. Prevent unfollowing self
// 4. Delete follow relationship if exists
//
// Error cases:
// - Trying to unfollow self
// - Follow relationship not found
// --------------------------------------------------
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
// --------------------------------------------------
// GET USER SUGGESTIONS
// --------------------------------------------------
// Purpose:
// - Suggest users that the current user has not followed yet
//
// Flow:
// 1. Get authenticated userId
// 2. Cast userId strictly to ObjectId
// 3. Retrieve list of users already followed
// 4. Exclude followed users and self
// 5. Return limited list of suggested users
//
// Notes:
// - Limit result to avoid heavy queries
// - Can be extended with mutual-follow logic
// --------------------------------------------------
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
