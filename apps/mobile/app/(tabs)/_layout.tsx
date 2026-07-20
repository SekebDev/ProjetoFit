import { Tabs } from "expo-router";
import {
  House,
  Dumbbell,
  ClipboardList,
  TrendingUp,
  Users,
} from "lucide-react-native";
import { colors, fonts } from "@/lib/theme";

// Mesma gramatica de navegacao do web (apps/web/src/components/Nav.tsx): cinco
// abas, ativo em giz, inativo em muted-2. Perfil nao e aba — vive no header.
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.chalk,
        tabBarInactiveTintColor: colors.muted2,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.borderSoft,
          height: 62,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontFamily: fonts.bodyMedium, fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Painel",
          tabBarIcon: ({ color, focused }) => (
            <House color={color} size={22} strokeWidth={focused ? 2.4 : 1.8} />
          ),
        }}
      />
      <Tabs.Screen
        name="exercises"
        options={{
          title: "Biblioteca",
          tabBarIcon: ({ color, focused }) => (
            <Dumbbell
              color={color}
              size={22}
              strokeWidth={focused ? 2.4 : 1.8}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="plans"
        options={{
          title: "Planos",
          tabBarIcon: ({ color, focused }) => (
            <ClipboardList
              color={color}
              size={22}
              strokeWidth={focused ? 2.4 : 1.8}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: "Progresso",
          tabBarIcon: ({ color, focused }) => (
            <TrendingUp
              color={color}
              size={22}
              strokeWidth={focused ? 2.4 : 1.8}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: "Grupos",
          tabBarIcon: ({ color, focused }) => (
            <Users color={color} size={22} strokeWidth={focused ? 2.4 : 1.8} />
          ),
        }}
      />
    </Tabs>
  );
}
