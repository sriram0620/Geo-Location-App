"use client"

import { Redirect } from "expo-router"
import { useEffect, useState } from "react"
import { View, Text, ActivityIndicator } from "react-native"
import { auth } from "./config/firebase"
import * as authStorage from "../utils/authStorage"

export default function Index() {
  const [checking, setChecking] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check Firebase auth first
        const user = auth.currentUser

        if (user) {
          setIsAuthenticated(true)
          setChecking(false)
          return
        }

        // Then check local storage
        const localUser = await authStorage.getAuthUser()
        setIsAuthenticated(!!localUser)
        setChecking(false)
      } catch (error) {
        console.error("Auth check error:", error)
        setChecking(false)
      }
    }

    checkAuth()
  }, [])

  if (checking) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#6C63FF" />
        <Text style={{ marginTop: 10, color: "#666" }}>Loading...</Text>
      </View>
    )
  }

  return <Redirect href={isAuthenticated ? "/(tabs)" : "/(auth)/login"} />
}
