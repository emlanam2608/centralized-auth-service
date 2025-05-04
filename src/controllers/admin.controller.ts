import { Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { supabaseAdmin } from "../config/supabase";
import { AuthenticatedRequest } from "../types/auth.types";
import { AssignRoleRequest } from "../types/admin.types";
import { BadRequestError, ForbiddenError } from "../utils/errors.util";
import { sendSuccess } from "../utils/response.util";

// Get all users (admin-only)
export const getAllUsers = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.roles.includes("admin")) {
      throw new ForbiddenError("Access denied: Admin role required");
    }

    // Get all users with their emails from auth.users
    const { data: authUsers, error: authError } =
      await supabaseAdmin.auth.admin.listUsers();

    if (authError) throw authError;

    // Get all profiles
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("user_profiles")
      .select("id, roles, created_at")
      .order("created_at", { ascending: false });

    if (profilesError) throw profilesError;

    // Combine data from both sources
    const users = authUsers.users.map((authUser) => {
      const profile = profiles.find((p) => p.id === authUser.id) || {
        roles: ["user"],
      };
      return {
        id: authUser.id,
        email: authUser.email,
        roles: profile.roles,
        created_at: authUser.created_at,
        last_sign_in_at: authUser.last_sign_in_at,
      };
    });

    sendSuccess(res, { users }, StatusCodes.OK);
  } catch (error) {
    console.error("Get users error:", error);
    next(error);
  }
};

// Assign admin role to a user (admin-only)
export const assignRole = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.roles.includes("admin")) {
      throw new ForbiddenError("Access denied: Admin role required");
    }

    const { userId, roles = ["user", "admin"] } = req.body as AssignRoleRequest;

    if (!userId) {
      throw new BadRequestError("User ID is required");
    }

    // Update user's roles
    const { data, error } = await supabaseAdmin
      .from("user_profiles")
      .update({ roles })
      .eq("id", userId)
      .select();

    if (error) throw error;

    sendSuccess(
      res,
      {
        message: "Roles assigned successfully",
        user: data[0],
      },
      StatusCodes.OK
    );
  } catch (error) {
    console.error("Assign role error:", error);
    next(error);
  }
};
