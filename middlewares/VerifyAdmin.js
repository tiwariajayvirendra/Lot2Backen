import jwt from "jsonwebtoken";
import { Admin } from "../models/index.js";

const verifyAdmin = async (req, res, next) => {
  try {
    // Check if JWT_SECRET is configured
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not set in environment variables");
      return res.status(500).json({ 
        message: "Server configuration error: JWT_SECRET missing",
        hint: "Please set JWT_SECRET in your .env file"
      });
    }

    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ 
        message: "No authorization header provided",
        hint: "Please include 'Authorization: Bearer <token>' header"
      });
    }

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ 
        message: "Invalid authorization format",
        hint: "Authorization header must start with 'Bearer '"
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token || token.trim() === "") {
      return res.status(401).json({ message: "Token is empty" });
    }

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      if (jwtError.name === "TokenExpiredError") {
        return res.status(401).json({ 
          message: "Token has expired",
          hint: "Please login again"
        });
      } else if (jwtError.name === "JsonWebTokenError") {
        return res.status(401).json({ 
          message: "Invalid token",
          hint: "Token format is incorrect"
        });
      } else {
        throw jwtError;
      }
    }

    // Check if admin exists in database
    const admin = await Admin.findByPk(decoded.id);
    if (!admin) {
      return res.status(401).json({ 
        message: "Unauthorized: Admin not found",
        hint: "Admin account may have been deleted"
      });
    }

    req.admin = admin;
    next();
  } catch (err) {
    console.error("JWT verification error:", err);
    return res.status(500).json({ 
      message: "Internal server error during authentication",
      ...(process.env.NODE_ENV === 'development' && { error: err.message })
    });
  }
};

export default verifyAdmin;
