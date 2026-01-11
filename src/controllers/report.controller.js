import Report from "../models/report.model.js";
import Post from "../models/post.model.js";
import Comment from "../models/comment.model.js";

// Create a new report
export const createReport = async (req, res) => {
  try {
    const { postId, commentId, reportType, reason, details } = req.body;
    const reporterId = req.userId; 

    // Validate reportType
    if (!reportType || !["post", "comment"].includes(reportType)) {
      return res.status(400).json({ message: "Invalid report type" });
    }

    // Check if target exists
    if (reportType === "post") {
      if (!postId) {
        return res.status(400).json({ message: "Post ID is required for post reports" });
      }
      const post = await Post.findById(postId);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
    } else if (reportType === "comment") {
      if (!commentId) {
        return res.status(400).json({ message: "Comment ID is required for comment reports" });
      }
      const comment = await Comment.findById(commentId);
      if (!comment) {
        return res.status(404).json({ message: "Comment not found" });
      }
    }

    const report = new Report({
      reporterId,
      reportType,
      postId: reportType === "post" ? postId : undefined,
      commentId: reportType === "comment" ? commentId : undefined,
      reason,
      details,
    });

    await report.save();

    res.status(201).json({ message: "Report submitted successfully", report });
  } catch (error) {
    console.error("Create report error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get all reports (Admin only)
export const getReports = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, reportType } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    if (status) {
      query.status = status;
    }
    if (reportType) {
      query.reportType = reportType;
    }

    const reports = await Report.find(query)
      .populate("reporterId", "fullName userName avatar")
      .populate({
        path: "postId",
        select: "text images content authorId createdAt",
        populate: { path: "authorId", select: "fullName userName avatar" }
      })
      .populate({
        path: "commentId",
        select: "content image authorId postId createdAt",
        populate: { path: "authorId", select: "fullName userName avatar" }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Report.countDocuments(query);

    res.status(200).json({
      reports,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      totalReports: total,
    });
  } catch (error) {
    console.error("Get reports error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Update report status (Admin only)
export const updateReportStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["pending", "resolved", "dismissed"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
    }

    const report = await Report.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    res.status(200).json({ message: "Report status updated", report });
  } catch (error) {
    console.error("Update report status error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
