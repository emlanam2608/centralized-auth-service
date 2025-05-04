import { Router } from "express";
import { body } from "express-validator";
import { getProfile, updateProfile } from "../controllers/profile.controller";
import { authenticateToken } from "../middleware/auth.middleware";
import { validate } from "../middleware/validators.middleware";

const router = Router();

// Validation rules
const profileUpdateValidation = [
  body("bio").optional().isString(),
  body("avatar_url")
    .optional()
    .isURL()
    .withMessage("Avatar URL must be a valid URL"),
];

// Routes
router.get("/profile", authenticateToken, getProfile);
router.put(
  "/profile",
  authenticateToken,
  validate(profileUpdateValidation),
  updateProfile
);

export default router;
