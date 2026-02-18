/**
 * Enums and DTO matching backend com.example.pfe.dto.RegisterRequestDTO
 * Adjust enum values to match your Java enums exactly (e.g. Gender, MaritalStatus, Department, ContractType).
 *
 * Note: Your Java RegisterRequestDTO does not include a password field. The frontend sends
 * password in the same JSON body. Either add a password field to RegisterRequestDTO, or have
 * your controller accept a wrapper (e.g. RegisterCommand with registerRequest + password).
 */
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';
export type MaritalStatus = 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED';
export type Department = string;
export type ContractType =
  | 'CDI'
  | 'CDD'
  | 'INTERNSHIP'
  | 'CTP'
  | 'CTT'
  | 'STAGE'
  | 'ALTERNANCE'
  | 'SIVP'
  | 'MISSION'
  | 'FREELANCE'
  | 'ESSAI';

export interface RegisterRequestDTO {
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: Gender;
  nationalId: string;
  nationality: string;
  maritalStatus: MaritalStatus;
  email: string;
  phone: string;
  address?: string;
  jobTitle?: string;
  department: Department;
  service?: string;
  hireDate: string;
  contractType: ContractType;
  contractEndDate?: string;
  baseSalary: number;
  housingAllowance?: number;
  evaluationScore?: number;
  active?: boolean;
  socialSecurityNumber?: string;
  assignedProjectManagerId?: number;
  directManagerId?: number;
  childrenCount?: number;
  roleIds?: number[];
  roleNames?: string[];
}

export type RegisterPayload = RegisterRequestDTO;

// ADD THIS INTERFACE - it was missing
export interface RegistrationResponse {
  userId: number;
  email: string;
  firstName: string;
  lastName: string;
  active: boolean;
  enabled: boolean;
  message: string;
  activationEmailSent: boolean;
}
