import AsyncStorage from "@react-native-async-storage/async-storage"

// Keys for auth storage
const AUTH_USER_KEY = "auth_user_data"

// Save user auth data to local storage
export const saveAuthUser = async (userData: any): Promise<void> => {
  try {
    if (!userData) return

    // Store only the essential auth data needed for offline use
    const authData = {
      uid: userData.uid,
      email: userData.email,
      displayName: userData.displayName,
      photoURL: userData.photoURL,
      providerId: userData.providerId,
      lastLoginAt: userData.lastLoginAt || new Date().toISOString(),
    }

    await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(authData))
    console.log("Auth user data saved to local storage")
  } catch (error) {
    console.error("Error saving auth user data:", error)
  }
}

// Get user auth data from local storage
export const getAuthUser = async (): Promise<any | null> => {
  try {
    const userData = await AsyncStorage.getItem(AUTH_USER_KEY)
    return userData ? JSON.parse(userData) : null
  } catch (error) {
    console.error("Error getting auth user data:", error)
    return null
  }
}

// Clear auth user data from local storage
export const clearAuthUser = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(AUTH_USER_KEY)
    console.log("Auth user data cleared from local storage")
  } catch (error) {
    console.error("Error clearing auth user data:", error)
  }
}

// Check if user is authenticated based on local storage
export const isAuthenticated = async (): Promise<boolean> => {
  try {
    const userData = await getAuthUser()
    return !!userData?.uid
  } catch (error) {
    console.error("Error checking authentication:", error)
    return false
  }
}
