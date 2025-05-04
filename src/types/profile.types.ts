import { UserResponse } from "./auth.types";

export interface ProfileUpdateRequest {
  bio?: string;
  avatar_url?: string;
}

export interface ProfileResponse {
  message: string;
  user: UserResponse;
}
