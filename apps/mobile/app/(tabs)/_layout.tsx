import { Tabs } from "expo-router";
import { Text } from "react-native";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#a78bfa",
        tabBarInactiveTintColor: "#6b7280",
        tabBarStyle: {
          backgroundColor: "#0e1014",
          borderTopColor: "#1f2937",
          height: 60,
        },
      }}
    >
      <Tabs.Screen
        name="workouts"
        options={{
          title: "Treinos",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>🏋️</Text>,
        }}
      />
      <Tabs.Screen
        name="exercises"
        options={{
          title: "Exercícios",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>📖</Text>,
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: "Ranking",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>🏆</Text>,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>👤</Text>,
        }}
      />
    </Tabs>
  );
}
