import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
  try {
    // Prefer Authorization: Bearer <token> header; fall back to httpOnly cookie
    let token;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log(decoded);
    req.userId = decoded.id;
    next();
  } catch (err) {
    res.status(403).json({ message: "Forbidden" });
  }
};
