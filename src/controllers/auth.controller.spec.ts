import e, { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import {
  register,
  login,
  logout,
  resendVerification,
  forgotPassword,
  refreshToken,
  resetPasswordWithToken,
  changePassword,
} from "./auth.controller";
import { supabase, supabaseAdmin } from "../config/supabase";
import { AuthenticatedRequest } from "../types/auth.types";
import { environment } from "../config/environment";
import { PostgrestError, PostgrestResponse } from "@supabase/supabase-js";

// Mock dependencies
jest.mock("../config/supabase", () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      resend: jest.fn(),
      refreshSession: jest.fn(),
      updateUser: jest.fn(),
    },
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
  },
  supabaseAdmin: {
    auth: {
      admin: {
        createUser: jest.fn(),
        signOut: jest.fn(),
        updateUserById: jest.fn(),
      },
    },
  },
}));

jest.mock("../config/environment", () => ({
  environment: {
    nodeEnv: "test",
  },
}));

describe("Auth Controller", () => {
  let mockRequest: Partial<Request> | AuthenticatedRequest;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
    };
    nextFunction = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("register", () => {
    beforeEach(() => {
      mockRequest = {
        body: {
          email: "test@example.com",
          password: "Password123!",
        },
      };
    });

    it("should register a new user successfully", async () => {
      // Mock Supabase response
      (supabaseAdmin.auth.admin.createUser as jest.Mock).mockResolvedValueOnce({
        data: {
          user: {
            id: "user-id-123",
            email: "test@example.com",
          },
        },
        error: null,
      });

      await register(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // Verify Supabase was called correctly
      expect(supabaseAdmin.auth.admin.createUser).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "Password123!",
        email_confirm: environment.nodeEnv === "development",
      });

      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.CREATED);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: {
            message: "User registered successfully",
            user: {
              id: "user-id-123",
              email: "test@example.com",
            },
          },
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.CREATED);
    });

    it("should handle email already registered error", async () => {
      // Mock Supabase error for existing email
      (supabaseAdmin.auth.admin.createUser as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: {
          message: "User already registered",
        },
      });

      await register(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // Verify error response
      expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.CONFLICT);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: "Email already registered",
        })
      );
    });

    it("should forward other errors to error handler", async () => {
      // Mock Supabase generic error
      const error = new Error("Unknown error");
      (supabaseAdmin.auth.admin.createUser as jest.Mock).mockRejectedValueOnce(
        error
      );

      await register(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // Verify error was passed to next
      expect(nextFunction).toHaveBeenCalledWith(error);
    });
  });

  describe("login", () => {
    beforeEach(() => {
      mockRequest = {
        body: {
          email: "test@example.com",
          password: "Password123!",
        },
      };
    });

    it("should login a user successfully", async () => {
      // Mock Supabase auth response
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValueOnce({
        data: {
          user: {
            id: "user-id-123",
            email: "test@example.com",
          },
          session: {
            access_token: "access-token",
            refresh_token: "refresh-token",
            expires_at: 1234567890,
          },
        },
        error: null,
      });

      // Mock profile query response
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValueOnce({
              data: { roles: ["user", "admin"] },
              error: null,
            }),
          }),
        }),
      });

      await login(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // Verify Supabase was called correctly
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "Password123!",
      });

      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: {
            message: "Login successful",
            user: {
              id: "user-id-123",
              email: "test@example.com",
              roles: ["user", "admin"],
            },
            session: {
              access_token: "access-token",
              refresh_token: "refresh-token",
              expires_at: 1234567890,
            },
          },
        })
      );
    });

    it("should handle invalid credentials", async () => {
      // Mock Supabase auth error
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: { message: "Invalid login credentials" },
      });

      await login(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // Verify error response
      expect(mockResponse.status).toHaveBeenCalledWith(
        StatusCodes.UNAUTHORIZED
      );
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: "Invalid login credentials",
        })
      );
    });

    // Additional login test for profile error handling
    it("should handle profile fetch error", async () => {
      // Mock successful Supabase auth response
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValueOnce({
        data: {
          user: {
            id: "user-id-123",
            email: "test@example.com",
          },
          session: {
            access_token: "access-token",
            refresh_token: "refresh-token",
            expires_at: 1234567890,
          },
        },
        error: null,
      });

      // Mock profile query response with an error that's not PGRST116
      const profileError = {
        message: "Database connection error",
        details: "Failed to connect to database",
        hint: "Check database connectivity",
        code: "PGRST500", // Not PGRST116
      };

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValueOnce({
              data: null,
              error: profileError,
            }),
          }),
        }),
      });

      await login(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // Verify that the error was passed to next
      expect(nextFunction).toHaveBeenCalledWith(profileError);

      // Verify that the response was not sent
      expect(mockResponse.json).not.toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    // Test for the case when user has no profile (PGRST116 error)
    it("should handle missing user profile with default role", async () => {
      // Mock Supabase auth response
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValueOnce({
        data: {
          user: {
            id: "user-id-123",
            email: "test@example.com",
          },
          session: {
            access_token: "access-token",
            refresh_token: "refresh-token",
            expires_at: 1234567890,
          },
        },
        error: null,
      });

      // Mock profile query response with PGRST116 error (not found)
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValueOnce({
              data: null,
              error: {
                message: "The requested resource was not found",
                details: "Resource not found",
                hint: "Make sure the resource exists",
                code: "PGRST116", // This is the not found error that should be handled
              },
            }),
          }),
        }),
      });

      await login(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // Verify response with default role
      expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: {
            message: "Login successful",
            user: {
              id: "user-id-123",
              email: "test@example.com",
              roles: ["user"], // Default role when profile is not found
            },
            session: expect.any(Object),
          },
        })
      );
    });

    it("should forward other errors to error handler", async () => {
      // Mock Supabase generic error
      const error = new Error("Unknown error");
      (supabase.auth.signInWithPassword as jest.Mock).mockRejectedValueOnce(
        error
      );

      await login(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // Verify error was passed to next
      expect(nextFunction).toHaveBeenCalledWith(error);
    });
  });

  describe("logout", () => {
    it("should logout a user successfully", async () => {
      mockRequest = {
        headers: {
          authorization: "Bearer access-token-123",
        },
      };

      (supabaseAdmin.auth.admin.signOut as jest.Mock).mockResolvedValueOnce({
        error: null,
      });

      await logout(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        nextFunction
      );

      // Verify Supabase was called correctly
      expect(supabaseAdmin.auth.admin.signOut).toHaveBeenCalledWith(
        "access-token-123"
      );

      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Logged out successfully",
        })
      );
    });

    it("should handle missing token", async () => {
      // Mock request without authorization header
      mockRequest = {
        headers: {},
      };

      await logout(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        nextFunction
      );

      // Verify error response
      expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: "No token provided",
        })
      );
    });

    it("should handle Supabase sign out error", async () => {
      // Mock request with authorization header
      mockRequest = {
        headers: {
          authorization: "Bearer access-token-123",
        },
      };

      // Mock Supabase error
      const error = new Error("Sign out failed");
      (supabaseAdmin.auth.admin.signOut as jest.Mock).mockResolvedValueOnce({
        error,
      });

      await logout(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        nextFunction
      );

      // Verify error response
      expect(nextFunction).toHaveBeenCalledWith(error);
    });
  });

  describe("resendVerification", () => {
    beforeEach(() => {
      mockRequest = {
        body: {
          email: "test@example.com",
        },
      };
    });

    it("should send verification email successfully", async () => {
      (supabase.auth.resend as jest.Mock).mockResolvedValueOnce({
        error: null,
      });

      await resendVerification(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(supabase.auth.resend).toHaveBeenCalledWith({
        type: "signup",
        email: "test@example.com",
      });

      expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Verification email sent successfully",
        })
      );
    });

    it("should handle missing email", async () => {
      mockRequest = {
        body: {},
      };

      await resendVerification(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: "Email is required",
        })
      );
    });

    it("should forward other errors to error handler", async () => {
      const error = new Error("Verification failed");
      (supabase.auth.resend as jest.Mock).mockResolvedValueOnce({
        error,
      });

      await resendVerification(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(error);
    });
  });

  describe("forgotPassword", () => {
    it("should send password reset email successfully", async () => {
      mockRequest = {
        body: {
          email: "test@example.com",
        },
      };

      (supabase.auth.resetPasswordForEmail as jest.Mock).mockResolvedValueOnce({
        error: null,
      });

      await forgotPassword(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // Verify Supabase was called correctly
      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        "test@example.com"
      );

      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Password reset email sent",
        })
      );
    });

    it("should handle missing email", async () => {
      mockRequest = {
        body: {},
      };

      await forgotPassword(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: "Email is required",
        })
      );
    });

    it("should handle Supabase errors", async () => {
      mockRequest = {
        body: {
          email: "test@example.com",
        },
      };

      // Mock Supabase error
      const error = new Error("Email not found");
      (supabase.auth.resetPasswordForEmail as jest.Mock).mockResolvedValueOnce({
        error,
      });

      await forgotPassword(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(error);
    });
  });

  describe("resetPasswordWithToken", () => {
    beforeEach(() => {
      mockRequest = {
        body: {
          password: "NewPassword123!",
          token: "reset-token-123",
        },
      };
    });

    it("should reset password successfully", async () => {
      (supabase.auth.updateUser as jest.Mock).mockResolvedValueOnce({
        error: null,
      });

      await resetPasswordWithToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(supabase.auth.updateUser).toHaveBeenCalledWith({
        password: "NewPassword123!",
      });

      expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Password reset successfully",
        })
      );
    });

    it("should handle missing password", async () => {
      mockRequest = {
        body: {
          token: "reset-token-123",
        },
      };

      await resetPasswordWithToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: "Password is required",
        })
      );
    });

    it("should handle missing token", async () => {
      mockRequest = {
        body: {
          password: "NewPassword123!",
        },
      };

      await resetPasswordWithToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: "Reset token is required",
        })
      );
    });

    it("should handle Supabase errors", async () => {
      const error = new Error("Invalid reset token");
      (supabase.auth.updateUser as jest.Mock).mockResolvedValueOnce({
        error,
      });

      await resetPasswordWithToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(error);
    });
  });

  describe("changePassword", () => {
    beforeEach(() => {
      mockRequest = {
        body: {
          old_password: "OldPassword123!",
          new_password: "NewPassword123!",
          confirm_password: "NewPassword123!",
        },
        user: {
          id: "user-id-123",
        },
      } as AuthenticatedRequest;
    });

    it("should change password successfully", async () => {
      (
        supabaseAdmin.auth.admin.updateUserById as jest.Mock
      ).mockResolvedValueOnce({
        error: null,
      });

      await changePassword(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(supabaseAdmin.auth.admin.updateUserById).toHaveBeenCalledWith(
        "user-id-123",
        { password: "NewPassword123!" }
      );

      expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Password changed successfully",
        })
      );
    });

    it("should handle missing password fields", async () => {
      mockRequest = {
        body: {
          old_password: "OldPassword123!",
          // Missing new_password and confirm_password
        },
        user: {
          id: "user-id-123",
        },
      } as AuthenticatedRequest;

      await changePassword(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: "Old password, new password, and confirmation are required",
        })
      );
    });

    it("should handle unauthenticated user", async () => {
      mockRequest = {
        body: {
          old_password: "OldPassword123!",
          new_password: "NewPassword123!",
          confirm_password: "NewPassword123!",
        },
        // Missing user object
      } as AuthenticatedRequest;

      await changePassword(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(
        StatusCodes.UNAUTHORIZED
      );
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: "User not authenticated",
        })
      );
    });

    it("should handle Supabase update error", async () => {
      const error = new Error("Password change failed");
      (
        supabaseAdmin.auth.admin.updateUserById as jest.Mock
      ).mockResolvedValueOnce({
        error,
      });

      await changePassword(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(error);
    });
  });

  describe("refreshToken", () => {
    it("should refresh token successfully", async () => {
      mockRequest = {
        body: {
          refresh_token: "refresh-token-123",
        },
      };

      (supabase.auth.refreshSession as jest.Mock).mockResolvedValueOnce({
        data: {
          session: {
            access_token: "new-access-token",
            refresh_token: "new-refresh-token",
            expires_at: 1234567890,
          },
        },
        error: null,
      });

      await refreshToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // Verify Supabase was called correctly
      expect(supabase.auth.refreshSession).toHaveBeenCalledWith({
        refresh_token: "refresh-token-123",
      });

      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: {
            message: "Token refreshed successfully",
            session: {
              access_token: "new-access-token",
              refresh_token: "new-refresh-token",
              expires_at: 1234567890,
            },
          },
        })
      );
    });

    it("should handle missing refresh token", async () => {
      mockRequest = {
        body: {},
      };

      await refreshToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: "Refresh token is required",
        })
      );
    });

    it("should forward other errors to error handler", async () => {
      mockRequest = {
        body: {
          refresh_token: "refresh-token-123",
        },
      };
      const error = new Error("Token refresh failed");

      (supabase.auth.refreshSession as jest.Mock).mockResolvedValueOnce({
        error,
      });

      await refreshToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(error);
    });
  });
});
