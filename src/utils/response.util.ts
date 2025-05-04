import { Response } from "express";
import { StatusCodes } from "http-status-codes";

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode: number = StatusCodes.OK
): Response => {
  const response: ApiResponse<T> = {
    success: true,
    data,
  };

  return res.status(statusCode).json(response);
};

export const sendSuccessMessage = (
  res: Response,
  message: string,
  statusCode: number = StatusCodes.OK
): Response => {
  const response: ApiResponse<null> = {
    success: true,
    message,
  };

  return res.status(statusCode).json(response);
};

export const sendError = (
  res: Response,
  message: string,
  statusCode: number = StatusCodes.INTERNAL_SERVER_ERROR
): Response => {
  const response: ApiResponse<null> = {
    success: false,
    error: message,
  };

  return res.status(statusCode).json(response);
};
