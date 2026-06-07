export interface Notification {
  id: number;
  userId: number;
  type: string;
  title: string;
  message: string;
  read: boolean;
  link?: string;
  createdAt: string;
}

export const NOTIFICATION_META: Record<string, { icon: string; color: string; bgColor: string }> = {
  WELCOME:          { icon: 'notifications',        color: '#10b981', bgColor: '#f0fdf4' },
  LATE_ARRIVAL:     { icon: 'access_time',           color: '#f59e0b', bgColor: '#fff8e8' },
  EARLY_DEPARTURE:  { icon: 'exit_to_app',           color: '#f59e0b', bgColor: '#fff8e8' },
  MISSED_CHECKOUT:  { icon: 'warning',               color: '#ef4444', bgColor: '#fef2f2' },
  LEAVE_APPROVED:   { icon: 'check_circle',          color: '#10b981', bgColor: '#f0fdf4' },
  LEAVE_REJECTED:   { icon: 'cancel',                color: '#ef4444', bgColor: '#fef2f2' },
  PROJECT_ASSIGNED: { icon: 'assignment_ind',        color: '#3b82f6', bgColor: '#eff6ff' },
  PM_ASSIGNED:      { icon: 'supervised_user_circle',color: '#8b5cf6', bgColor: '#f5f3ff' },
  PROJECT_UPDATED:  { icon: 'update',                color: '#6366f1', bgColor: '#eef2ff' },
};