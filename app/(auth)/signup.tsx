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
import { createUserWithEmailAndPassword } from "firebase/auth"
import { doc, setDoc } from "firebase/firestore"
import { Lock, Mail, User, Smartphone, AlertCircle, CheckCircle } from "lucide-react-native"
import { auth, db } from "../config/firebase"
import { LinearGradient } from "expo-linear-gradient"
import { MotiView } from "moti"
import type { User as UserType } from "../types/index"
import * as Device from "expo-device"

const { width, height } = Dimensions.get("window")

export default function SignupScreen() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [phone, setPhone] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [deviceInfo, setDeviceInfo] = useState<any>(null)
  const [imeiStatus, setImeiStatus] = useState<"loading" | "success" | "error" | null>(null)

  useEffect(() => {
    // Get device info when component mounts
    fetchDeviceInfo()
  }, [])

  const fetchDeviceInfo = async () => {
    try {
      setImeiStatus("loading")

      // Handle web platform differently
      if (Platform.OS === "web") {
        const webDeviceInfo = {
          brand: "Web Browser",
          modelName: navigator.userAgent,
          osName: Platform.OS,
          osVersion: "N/A",
          deviceId: "web-" + Math.random().toString(36).substring(7),
          imei: ["web-device"],
        }
        setDeviceInfo(webDeviceInfo)
        setImeiStatus("success")
        return webDeviceInfo
      }

      // For native platforms
      const deviceData = {
        brand: (await Device.brand) || "Unknown",
        modelName: (await Device.modelName) || "Unknown",
        osName: Platform.OS,
        osVersion: (await Device.osVersion) || "Unknown",
        deviceId: (await Device.getDeviceIdAsync()) || "unknown",
        imei: [] as string[],
      }

      // Try to get IMEI (only works on Android with proper permissions)
      if (Platform.OS === "android") {
        try {
          // @ts-ignore - TypeScript doesn't know about this method
          const imei = (await Device.getImei?.()) || (await Device.getDeviceIdAsync())
          if (imei) {
            deviceData.imei.push(imei)
            setImeiStatus("success")
          } else {
            // Fallback to device ID
            deviceData.imei.push(deviceData.deviceId)
            setImeiStatus("success")
          }
        } catch (error) {
          console.log("Error getting IMEI:", error)
          // Fallback to device ID
          deviceData.imei.push(deviceData.deviceId)
          setImeiStatus("error")
        }
      } else {
        // For iOS, use device ID as IMEI is not accessible
        deviceData.imei.push(deviceData.deviceId)
        setImeiStatus("success")
      }

      setDeviceInfo(deviceData)
      return deviceData
    } catch (error) {
      console.error("Error getting device info:", error)
      setImeiStatus("error")

      const fallbackInfo = {
        brand: "Unknown",
        modelName: "Unknown",
        osName: Platform.OS,
        osVersion: "Unknown",
        deviceId: `fallback-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        imei: [`fallback-${Date.now()}-${Math.random().toString(36).substring(7)}`],
      }

      setDeviceInfo(fallbackInfo)
      return fallbackInfo
    }
  }

  const handleSignup = async () => {
    try {
      setError("")
      setSuccess(false)

      if (!name || !email || !password || !phone) {
        setError("Please fill in all fields")
        return
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        setError("Please enter a valid email address")
        return
      }

      // Validate password strength
      if (password.length < 6) {
        setError("Password must be at least 6 characters long")
        return
      }

      // Validate phone number (basic validation)
      const phoneRegex = /^\d{10,15}$/
      if (!phoneRegex.test(phone.replace(/[^0-9]/g, ""))) {
        setError("Please enter a valid phone number")
        return
      }

      // Check if device info was successfully retrieved
      if (!deviceInfo || !deviceInfo.imei || deviceInfo.imei.length === 0) {
        setError("Unable to retrieve device information. Please try again.")
        return
      }

      setLoading(true)

      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)

      // Create user document with extended information
      const userDoc: UserType = {
        id: userCredential.user.uid,
        name,
        email,
        phone,
        isAdmin: false,
        createdAt: new Date().toISOString(),
        deviceInfo,
        lastLogin: new Date().toISOString(),
        status: "active",
        biometricEnabled: true,
        biometricAttempts: [],
        checkInHistory: [],
        checkedIn: false,
      }

      // Create the user document in Firestore
      await setDoc(doc(db, "users", userCredential.user.uid), userDoc)

      // Show success message
      setSuccess(true)

      // Navigate after a short delay
      setTimeout(() => {
        router.replace("/(tabs)")
      }, 1500)
    } catch (error: any) {
      console.error("Signup error:", error)

      // More user-friendly error messages
      let errorMessage = "Failed to create account"

      if (error.code === "auth/email-already-in-use") {
        errorMessage = "This email is already in use. Please use a different email or try logging in."
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "The email address is not valid."
      } else if (error.code === "auth/weak-password") {
        errorMessage = "The password is too weak. Please use a stronger password."
      } else if (error.code === "auth/network-request-failed") {
        errorMessage = "Network error. Please check your internet connection and try again."
      } else if (error.message) {
        errorMessage = error.message
      }

      setError(errorMessage)
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
              source={{ uri: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800" }}
              style={styles.headerImage}
            />
            <Text style={styles.logoText}>GeoAttendance</Text>
          </View>

          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Sign up to get started</Text>

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

          {success ? (
            <MotiView
              from={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              style={styles.successContainer}
            >
              <CheckCircle size={20} color="#34C759" />
              <Text style={styles.successText}>Account created successfully!</Text>
            </MotiView>
          ) : null}

          <View style={styles.deviceInfoContainer}>
            <Text style={styles.deviceInfoTitle}>Device Information</Text>
            <View style={styles.deviceInfoRow}>
              <Text style={styles.deviceInfoLabel}>Device:</Text>
              <Text style={styles.deviceInfoValue}>
                {deviceInfo?.brand} {deviceInfo?.modelName}
              </Text>
            </View>
            <View style={styles.deviceInfoRow}>
              <Text style={styles.deviceInfoLabel}>IMEI/ID:</Text>
              <View style={styles.deviceIdContainer}>
                {imeiStatus === "loading" ? (
                  <ActivityIndicator size="small" color="#6C63FF" />
                ) : imeiStatus === "success" ? (
                  <View style={styles.deviceIdSuccess}>
                    <Text style={styles.deviceInfoValue} numberOfLines={1} ellipsizeMode="middle">
                      {deviceInfo?.imei?.[0] || "Unknown"}
                    </Text>
                    <CheckCircle size={16} color="#34C759" style={styles.deviceIdIcon} />
                  </View>
                ) : (
                  <View style={styles.deviceIdError}>
                    <Text style={styles.deviceInfoValue} numberOfLines={1} ellipsizeMode="middle">
                      Unable to retrieve
                    </Text>
                    <AlertCircle size={16} color="#FF3B30" style={styles.deviceIdIcon} />
                  </View>
                )}
              </View>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <User size={20} color="#6C63FF" />
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              value={name}
              onChangeText={setName}
              placeholderTextColor="#A0A0A0"
            />
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
            <Smartphone size={20} color="#6C63FF" />
            <TextInput
              style={styles.input}
              placeholder="Phone Number"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
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
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignup}
            disabled={loading || imeiStatus === "loading"}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.buttonText}>Sign Up</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/login" style={styles.link}>
              Sign In
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
    paddingTop: 40,
    paddingBottom: 40,
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
    marginBottom: 24,
    textAlign: "center",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFE5E5",
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
  },
  errorText: {
    marginLeft: 10,
    color: "#FF3B30",
    fontSize: 14,
    flex: 1,
  },
  successContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E5F9F6",
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
  },
  successText: {
    marginLeft: 10,
    color: "#34C759",
    fontSize: 14,
    flex: 1,
  },
  deviceInfoContainer: {
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#EFEFEF",
  },
  deviceInfoTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 10,
  },
  deviceInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  deviceInfoLabel: {
    width: 70,
    fontSize: 14,
    color: "#666",
  },
  deviceInfoValue: {
    fontSize: 14,
    color: "#333",
    flex: 1,
  },
  deviceIdContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  deviceIdSuccess: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  deviceIdError: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  deviceIdIcon: {
    marginLeft: 8,
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
})
