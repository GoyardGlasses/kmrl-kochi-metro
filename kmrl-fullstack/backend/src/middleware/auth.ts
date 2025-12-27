import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "@/config/env";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      if (env.nodeEnv === "development") {
        req.user = { id: "dev-user", email: "dev@kmrl.local", role: "superadmin" };
        return next();
      }
      return res.status(401).json({ error: "No token provided" });
    }

    const decoded = jwt.verify(token, env.jwtSecret) as any;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

export const requireSuperAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'superadmin') {
    return res.status(403).json({ error: "Requires superadmin role" });
  }
  next();
};

export const generateToken = (userId: string, email: string, role: string): string => {
  return jwt.sign(
    { id: userId, email, role },
    env.jwtSecret,
    { expiresIn: env.jwtExpire } as any
  );
};
