// User interface
export interface User {
  id: string;
  name?: string;
  email?: string;
  isAdmin?: boolean;
  checkedIn?: boolean;
  deviceInfo?: {
    brand?: string;
    modelName?: string;
    osName?: string;
    osVersion?: string;
    imei?: string;
    deviceId?: string;
  };
  userId?: string;
  createdAt?: string;
}

// Attendance record interface
export interface AttendanceRecord {
  id: string;
  userId: string;
  timestamp: string;
  type: 'check-in' | 'check-out';
  location?: {
    latitude: number;
    longitude: number;
  };
}

// Processed attendance record interface
export interface ProcessedAttendanceRecord {
  userId: string;
  userName: string;
  userEmail: string;
  date: string;
  checkIn: AttendanceRecord | null;
  checkOut: AttendanceRecord | null;
  duration?: number;
}

// User stats interface
export interface UserStats {
  name?: string;
  email?: string;
  totalMinutesToday: number;
  totalHoursToday: number;
  totalMinutesAllTime: number;
  totalHoursAllTime: number;
}

// Dashboard stats interface
export interface DashboardStats {
  totalUsers: number;
  checkedInUsers: number;
  todayAttendance: number;
  avgHoursToday: number;
  pendingRequests: number;
}

// Office location interface
export interface OfficeLocation {
  latitude: string;
  longitude: string;
  radius: string;
}

// Onsite request interface
export interface OnsiteRequest {
  id: string;
  userId: string;
  userName?: string;
  reason: string;
  startDateTime: any; // Using any since it could be a Firestore timestamp or string
  endDateTime: any; // Using any since it could be a Firestore timestamp or string
  status: 'pending' | 'approved' | 'rejected';
  createdAt?: any;
  updatedAt?: string;
  updatedBy?: string;
} 