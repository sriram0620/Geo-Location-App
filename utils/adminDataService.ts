import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  query,
  where,
  DocumentData,
} from "firebase/firestore";
import { db } from "../app/config/firebase";
import type { User, AttendanceRecord, OfficeLocation, OnsiteRequest } from "../app/types";

/**
 * Fetches all users from the database
 * @returns Array of users
 */
export const fetchUsers = async (): Promise<User[]> => {
  try {
    const usersSnapshot = await getDocs(collection(db, "users"));
    const usersList: User[] = [];

    usersSnapshot.forEach((doc) => {
      const data = doc.data();
      usersList.push({
        id: doc.id,
        name: data.name || "Unknown",
        email: data.email || "Unknown",
        checkedIn: !!data.checkedIn,
        lastCheckIn: data.lastCheckIn || null,
        lastCheckOut: data.lastCheckOut || null,
        isAdmin: !!data.isAdmin,
        createdAt: data.createdAt || new Date().toISOString(),
      });
    });

    return usersList;
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
};

/**
 * Fetches all attendance records from the database
 * @returns Array of attendance records
 */
export const fetchAttendanceRecords = async (): Promise<AttendanceRecord[]> => {
  try {
    const attendanceSnapshot = await getDocs(collection(db, "attendance"));
    const attendanceList: AttendanceRecord[] = [];

    attendanceSnapshot.forEach((doc) => {
      const data = doc.data();
      attendanceList.push({
        id: doc.id,
        userId: data.userId,
        type: data.type,
        timestamp: data.timestamp,
        location: data.location,
      });
    });

    return attendanceList;
  } catch (error) {
    console.error("Error fetching attendance records:", error);
    throw error;
  }
};

/**
 * Fetches the office location from the database
 * @returns Office location data
 */
export const fetchOfficeLocation = async (): Promise<OfficeLocation> => {
  try {
    const officeDoc = await getDoc(doc(db, "settings", "office"));
    
    if (officeDoc.exists()) {
      const data = officeDoc.data();
      return {
        latitude: data.latitude || "",
        longitude: data.longitude || "",
        radius: data.radius || "",
      };
    }
    
    return {
      latitude: "",
      longitude: "",
      radius: "",
    };
  } catch (error) {
    console.error("Error fetching office location:", error);
    throw error;
  }
};

/**
 * Fetches all onsite requests from the database
 * @returns Array of onsite requests
 */
export const fetchOnsiteRequests = async (): Promise<OnsiteRequest[]> => {
  try {
    const requestsSnapshot = await getDocs(collection(db, "onsiteRequests"));
    const requestsList: OnsiteRequest[] = [];

    requestsSnapshot.forEach((doc) => {
      const data = doc.data();
      requestsList.push({
        id: doc.id,
        userId: data.userId,
        userName: data.userName,
        reason: data.reason,
        startDateTime: data.startDateTime,
        endDateTime: data.endDateTime,
        status: data.status || "pending",
        createdAt: data.createdAt || new Date().toISOString(),
      });
    });

    return requestsList;
  } catch (error) {
    console.error("Error fetching onsite requests:", error);
    throw error;
  }
};

/**
 * Updates the status of an onsite request
 * @param requestId Request ID
 * @param status New status (approved/rejected)
 */
export const updateRequestStatus = async (
  requestId: string,
  status: "approved" | "rejected"
): Promise<void> => {
  try {
    const requestRef = doc(db, "onsiteRequests", requestId);
    await updateDoc(requestRef, {
      status,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error updating request status:", error);
    throw error;
  }
};

/**
 * Updates a user's role (admin/regular)
 * @param userId User ID
 * @param isAdmin Whether the user should be an admin
 */
export const updateUserRole = async (
  userId: string,
  isAdmin: boolean
): Promise<void> => {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      isAdmin,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error updating user role:", error);
    throw error;
  }
};

/**
 * Saves the office location to the database
 * @param location Office location data
 */
export const saveOfficeLocation = async (
  location: OfficeLocation
): Promise<void> => {
  try {
    const officeRef = doc(db, "settings", "office");
    await updateDoc(officeRef, {
      latitude: location.latitude,
      longitude: location.longitude,
      radius: location.radius,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error saving office location:", error);
    throw error;
  }
};

/**
 * Formats a date/time object for display
 * @param dateTime The date/time to format (can be Date, timestamp, or timestamp with seconds)
 * @param includeTime Whether to include the time in the formatted string
 * @returns Formatted date/time string
 */
export const formatDateTime = (dateTime: any, includeTime: boolean = true): string => {
  if (!dateTime) return "N/A";
  
  let date: Date;
  
  // Handle Firestore timestamp objects
  if (dateTime?.seconds) {
    date = new Date(dateTime.seconds * 1000);
  } else if (dateTime instanceof Date) {
    date = dateTime;
  } else {
    // Handle ISO string or other formats
    date = new Date(dateTime);
  }
  
  // Format the date part
  const dateOptions: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  };
  
  // Format the time part if requested
  if (includeTime) {
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit'
    };
    return `${date.toLocaleDateString(undefined, dateOptions)} at ${date.toLocaleTimeString(undefined, timeOptions)}`;
  }
  
  return date.toLocaleDateString(undefined, dateOptions);
};

/**
 * Formats duration in minutes to a readable format (Xh Ym)
 * @param minutes Duration in minutes
 * @returns Formatted duration string
 */
export const formatDuration = (minutes: number): string => {
  if (!minutes) return "0h";
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);
  
  if (hours === 0) {
    return `${remainingMinutes}m`;
  } else if (remainingMinutes === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h ${remainingMinutes}m`;
  }
}; 