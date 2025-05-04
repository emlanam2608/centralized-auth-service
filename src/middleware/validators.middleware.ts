import { Request, Response, NextFunction } from "express";
import { validationResult, ValidationChain } from "express-validator";
import { StatusCodes } from "http-status-codes";

// Validate request middleware
export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Execute all validations
    await Promise.all(validations.map((validation) => validation.run(req)));

    // Check for validation errors
    const errors = validationResult(req);

    if (errors.isEmpty()) {
      return next();
    }

    // Format validation errors
    const extractedErrors = errors.array().map((err) => {
      if ("path" in err && "msg" in err) {
        return { [err.path]: err.msg };
      }
      return { error: "Invalid input" };
    });

    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      errors: extractedErrors,
    });
  };
};
