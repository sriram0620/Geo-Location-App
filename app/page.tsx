"use client"
import { View, Text } from "react-native"
import { CheckInStatusCard, AttendanceCard, UpcomingScheduleCard } from "../components/HomeComponents"

export default function Page() {
  const schedules = [
    { day: "Mon", title: "Morning Meeting", time: "9:00 AM", color: "#FF6B6B" },
    { day: "Wed", title: "Project Review", time: "2:00 PM", color: "#20C997" },
    { day: "Fri", title: "Team Lunch", time: "12:30 PM", color: "#FD7E14" },
  ]

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 16 }}>Home</Text>
      <CheckInStatusCard isCheckedIn={false} lastCheckIn="N/A" lastCheckOut="N/A" onPress={() => {}} />
      <AttendanceCard totalHours="40 hrs" daysPresent="5/5" avgCheckIn="9:00 AM" />
      <UpcomingScheduleCard schedules={schedules} />
    </View>
  )
}
