import { Router } from "express";
import { body } from "express-validator";
import {
  register,
  login,
  logout,
  forgotPassword,
  refreshToken,
  resendVerification,
  resetPasswordWithToken,
} from "../controllers/auth.controller";
import { authenticateToken } from "../middleware/auth.middleware";
import { validate } from "../middleware/validators.middleware";

const router = Router();

// Validation rules
const registerValidation = [
  body("email").isEmail().withMessage("Valid email is required"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long"),
];

const loginValidation = [
  body("email").isEmail().withMessage("Valid email is required"),
  body("password").notEmpty().withMessage("Password is required"),
];

const passwordResetValidation = [
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long"),
];

const emailValidation = [
  body("email").isEmail().withMessage("Valid email is required"),
];

const refreshTokenValidation = [
  body("refresh_token").notEmpty().withMessage("Refresh token is required"),
];

// Routes
router.post("/register", validate(registerValidation), register);
router.post("/login", validate(loginValidation), login);
router.post("/logout", authenticateToken, logout);
router.post("/forgot-password", validate(emailValidation), forgotPassword);
router.post(
  "/reset-password",
  authenticateToken,
  validate(passwordResetValidation),
  resetPasswordWithToken
);
router.post("/refresh", validate(refreshTokenValidation), refreshToken);
router.post(
  "/resend-verification",
  validate(emailValidation),
  resendVerification
);

export default router;
