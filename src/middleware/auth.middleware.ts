import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { supabaseAdmin } from "../config/supabase";
import { UserResponse, AuthenticatedRequest } from "../types/auth.types";
import { UnauthorizedError, ForbiddenError } from "../utils/errors.util";

// Middleware to verify Supabase JWT token
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader?.split(" ")[1];

    if (!token) {
      throw new UnauthorizedError("Access denied");
    }

    // Verify the token with Supabase
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      throw new ForbiddenError("Invalid or expired token");
    }

    // Get user profile data
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .select("id, roles")
      .eq("id", user.id)
      .single();

    // Set user data in request
    const userData: UserResponse = {
      id: user.id,
      email: user.email!,
      roles: profile?.roles || ["user"],
    };

    // Extend the request with user data
    (req as AuthenticatedRequest).user = userData;

    next();
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
      res.status(err.statusCode).json({
        success: false,
        error: err.message,
      });
      return;
    }

    console.error("Token verification error:", err);
    res.status(StatusCodes.FORBIDDEN).json({
      success: false,
      error: "Invalid or expired token",
    });
    return;
  }
};

// Middleware to check if user has admin role
export const isAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authReq = req as AuthenticatedRequest;

  if (!authReq.user?.roles.includes("admin")) {
    res.status(StatusCodes.FORBIDDEN).json({
      success: false,
      error: "Access denied: Admin role required",
    });
    return;
  }

  next();
};
