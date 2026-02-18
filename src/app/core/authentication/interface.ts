export interface User {
  id?: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  jobTitle?: string;
  department?: string;
  service?: string;
  hireDate?: Date;
  contractType?: string;
  baseSalary?: number;
  active?: boolean;
  enabled?: boolean;
  roles?: string[];
  gender?: string;
  nationality?: string;
  maritalStatus?: string;
  nationalId?: string;
  birthDate?: Date;
  [key: string]: any;
}

export interface Token {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  exp?: number;
  token?: string;
}
