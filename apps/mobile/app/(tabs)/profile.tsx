import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { useProfile } from "@/lib/hooks";
import { useRouter } from "expo-router";
import { tokenStorage } from "@/lib/storage";

export default function ProfileScreen() {
  const router = useRouter();
  const { data: user, isLoading } = useProfile();

  const handleLogout = async () => {
    await tokenStorage.clear();
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

      {user ? (
        <View className="px-6 py-6">
          <View className="bg-gray-900 rounded-lg p-6 border border-gray-800 mb-6">
            <Text className="text-white text-xl font-bold">{user.name}</Text>
            <Text className="text-gray-400 text-sm mt-2">{user.email}</Text>
            {user.bio && (
              <Text className="text-gray-500 text-sm mt-3">{user.bio}</Text>
            )}
          </View>

          <View className="bg-gray-900 rounded-lg p-4 border border-gray-800 mb-6">
            <Text className="text-gray-400 text-sm">Estatísticas</Text>
            <View className="mt-4 gap-3">
              <View className="flex-row justify-between">
                <Text className="text-gray-400">Treinos Completos</Text>
                <Text className="text-primary font-semibold">
                  {user.workoutsCompleted || 0}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-400">Peso Total (kg)</Text>
                <Text className="text-primary font-semibold">
                  {user.totalWeight || 0}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-400">Posição no Ranking</Text>
                <Text className="text-primary font-semibold">
                  #{user.rankingPosition || "—"}
                </Text>
              </View>
            </View>
          </View>

          <Pressable
            onPress={handleLogout}
            className="bg-red-600 py-3 rounded-lg"
          >
            <Text className="text-white text-center font-semibold">Sair</Text>
          </Pressable>
        </View>
      ) : (
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-400">Erro ao carregar perfil</Text>
        </View>
      )}
    </View>
  );
}
