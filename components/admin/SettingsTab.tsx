"use client"
import { View, Text, ScrollView, RefreshControl, StyleSheet, TouchableOpacity } from "react-native"
import { Shield, User as UserIcon, LogOut } from "lucide-react-native"
import { MotiView } from "moti"
import type { User } from "../../app/types"

interface SettingsTabProps {
  users: User[]
  currentUser: any // Firebase Auth User
  refreshing: boolean
  onRefresh: () => Promise<void>
  onUpdateUserRole: (userId: string, isAdmin: boolean) => Promise<void>
  onSignOut: () => Promise<void>
}

export default function SettingsTab({
  users,
  currentUser,
  refreshing,
  onRefresh,
  onUpdateUserRole,
  onSignOut,
}: SettingsTabProps) {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#007AFF"]} />}
      showsVerticalScrollIndicator={false}
    >
      {/* User roles management */}
      <MotiView
        style={styles.card}
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "timing", duration: 500 }}
      >
        <View style={styles.cardHeader}>
          <Shield size={20} color="#007AFF" />
          <Text style={styles.cardTitle}>User Roles</Text>
        </View>

        {users
          .filter((user) => user.id !== currentUser?.uid) // Filter out current admin
          .map((user, index) => (
            <MotiView
              key={user.id}
              style={styles.userRoleItem}
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 300, delay: 200 + index * 50 }}
            >
              <View style={styles.userRoleInfo}>
                <Text style={styles.userRoleName}>{user.name || "Unknown"}</Text>
                <Text style={styles.userRoleEmail}>{user.email || "No email"}</Text>
              </View>

              <View style={styles.userRoleActions}>
                <TouchableOpacity
                  style={[styles.roleButton, user.isAdmin ? styles.roleButtonActive : styles.roleButtonInactive]}
                  onPress={() => onUpdateUserRole(user.id, true)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.roleButtonText,
                      user.isAdmin ? styles.roleButtonTextActive : styles.roleButtonTextInactive,
                    ]}
                  >
                    Admin
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.roleButton, !user.isAdmin ? styles.roleButtonActive : styles.roleButtonInactive]}
                  onPress={() => onUpdateUserRole(user.id, false)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.roleButtonText,
                      !user.isAdmin ? styles.roleButtonTextActive : styles.roleButtonTextInactive,
                    ]}
                  >
                    User
                  </Text>
                </TouchableOpacity>
              </View>
            </MotiView>
          ))}
      </MotiView>

      {/* Admin profile */}
      <MotiView
        style={styles.card}
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "timing", duration: 500, delay: 200 }}
      >
        <View style={styles.cardHeader}>
          <UserIcon size={20} color="#007AFF" />
          <Text style={styles.cardTitle}>Admin Profile</Text>
        </View>

        <View style={styles.adminProfileContainer}>
          <MotiView
            style={styles.adminAvatar}
            from={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 150, delay: 300 }}
          >
            <Text style={styles.adminInitials}>
              {currentUser?.displayName
                ? currentUser.displayName.charAt(0).toUpperCase()
                : currentUser?.email
                  ? currentUser.email.charAt(0).toUpperCase()
                  : "A"}
            </Text>
          </MotiView>

          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 300, delay: 400 }}
          >
            <Text style={styles.adminName}>{currentUser?.displayName || "Admin User"}</Text>
            <Text style={styles.adminEmail}>{currentUser?.email || "No email"}</Text>
          </MotiView>

          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 300, delay: 500 }}
          >
            <TouchableOpacity style={styles.signOutButton} onPress={onSignOut} activeOpacity={0.7}>
              <LogOut size={18} color="#FF3B30" />
              <Text style={styles.signOutButtonText}>Sign Out</Text>
            </TouchableOpacity>
          </MotiView>
        </View>
      </MotiView>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  cardTitle: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  userRoleItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  userRoleInfo: {
    flex: 1,
  },
  userRoleName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  userRoleEmail: {
    fontSize: 13,
    color: "#666",
  },
  userRoleActions: {
    flexDirection: "row",
  },
  roleButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginLeft: 8,
  },
  roleButtonActive: {
    backgroundColor: "#007AFF",
  },
  roleButtonInactive: {
    backgroundColor: "#f5f5f5",
  },
  roleButtonText: {
    fontSize: 13,
    fontWeight: "500",
  },
  roleButtonTextActive: {
    color: "#fff",
  },
  roleButtonTextInactive: {
    color: "#666",
  },
  adminProfileContainer: {
    alignItems: "center",
    paddingVertical: 24,
  },
  adminAvatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#e1f0ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  adminInitials: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#007AFF",
  },
  adminName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 6,
    textAlign: "center",
  },
  adminEmail: {
    fontSize: 15,
    color: "#666",
    marginBottom: 24,
    textAlign: "center",
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff0f0",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ffcccb",
  },
  signOutButtonText: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: "600",
    color: "#FF3B30",
  },
})
