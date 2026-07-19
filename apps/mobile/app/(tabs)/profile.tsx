import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useProfile } from "@/lib/hooks";
import { tokenStorage } from "@/lib/storage";

export default function ProfileScreen() {
  const router = useRouter();
  const { data: user, isLoading, error } = useProfile();
  const [logoutError, setLogoutError] = useState("");

  const handleLogout = async () => {
    try {
      await tokenStorage.clear();
    } catch {
      // Sair com token no dispositivo e pior que nao sair: avisa e fica.
      setLogoutError("Nao foi possivel sair. Tente novamente.");
      return;
    }
    router.replace("/(auth)/login");
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-[#0e1014] justify-center items-center">
        <ActivityIndicator size="large" color="#a78bfa" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#0e1014]">
      <View className="px-6 py-4 border-b border-gray-800">
        <Text className="text-white text-2xl font-bold">👤 Perfil</Text>
      </View>

      <View className="px-6 py-6">
        {error || !user ? (
          <Text
            accessibilityRole="alert"
            className="text-red-400 text-center mb-6"
          >
            Nao foi possivel carregar o perfil.
          </Text>
        ) : (
          <View className="bg-gray-900 rounded-lg p-6 border border-gray-800 mb-6">
            <Text className="text-white text-xl font-bold">
              {user.name ?? "Sem nome"}
            </Text>
            <Text className="text-gray-400 text-sm mt-2">{user.email}</Text>
            <Text className="text-gray-500 text-xs mt-4">
              Na plataforma desde{" "}
              {new Date(user.createdAt).toLocaleDateString("pt-BR")}
            </Text>
          </View>
        )}

        {logoutError ? (
          <Text
            accessibilityRole="alert"
            className="text-red-400 mb-3 text-center text-sm"
          >
            {logoutError}
          </Text>
        ) : null}

        <Pressable
          onPress={handleLogout}
          accessibilityRole="button"
          accessibilityLabel="Sair da conta"
          className="bg-red-600 py-3 rounded-lg"
        >
          <Text className="text-white text-center font-semibold">Sair</Text>
        </Pressable>
      </View>
    </View>
  );
}
