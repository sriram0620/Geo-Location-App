import type React from "react"
import { View, Text, TouchableOpacity, StyleSheet } from "react-native"
import { Home, Users, ExternalLink, Settings, MapPin } from "lucide-react-native"
import { MotiView } from "moti"

interface AdminTabBarProps {
  activeTab: string
  onChangeTab: (tab: string) => void
  onResetUser: () => void
}

export default function AdminTabBar({ activeTab, onChangeTab, onResetUser }: AdminTabBarProps) {
  const handleTabPress = (tab: string) => {
    if (tab === "users") {
      onResetUser()
    }
    onChangeTab(tab)
  }

  return (
    <MotiView
      style={styles.tabBar}
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 500, delay: 300 }}
    >
      <TabButton
        label="Dashboard"
        icon={<Home size={22} color={activeTab === "dashboard" ? "#007AFF" : "#8E8E93"} />}
        active={activeTab === "dashboard"}
        onPress={() => handleTabPress("dashboard")}
      />
      <TabButton
        label="Users"
        icon={<Users size={22} color={activeTab === "users" ? "#007AFF" : "#8E8E93"} />}
        active={activeTab === "users"}
        onPress={() => handleTabPress("users")}
      />
      <TabButton
        label="Requests"
        icon={<ExternalLink size={22} color={activeTab === "requests" ? "#007AFF" : "#8E8E93"} />}
        active={activeTab === "requests"}
        onPress={() => handleTabPress("requests")}
      />
      <TabButton
        label="Settings"
        icon={<Settings size={22} color={activeTab === "settings" ? "#007AFF" : "#8E8E93"} />}
        active={activeTab === "settings"}
        onPress={() => handleTabPress("settings")}
      />
      <TabButton
        label="Location"
        icon={<MapPin size={22} color={activeTab === "location" ? "#007AFF" : "#8E8E93"} />}
        active={activeTab === "location"}
        onPress={() => handleTabPress("location")}
      />
    </MotiView>
  )
}

interface TabButtonProps {
  label: string
  icon: React.ReactNode
  active: boolean
  onPress: () => void
}

function TabButton({ label, icon, active, onPress }: TabButtonProps) {
  return (
    <TouchableOpacity style={styles.tab} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.tabIconContainer}>
        {icon}
        {active && (
          <MotiView
            from={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300 }}
            style={styles.activeIndicator}
          />
        )}
      </View>
      <Text style={[styles.tabLabel, active && styles.activeTabLabel]}>{label}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingVertical: 10,
    paddingHorizontal: 5,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
    position: "relative",
    zIndex: 10,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  tabIconContainer: {
    position: "relative",
    height: 24,
    width: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  activeIndicator: {
    position: "absolute",
    bottom: -4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#007AFF",
  },
  tabLabel: {
    fontSize: 11,
    color: "#8E8E93",
    marginTop: 2,
  },
  activeTabLabel: {
    color: "#007AFF",
    fontWeight: "600",
  },
})
