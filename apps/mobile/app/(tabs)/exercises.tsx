import { View, Text, FlatList, ActivityIndicator } from "react-native";
import { useExercises } from "@/lib/hooks";
import { useState } from "react";

export default function ExercisesScreen() {
  const [search, setSearch] = useState("");
  const { data: exercises, isLoading, error } = useExercises(search);

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
        <Text className="text-white text-2xl font-bold">📖 Biblioteca</Text>
      </View>

      {!exercises || exercises.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-400">Nenhum exercício encontrado</Text>
        </View>
      ) : (
        <FlatList
          data={exercises}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
          renderItem={({ item }) => (
            <View className="bg-gray-900 rounded-lg p-4 mb-4 border border-gray-800">
              <Text className="text-white font-semibold">{item.name}</Text>
              <Text className="text-gray-400 text-sm mt-2">{item.description}</Text>
              <Text className="text-primary text-xs mt-3">
                {item.muscleGroup || "Geral"}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}
