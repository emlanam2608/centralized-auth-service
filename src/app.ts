import express, { Express } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { validateEnvironment, environment } from "./config/environment";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";

// Routes
import authRoutes from "./routes/auth.routes";
import profileRoutes from "./routes/profile.routes";
import adminRoutes from "./routes/admin.routes";

// Validate environment variables
validateEnvironment();

// Create Express app
const app: Express = express();

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Cross-origin resource sharing
app.use(express.json()); // Parse JSON bodies
app.use(morgan("dev")); // HTTP request logger

// Base API path
const API_PREFIX = "/api";

// Routes
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/auth`, profileRoutes); // Profile routes under auth path for consistency
app.use(`${API_PREFIX}/admin`, adminRoutes);

// Basic health check route
app.get(`${API_PREFIX}/health`, (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// 404 handler - must be after all routes
app.use(notFoundHandler);

// Global error handler - must be last
app.use(errorHandler);

// Start server
const PORT = parseInt(environment.port, 10);
app.listen(PORT, () => {
  console.log(`Authentication service running on port ${PORT}`);
  console.log(`Environment: ${environment.nodeEnv}`);
});

export default app;
