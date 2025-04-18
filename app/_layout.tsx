"use client"

import { useEffect, useState } from "react"
import { Stack, useRouter, useSegments } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { useFrameworkReady } from "@/hooks/useFrameworkReady"
import { onAuthStateChanged } from "firebase/auth"
import { auth, db } from "./config/firebase"
import { View, ActivityIndicator, Text } from "react-native"
import { doc, getDoc } from "firebase/firestore"
import { useNetworkStatus } from "../utils/networkStatus"
import * as authStorage from "../utils/authStorage"
import * as localStorageService from "../utils/localStorageService"

function useProtectedRoute(user: any, ready: boolean, isOnline: boolean) {
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (!ready) return

    const inAuthGroup = segments[0] === "(auth)"

    const checkAuthState = async () => {
      try {
        console.log("Checking auth state, user:", user?.uid, "segments:", segments, "isOnline:", isOnline)

        if (!user) {
          // If online and not authenticated, redirect to login
          if (isOnline) {
            if (!inAuthGroup) {
              console.log("No user, redirecting to login")
              router.replace("/(auth)/login")
            }
          } else {
            // If offline, check local storage for authentication
            const localUser = await authStorage.getAuthUser()
            if (localUser) {
              // User is authenticated locally
              console.log("Found local user:", localUser.uid)
              const localUserProfile = await localStorageService.getUserProfile()

              // Check if user is admin
              if (localUserProfile?.isAdmin) {
                if (segments[0] !== "admin") {
                  console.log("Local user is admin, redirecting to admin")
                  router.replace("/admin")
                }
              } else {
                if (inAuthGroup) {
                  console.log("Local user is not admin, redirecting to tabs")
                  router.replace("/(tabs)")
                }
              }
            } else {
              // No local authentication, redirect to login
              if (!inAuthGroup) {
                console.log("No local user, redirecting to login")
                router.replace("/(auth)/login")
              }
            }
          }
        } else {
          // User is authenticated with Firebase
          console.log("User is authenticated:", user.uid)

          // Save auth data to local storage for offline use
          await authStorage.saveAuthUser(user)

          // Check if user is admin
          if (isOnline) {
            try {
              const userDoc = await getDoc(doc(db, "users", user.uid))
              if (!userDoc.exists()) {
                // If user document doesn't exist, sign out
                console.log("User document doesn't exist, signing out")
                await auth.signOut()
                await authStorage.clearAuthUser()
                router.replace("/(auth)/login")
                return
              }

              const userData = userDoc.data()
              console.log("User data retrieved:", userData?.name, "isAdmin:", userData?.isAdmin)

              // Save user profile to local storage
              await localStorageService.saveUserProfile({
                uid: user.uid,
                email: user.email,
                name: userData?.name,
                isAdmin: userData?.isAdmin || false,
                createdAt: userData?.createdAt,
                lastLogin: userData?.lastLogin,
                status: userData?.status,
                biometricEnabled: userData?.biometricEnabled,
                deviceInfo: userData?.deviceInfo,
              })

              const isInAdminRoute = segments[0] === "admin"

              if (userData?.isAdmin && !isInAdminRoute) {
                console.log("User is admin, redirecting to admin")
                router.replace("/admin")
              } else if (!userData?.isAdmin && isInAdminRoute) {
                // If not admin but trying to access admin route
                console.log("User is not admin but in admin route, redirecting to tabs")
                router.replace("/(tabs)")
              } else if (inAuthGroup) {
                console.log("User is in auth group, redirecting to tabs")
                router.replace("/(tabs)")
              }
            } catch (error) {
              console.error("Error fetching user data:", error)
              // Handle error gracefully - don't redirect yet
              if (inAuthGroup) {
                router.replace("/(tabs)")
              }
            }
          } else {
            // Offline mode - use locally stored user profile
            try {
              const userProfile = await localStorageService.getUserProfile()

              if (userProfile) {
                const isInAdminRoute = segments[0] === "admin"

                if (userProfile.isAdmin && !isInAdminRoute) {
                  console.log("Offline: User is admin, redirecting to admin")
                  router.replace("/admin")
                } else if (!userProfile.isAdmin && isInAdminRoute) {
                  console.log("Offline: User is not admin but in admin route, redirecting to tabs")
                  router.replace("/(tabs)")
                } else if (inAuthGroup) {
                  console.log("Offline: User is in auth group, redirecting to tabs")
                  router.replace("/(tabs)")
                }
              } else {
                // No local profile, but we have auth - go to tabs
                if (inAuthGroup) {
                  console.log("Offline: No local profile but have auth, redirecting to tabs")
                  router.replace("/(tabs)")
                }
              }
            } catch (error) {
              console.error("Error with offline profile:", error)
              // Handle error gracefully
              if (inAuthGroup) {
                router.replace("/(tabs)")
              }
            }
          }
        }
      } catch (error) {
        console.error("Error in protected route:", error)
        // If there's an error, try to use local authentication
        try {
          const localUser = await authStorage.getAuthUser()
          if (!localUser && !inAuthGroup) {
            console.log("Error occurred and no local user, redirecting to login")
            router.replace("/(auth)/login")
          }
        } catch (navError) {
          console.error("Navigation error:", navError)
          // Last resort - go to login
          if (!inAuthGroup) {
            router.replace("/(auth)/login")
          }
        }
      }
    }

    checkAuthState()
  }, [user, segments, ready, isOnline])
}

export default function RootLayout() {
  useFrameworkReady()
  const [user, setUser] = useState<any>(null)
  const [initialLoad, setInitialLoad] = useState(true)
  const { isOnline } = useNetworkStatus()
  const [offlineAuth, setOfflineAuth] = useState(false)

  useEffect(() => {
    const checkOfflineAuth = async () => {
      if (!isOnline) {
        const localUser = await authStorage.getAuthUser()
        if (localUser) {
          setOfflineAuth(true)
          setUser(localUser)
        }
      }
    }

    checkOfflineAuth()
  }, [isOnline])

  useEffect(() => {
    console.log("Setting up auth state listener")

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("Auth state changed, user:", firebaseUser?.uid)

      if (firebaseUser) {
        // Save auth data for offline use
        await authStorage.saveAuthUser(firebaseUser)
        setUser(firebaseUser)
      } else if (isOnline) {
        // Only clear user if we're online and Firebase says no user
        setUser(null)
      } else {
        // If offline, check local storage
        const localUser = await authStorage.getAuthUser()
        if (localUser) {
          console.log("Using local auth user:", localUser.uid)
          setOfflineAuth(true)
          setUser(localUser)
        } else {
          setUser(null)
        }
      }

      setInitialLoad(false)
    })

    return unsubscribe
  }, [isOnline])

  useProtectedRoute(user, !initialLoad, isOnline)

  if (initialLoad) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 10, color: "#666" }}>Loading app...</Text>
      </View>
    )
  }

  return (
    <>
      {offlineAuth && !isOnline && (
        <View
          style={{
            backgroundColor: "#FF9500",
            padding: 5,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "white", fontSize: 12 }}>Offline Mode - Limited functionality available</Text>
        </View>
      )}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="admin" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/signup" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)/index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)/location" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)/profile" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </>
  )
}
