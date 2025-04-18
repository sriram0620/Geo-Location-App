import { View, Text, StyleSheet, Dimensions } from "react-native"
import { BarChart, LineChart, PieChart } from "react-native-chart-kit"

const { width } = Dimensions.get("window")

type AttendanceChartsProps = {
  weeklyStats: any
  monthlyStats: any
  attendanceDistribution: any
  expandedSection: string | null
}

export const AttendanceCharts = ({
  weeklyStats,
  monthlyStats,
  attendanceDistribution,
  expandedSection,
}: AttendanceChartsProps) => {
  const renderWeeklyAttendance = () => {
    if (expandedSection !== "weeklyAttendance") return null

    return (
      <View style={styles.chartContainer}>
        {weeklyStats.datasets[0].data.some((value: number) => value > 0) ? (
          <>
            <Text style={styles.chartTitle}>Check-ins per Day</Text>
            <BarChart
              data={weeklyStats}
              width={width - 60}
              height={220}
              yAxisSuffix=""
              chartConfig={{
                backgroundColor: "#ffffff",
                backgroundGradientFrom: "#ffffff",
                backgroundGradientTo: "#ffffff",
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(108, 99, 255, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
                barPercentage: 0.7,
              }}
              style={styles.chart}
              showValuesOnTopOfBars
            />
          </>
        ) : (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>No attendance data available for this week</Text>
          </View>
        )}
      </View>
    )
  }

  const renderWorkingHours = () => {
    if (expandedSection !== "workingHours") return null

    return (
      <View style={styles.chartContainer}>
        {monthlyStats.datasets[0].data.some((value: number) => value > 0) ? (
          <>
            <Text style={styles.chartTitle}>Hours Worked (Last 7 Days)</Text>
            <LineChart
              data={monthlyStats}
              width={width - 60}
              height={220}
              yAxisSuffix="h"
              chartConfig={{
                backgroundColor: "#ffffff",
                backgroundGradientFrom: "#ffffff",
                backgroundGradientTo: "#ffffff",
                decimalPlaces: 1,
                color: (opacity = 1) => `rgba(108, 99, 255, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
                propsForDots: {
                  r: "6",
                  strokeWidth: "2",
                  stroke: "#6C63FF",
                },
              }}
              bezier
              style={styles.chart}
            />
          </>
        ) : (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>No working hours data available</Text>
          </View>
        )}
      </View>
    )
  }

  const renderAttendanceDistribution = () => {
    if (expandedSection !== "attendanceDistribution") return null

    return (
      <View style={styles.chartContainer}>
        {attendanceDistribution.data.some((value: number) => value > 0) ? (
          <>
            <Text style={styles.chartTitle}>Check-ins vs Check-outs</Text>
            <PieChart
              data={attendanceDistribution}
              width={width - 60}
              height={220}
              chartConfig={{
                backgroundColor: "#ffffff",
                backgroundGradientFrom: "#ffffff",
                backgroundGradientTo: "#ffffff",
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              }}
              accessor="data"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
              style={styles.chart}
            />
          </>
        ) : (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>No attendance distribution data available</Text>
          </View>
        )}
      </View>
    )
  }

  return (
    <>
      {renderWeeklyAttendance()}
      {renderWorkingHours()}
      {renderAttendanceDistribution()}
    </>
  )
}

const styles = StyleSheet.create({
  chartContainer: {
    alignItems: "center",
    marginVertical: 10,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 16,
    textAlign: "center",
  },
  chart: {
    borderRadius: 16,
  },
  noDataContainer: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  noDataText: {
    fontSize: 14,
    color: "#999",
    fontStyle: "italic",
    textAlign: "center",
  },
})
