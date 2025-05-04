import { Router } from "express";
import { body } from "express-validator";
import { getAllUsers, assignRole } from "../controllers/admin.controller";
import { authenticateToken, isAdmin } from "../middleware/auth.middleware";
import { validate } from "../middleware/validators.middleware";

const router = Router();

// Validation rules
const assignRoleValidation = [
  body("userId").notEmpty().withMessage("User ID is required"),
  body("roles").optional().isArray().withMessage("Roles must be an array"),
];

// Routes
router.get("/users", authenticateToken, isAdmin, getAllUsers);
router.post(
  "/assign-role",
  authenticateToken,
  isAdmin,
  validate(assignRoleValidation),
  assignRole
);

export default router;
