import Notification from "../models/notification.model.js";

// Get notifications for the authenticated user
export const getNotifications = async (req, res) => {
  try {
    const userId = req.userId;
    const notifications = await Notification.find({ receiverId: userId })
      .sort({ createdAt: -1 })
      .populate("senderId", "userName avatar")
      .populate("referenceId"); // Optional: populate post if needed, but might be overkill if just id is enough

    res.status(200).json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Mark a single notification as read
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    await Notification.findByIdAndUpdate(id, { isRead: true });
    res.status(200).json({ message: "Marked as read" });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Mark all notifications as read
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.userId;
    await Notification.updateMany({ receiverId: userId }, { isRead: true });
    res.status(200).json({ message: "All marked as read" });
  } catch (error) {
    console.error("Error marking all as read:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Delete a notification
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    await Notification.findByIdAndDelete(id);
    res.status(200).json({ message: "Notification deleted" });
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get unread notification count
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.userId;
    const count = await Notification.countDocuments({ 
      receiverId: userId, 
      isRead: false 
    });
    res.status(200).json({ count });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

