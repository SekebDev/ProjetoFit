import { View, Text, FlatList, Pressable, ActivityIndicator } from "react-native";
import { usePlans } from "@/lib/hooks";

export default function WorkoutsScreen() {
  const { data: plans, isLoading, error } = usePlans();

  if (isLoading) {
    return (
      <View className="flex-1 bg-[#0e1014] justify-center items-center">
        <ActivityIndicator size="large" color="#a78bfa" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-[#0e1014] justify-center items-center px-6">
        <Text className="text-red-400 text-center">Erro ao carregar planos</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#0e1014]">
      <View className="px-6 py-4 border-b border-gray-800">
        <Text className="text-white text-2xl font-bold">🏋️ Meus Treinos</Text>
      </View>

      {!plans || plans.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-400">Nenhum plano criado ainda</Text>
        </View>
      ) : (
        <FlatList
          data={plans}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
          renderItem={({ item }) => (
            <Pressable className="bg-gray-900 rounded-lg p-4 mb-4 border border-gray-800">
              <Text className="text-white font-semibold text-lg">{item.name}</Text>
              <Text className="text-gray-400 text-sm mt-1">{item.description}</Text>
              <View className="flex-row justify-between mt-4">
                <Text className="text-primary text-xs">
                  {item.exercisesCount || 0} exercícios
                </Text>
                <Text className="text-gray-500 text-xs">
                  Próximo: {item.nextDate ? "Hoje" : "..."}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
