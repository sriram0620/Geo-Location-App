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
import { Lock, Mail, AlertCircle } from "lucide-react-native"
import { auth, db } from "../config/firebase"
import * as Device from "expo-device"
import { LinearGradient } from "expo-linear-gradient"
import { MotiView } from "moti"

const { width, height } = Dimensions.get("window")

export default function LoginScreen() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [deviceInfo, setDeviceInfo] = useState<any>(null)

  useEffect(() => {
    // Get device info when component mounts
    getDeviceInfo().then((info) => {
      setDeviceInfo(info)
    })
  }, [])

  const getDeviceInfo = async () => {
    try {
      // Handle web platform differently
      if (Platform.OS === "web") {
        return {
          brand: "Web Browser",
          modelName: navigator.userAgent,
          osName: Platform.OS,
          osVersion: "N/A",
          deviceId: "web-" + Math.random().toString(36).substring(7),
          imei: ["web-device"],
        }
      }

      // For native platforms
      const deviceData = {
        brand: Device.brand || "Unknown",
        modelName: Device.modelName || "Unknown",
        osName: Device.osName || "Unknown",
        osVersion: Device.osVersion || "Unknown",
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
          }
        } catch (error) {
          console.log("Error getting IMEI:", error)
          // Fallback to device ID
          deviceData.imei.push(deviceData.deviceId)
        }
      } else {
        // For iOS, use device ID as IMEI is not accessible
        deviceData.imei.push(deviceData.deviceId)
      }

      return deviceData
    } catch (error) {
      console.error("Error getting device info:", error)
      return {
        brand: "Unknown",
        modelName: "Unknown",
        osName: Platform.OS,
        osVersion: "Unknown",
        deviceId: `fallback-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        imei: [`fallback-${Date.now()}-${Math.random().toString(36).substring(7)}`],
      }
    }
  }

  const handleLogin = async () => {
    try {
      setError("")

      if (!email || !password) {
        setError("Please fill in all fields")
        return
      }

      setLoading(true)

      // Authenticate with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password)

      // Get user document
      const userRef = doc(db, "users", userCredential.user.uid)
      const userDoc = await getDoc(userRef)

      if (userDoc.exists()) {
        const userData = userDoc.data()

        // Check if device IMEI matches the one saved during registration
        const registeredImei = userData.deviceInfo?.imei || []
        const currentImei = deviceInfo?.imei || []

        const imeiMatches = registeredImei.some((savedImei: string) => currentImei.includes(savedImei))

        if (!imeiMatches && Platform.OS !== "web") {
          // If IMEI doesn't match and not on web, show error
          setLoading(false)
          setError("You're using a different device than the one registered. Please contact admin for help.")
          await auth.signOut() // Sign out the user
          return
        }

        // Update user's device info and last login
        await updateDoc(userRef, {
          lastLogin: new Date().toISOString(),
          deviceInfo,
          status: "active",
        })

        // Navigate based on user role
        if (userData?.isAdmin) {
          router.replace("/admin")
        } else {
          router.replace("/(tabs)")
        }
      } else {
        // If user document doesn't exist (edge case), create it
        await setDoc(userRef, {
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
        })

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
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
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
            <Link href="/signup" style={styles.link}>
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
    marginBottom: 30,
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
