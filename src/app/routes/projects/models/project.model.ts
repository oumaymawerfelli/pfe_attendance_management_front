export interface EmployeeProject {
  id:       string;
  name:     string;
  role:     string;
  progress: number;   // 0–100
  dueDate:  string;   // ISO 8601, e.g. "2026-05-30"
  status:   'IN_PROGRESS' | 'REVIEW' | 'PLANNING' | 'COMPLETED' | 'ON_HOLD';
  color?:   string;   // optional hex, falls back to name-based hash color
}