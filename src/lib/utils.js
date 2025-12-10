import jwt from "jsonwebtoken";
import crypto from "crypto";

const generateAccessToken = (userId) => {
  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_TTL || "15m",
  });
  return token;
};
const generateRefreshToken = () => {
  return crypto.randomBytes(64).toString("hex");
};

export { generateAccessToken, generateRefreshToken };
