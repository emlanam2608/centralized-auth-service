import { UserResponse } from "./auth.types";

export interface AssignRoleRequest {
  userId: string;
  roles?: string[];
}

export interface UsersListResponse {
  users: UserResponse[];
}
