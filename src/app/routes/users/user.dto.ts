// src/app/routes/users/user.dto.ts
export interface UserResponseDTO {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phone: string;
  jobTitle: string;
  department: string;
  status: UserStatus;
  enabled: boolean;
  active: boolean;
  accountNonLocked: boolean;
  roles: string[];
  createdAt: Date;
  lastLogin?: Date;
}

export enum UserStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
  LOCKED = 'LOCKED'
}

export interface UserDTO {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  jobTitle?: string;
  department?: string;
  roles?: string[];
  registrationPending: boolean;  // Make sure these are required
  enabled: boolean;
  active: boolean;
  accountNonLocked: boolean;
  avatar?: string;
}