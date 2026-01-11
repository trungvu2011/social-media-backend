// Ban and unban user functions

// Ban user (Admin only)
export const banUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    const adminId = req.userId;

    // Prevent admin from banning themselves
    if (userId === adminId) {
      return res.status(400).json({ message: "You cannot ban yourself" });
    }

    const User = await import("../models/user.model.js").then(m => m.default);
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isBanned) {
      return res.status(400).json({ message: "User is already banned" });
    }

    user.isBanned = true;
    user.bannedAt = new Date();
    user.bannedBy = adminId;
    user.banReason = reason || "No reason provided";
    
    await user.save();

    res.json({ 
      message: "User banned successfully", 
      user: {
        _id: user._id,
        userName: user.userName,
        isBanned: user.isBanned,
        bannedAt: user.bannedAt,
        banReason: user.banReason
      }
    });
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
    console.error(err);
  }
};

// Unban user (Admin only)
export const unbanUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const User = await import("../models/user.model.js").then(m => m.default);
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.isBanned) {
      return res.status(400).json({ message: "User is not banned" });
    }

    user.isBanned = false;
    user.bannedAt = null;
    user.bannedBy = null;
    user.banReason = null;
    
    await user.save();

    res.json({ 
      message: "User unbanned successfully", 
      user: {
        _id: user._id,
        userName: user.userName,
        isBanned: user.isBanned
      }
    });
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
    console.error(err);
  }
};
