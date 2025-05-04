import { Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { supabaseAdmin } from "../config/supabase";
import { AuthenticatedRequest } from "../types/auth.types";
import { ProfileUpdateRequest } from "../types/profile.types";
import { BadRequestError, UnauthorizedError } from "../utils/errors.util";
import { sendSuccess } from "../utils/response.util";

// Get user profile
export const getProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new UnauthorizedError("User not authenticated");
    }

    sendSuccess(
      res,
      {
        user: req.user,
      },
      StatusCodes.OK
    );
  } catch (error) {
    console.error("Profile error:", error);
    next(error);
  }
};

// Update user profile
export const updateProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.id) {
      throw new UnauthorizedError("User not authenticated");
    }

    const { bio, avatar_url } = req.body as ProfileUpdateRequest;

    // Update profile data
    const { data, error } = await supabaseAdmin
      .from("user_profiles")
      .update({
        bio,
        avatar_url,
      })
      .eq("id", req.user.id)
      .select();

    if (error) throw error;

    sendSuccess(
      res,
      {
        message: "Profile updated successfully",
        user: {
          ...req.user,
          bio: data[0].bio,
          avatar_url: data[0].avatar_url,
        },
      },
      StatusCodes.OK
    );
  } catch (error) {
    console.error("Update profile error:", error);
    next(error);
  }
};
