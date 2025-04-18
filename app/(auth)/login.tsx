"use client"

import { useState, useEffect } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Dimensions,
} from "react-native"
import { router, Link } from "expo-router"
import { signInWithEmailAndPassword } from "firebase/auth"
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore"
import { Lock, Mail, AlertCircle, WifiOff, Smartphone } from "lucide-react-native"
import { auth, db } from "../config/firebase"
import { LinearGradient } from "expo-linear-gradient"
import { MotiView } from "moti"
import { useNetworkStatus } from "../../utils/networkStatus"
import * as localStorageService from "../../utils/localStorageService"
import { getDeviceInfo, verifyDeviceImei, getDeviceName } from "../../utils/deviceUtils"

const { width, height } = Dimensions.get("window")

export default function LoginScreen() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [deviceInfo, setDeviceInfo] = useState<any>(null)
  const [deviceName, setDeviceName] = useState<string>("Detecting device...")
  const { isOnline } = useNetworkStatus()

  useEffect(() => {
    // Get device info when component mounts
    const fetchDeviceInfo = async () => {
      try {
        const info = await getDeviceInfo()
        if (!info) {
          console.error("Device info is null")
          setDeviceName("Unknown device")
          // Create a fallback device info object
          const fallbackInfo = {
            brand: "Unknown",
            modelName: Platform.OS === "web" ? "Web Browser" : "Device",
            osName: Platform.OS,
            osVersion: "Unknown",
            deviceId: `device-${Date.now()}`,
            imei: [`imei-${Date.now()}`],
          }
          setDeviceInfo(fallbackInfo)
          return
        }

        setDeviceInfo(info)
        setDeviceName(getDeviceName(info))
        console.log("Device info fetched:", info)
      } catch (error) {
        console.error("Error fetching device info:", error)
        setDeviceName("Unknown device")
        // Create a fallback device info object
        const fallbackInfo = {
          brand: "Unknown",
          modelName: Platform.OS === "web" ? "Web Browser" : "Device",
          osName: Platform.OS,
          osVersion: "Unknown",
          deviceId: `device-${Date.now()}`,
          imei: [`imei-${Date.now()}`],
        }
        setDeviceInfo(fallbackInfo)
      }
    }

    fetchDeviceInfo()
  }, [])

  const handleLogin = async () => {
    try {
      setError("")

      if (!email || !password) {
        setError("Please fill in all fields")
        return
      }

      setLoading(true)

      if (!isOnline) {
        setError("Cannot log in while offline. Please connect to the internet.")
        setLoading(false)
        return
      }

      if (!deviceInfo) {
        setError("Unable to identify your device. Please try again.")
        setLoading(false)
        return
      }

      console.log("Attempting login with:", email)

      // Authenticate with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      console.log("Login successful for user:", userCredential.user.uid)

      // Get user document
      const userRef = doc(db, "users", userCredential.user.uid)
      const userDoc = await getDoc(userRef)

      if (userDoc.exists()) {
        const userData = userDoc.data()
        console.log("User data retrieved:", userData.name)

        // Check if device IMEI matches the one saved during registration
        const registeredImei = userData.deviceInfo?.imei || []
        const currentImei = deviceInfo?.imei || []

        console.log("Checking device IMEI:", currentImei, "against registered:", registeredImei)

        const imeiMatches = verifyDeviceImei(registeredImei, currentImei)

        if (!imeiMatches && Platform.OS !== "web") {
          // If IMEI doesn't match and not on web, show error
          console.log("IMEI verification failed")
          setLoading(false)
          setError(
            `Device verification failed. You're using a different device than the one registered. Please contact admin for help.\n\nCurrent device: ${getDeviceName(deviceInfo)}`,
          )

          // Don't sign out immediately, let the user see the error
          setTimeout(async () => {
            await auth.signOut() // Sign out the user after showing the error
          }, 3000)
          return
        }

        console.log("IMEI verification passed")

        // Save user profile to local storage for offline use
        await localStorageService.saveUserProfile({
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          name: userData?.name,
          isAdmin: userData?.isAdmin || false,
          createdAt: userData?.createdAt,
          lastLogin: new Date().toISOString(),
          status: "active",
          biometricEnabled: userData?.biometricEnabled,
          deviceInfo: deviceInfo,
        })

        // Update user's device info and last login
        await updateDoc(userRef, {
          lastLogin: new Date().toISOString(),
          deviceInfo,
          status: "active",
        })

        // Navigate based on user role
        if (userData?.isAdmin) {
          console.log("Navigating to admin dashboard")
          router.replace("/admin")
        } else {
          console.log("Navigating to tabs")
          router.replace("/(tabs)")
        }
      } else {
        // If user document doesn't exist (edge case), create it
        console.log("Creating new user document")
        const newUserData = {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          isAdmin: false,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          deviceInfo,
          status: "active",
          biometricEnabled: true,
          biometricAttempts: [],
          checkInHistory: [],
          checkedIn: false,
        }

        await setDoc(userRef, newUserData)

        // Save user profile to local storage for offline use
        await localStorageService.saveUserProfile({
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          isAdmin: false,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          status: "active",
          biometricEnabled: true,
          deviceInfo: deviceInfo,
        })

        console.log("Navigating to tabs for new user")
        router.replace("/(tabs)")
      }
    } catch (error: any) {
      console.error("Login error:", error)
      setError(error.message || "Invalid email or password")
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <LinearGradient
        colors={["#6C63FF", "#8F87FF", "#BDB9FF"]}
        style={styles.gradientBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <MotiView
          from={{ opacity: 0, translateY: 50 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 800 }}
          style={styles.formContainer}
        >
          <View style={styles.logoContainer}>
            <Image
              source={{ uri: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800" }}
              style={styles.headerImage}
            />
            <Text style={styles.logoText}>GeoAttendance</Text>
          </View>

          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>

          {!isOnline && (
            <MotiView
              from={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              style={[styles.errorContainer, styles.offlineContainer]}
            >
              <WifiOff size={20} color="#fff" />
              <Text style={[styles.errorText, styles.offlineText]}>
                You are offline. Please connect to the internet to log in.
              </Text>
            </MotiView>
          )}

          {error ? (
            <MotiView
              from={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              style={styles.errorContainer}
            >
              <AlertCircle size={20} color="#FF3B30" />
              <Text style={styles.errorText}>{error}</Text>
            </MotiView>
          ) : null}

          <View style={styles.deviceInfoContainer}>
            <Smartphone size={18} color="#6C63FF" />
            <Text style={styles.deviceInfoText}>{deviceName}</Text>
          </View>

          <View style={styles.inputContainer}>
            <Mail size={20} color="#6C63FF" />
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholderTextColor="#A0A0A0"
            />
          </View>

          <View style={styles.inputContainer}>
            <Lock size={20} color="#6C63FF" />
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor="#A0A0A0"
            />
          </View>

          <TouchableOpacity
            style={[styles.button, (loading || !isOnline) && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading || !isOnline}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Link href="/signup" style={[styles.link, !isOnline && styles.linkDisabled]}>
              Sign Up
            </Link>
          </View>
        </MotiView>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBackground: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: height * 0.4,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  formContainer: {
    backgroundColor: "white",
    padding: 24,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 10,
    width: "100%",
    maxWidth: 500,
    alignSelf: "center",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  headerImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
  },
  logoText: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#6C63FF",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
    color: "#333",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
  },
  deviceInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F0FF",
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
  },
  deviceInfoText: {
    marginLeft: 10,
    color: "#6C63FF",
    fontSize: 14,
    flex: 1,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFE5E5",
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
  },
  offlineContainer: {
    backgroundColor: "#FF9500",
  },
  errorText: {
    marginLeft: 10,
    color: "#FF3B30",
    fontSize: 14,
    flex: 1,
  },
  offlineText: {
    color: "#fff",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EFEFEF",
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: "#333",
  },
  button: {
    backgroundColor: "#6C63FF",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
    shadowColor: "#6C63FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: {
    backgroundColor: "#BDB9FF",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  footerText: {
    color: "#666",
  },
  link: {
    color: "#6C63FF",
    fontWeight: "600",
  },
  linkDisabled: {
    color: "#BDB9FF",
  },
})
