import e, { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { supabase, supabaseAdmin } from "../config/supabase";
import {
  RegisterRequest,
  LoginRequest,
  ForgotPasswordRequest,
  ChangePasswordRequest,
  RefreshTokenRequest,
  AuthenticatedRequest,
  ResetPasswordWithTokenRequest,
} from "../types/auth.types";
import { BadRequestError, UnauthorizedError } from "../utils/errors.util";
import {
  sendSuccess,
  sendSuccessMessage,
  sendError,
} from "../utils/response.util";
import { environment } from "../config/environment";

// Register a new user
export const register = async (
  req: Request<{}, {}, RegisterRequest>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Register user with Supabase Auth
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      // Auto-confirm email for simplicity only in development
      // In production, you should handle email confirmation properly
      email_confirm: environment.nodeEnv === "development",
    });

    if (error) throw error;

    sendSuccess(
      res,
      {
        message: "User registered successfully",
        user: {
          id: data.user.id,
          email: data.user.email,
        },
      },
      StatusCodes.CREATED
    );
  } catch (error: any) {
    console.error("Registration error:", error);

    if (error.message.includes("already registered")) {
      sendError(res, "Email already registered", StatusCodes.CONFLICT);
      return;
    }

    next(error);
  }
};

// Login user
export const login = async (
  req: Request<{}, {}, LoginRequest>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Authenticate with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw new UnauthorizedError(error.message);

    // Get user profile data
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("roles")
      .eq("id", data.user.id)
      .single();

    if (profileError && profileError.code !== "PGRST116") {
      // Ignore "not found" errors
      throw profileError;
    }

    sendSuccess(
      res,
      {
        message: "Login successful",
        user: {
          id: data.user.id,
          email: data.user.email,
          roles: profile?.roles || ["user"],
        },
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
        },
      },
      StatusCodes.OK
    );
  } catch (error) {
    console.error("Login error:", error);

    if (error instanceof UnauthorizedError) {
      sendError(res, error.message, error.statusCode);
      return;
    }

    next(error);
  }
};

// Logout user
export const logout = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader?.split(" ")[1];

    if (!token) {
      throw new BadRequestError("No token provided");
    }

    // Sign out from Supabase
    const { error } = await supabaseAdmin.auth.admin.signOut(token);

    if (error) throw error;

    sendSuccessMessage(res, "Logged out successfully", StatusCodes.OK);
  } catch (error) {
    console.error("Logout error:", error);

    if (error instanceof BadRequestError) {
      sendError(res, error.message, error.statusCode);
      return;
    }

    next(error);
  }
};

// Resend verification email
export const resendVerification = async (
  req: Request<{}, {}, ForgotPasswordRequest>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new BadRequestError("Email is required");
    }

    // Generate verification link
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
    });

    if (error) throw error;

    sendSuccessMessage(
      res,
      "Verification email sent successfully",
      StatusCodes.OK
    );
  } catch (error) {
    console.error("Resend verification error:", error);

    if (error instanceof BadRequestError) {
      sendError(res, error.message, error.statusCode);
      return;
    }

    next(error);
  }
};

// Flow 1, Part 1: Request password reset (no authentication required)
export const forgotPassword = async (
  req: Request<{}, {}, ForgotPasswordRequest>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new BadRequestError("Email is required");
    }

    // Send password reset email
    const { error } = await supabase.auth.resetPasswordForEmail(email);

    if (error) throw error;

    sendSuccessMessage(res, "Password reset email sent", StatusCodes.OK);
  } catch (error) {
    console.error("Forgot password error:", error);

    if (error instanceof BadRequestError) {
      sendError(res, error.message, error.statusCode);
      return;
    }

    next(error);
  }
};

// Flow 1, Part 2: Reset password with token (no authentication required)
// This would be accessed via the reset link in the email
export const resetPasswordWithToken = async (
  req: Request<{}, {}, ResetPasswordWithTokenRequest>,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const { password, token } = req.body;

    if (!password) {
      throw new BadRequestError("Password is required");
    }

    if (!token) {
      throw new BadRequestError("Reset token is required");
    }

    // Use the recovery token to update the password
    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) throw error;

    sendSuccessMessage(res, "Password reset successfully", StatusCodes.OK);
  } catch (error) {
    console.error("Reset password with token error:", error);

    if (
      error instanceof BadRequestError ||
      error instanceof UnauthorizedError
    ) {
      return sendError(res, error.message, error.statusCode);
    }

    next(error);
  }
};

// Flow 2: Change password while authenticated
export const changePassword = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const { old_password, new_password, confirm_password } =
      req.body as ChangePasswordRequest;

    if (!old_password || !new_password || !confirm_password) {
      throw new BadRequestError(
        "Old password, new password, and confirmation are required"
      );
    }

    if (!req.user?.id) {
      throw new UnauthorizedError("User not authenticated");
    }

    // Update user's password
    const { error } = await supabaseAdmin.auth.admin.updateUserById(
      req.user.id,
      { password: new_password }
    );

    if (error) throw error;

    sendSuccessMessage(res, "Password changed successfully", StatusCodes.OK);
  } catch (error) {
    console.error("Change password error:", error);

    if (
      error instanceof BadRequestError ||
      error instanceof UnauthorizedError
    ) {
      return sendError(res, error.message, error.statusCode);
    }

    next(error);
  }
};

// Refresh token
export const refreshToken = async (
  req: Request<{}, {}, RefreshTokenRequest>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      throw new BadRequestError("Refresh token is required");
    }

    // Refresh the session
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token,
    });

    if (error) throw error;

    sendSuccess(
      res,
      {
        message: "Token refreshed successfully",
        session: {
          access_token: data.session!.access_token,
          refresh_token: data.session!.refresh_token,
          expires_at: data.session!.expires_at,
        },
      },
      StatusCodes.OK
    );
  } catch (error) {
    console.error("Token refresh error:", error);

    if (error instanceof BadRequestError) {
      sendError(res, error.message, error.statusCode);
    }

    next(error);
  }
};
