import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
  try {
    // const authHeader = req.headers.authorization;
    // if (!authHeader) return res.status(401).json({ message: "Unauthorized" });

    // const token = authHeader.split(" ")[1];

    const token = req.cookies.accessToken;
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log(decoded);
    req.userId = decoded.id;
    next();
  } catch (err) {
    res.status(403).json({ message: "Forbidden" });
  }
};
