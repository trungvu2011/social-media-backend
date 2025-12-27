// Socket.io event constants
export const SOCKET_EVENTS = {
  // Like events
  POST_LIKED: "post:liked",
  POST_UNLIKED: "post:unliked",
  
  // Comment events
  COMMENT_ADDED: "comment:added",
  COMMENT_DELETED: "comment:deleted",
  
  // Notification events
  NOTIFICATION_NEW: "notification:new",
  NOTIFICATION_READ: "notification:read",
  
  // Post events (notification only, không auto-insert)
  NEW_POST_AVAILABLE: "feed:new_post_available",
  POST_UPDATED: "post:updated",
  POST_DELETED: "post:deleted",
  
  // User events
  USER_FOLLOWED: "user:followed",
  USER_UNFOLLOWED: "user:unfollowed",
  
  // Room events
  JOIN_POST: "join:post",
  LEAVE_POST: "leave:post",
};
