import {
  View,
  Text,
  TextInput,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useState } from "react";
import { useExercises } from "@/lib/hooks";
import { MUSCLE_GROUP_LABELS, type Exercise } from "@/lib/types";

export default function ExercisesScreen() {
  const [search, setSearch] = useState("");
  const { data: exercises, isLoading, error } = useExercises(search);

  return (
    <View className="flex-1 bg-[#0e1014]">
      <View className="px-6 py-4 border-b border-gray-800">
        <Text className="text-white text-2xl font-bold mb-3">📖 Biblioteca</Text>
        <TextInput
          placeholder="Buscar exercício"
          placeholderTextColor="#6b7280"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          accessibilityLabel="Buscar exercício"
          className="bg-gray-900 text-white px-4 py-2 rounded-lg border border-gray-700"
        />
      </View>

      <ExerciseList exercises={exercises} isLoading={isLoading} error={error} />
    </View>
  );
}

type ExerciseListProps = {
  exercises: Exercise[] | undefined;
  isLoading: boolean;
  error: unknown;
};

function ExerciseList({ exercises, isLoading, error }: ExerciseListProps) {
  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#a78bfa" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center px-6">
        <Text accessibilityRole="alert" className="text-red-400 text-center">
          Nao foi possivel carregar os exercicios.
        </Text>
      </View>
    );
  }

  if (!exercises || exercises.length === 0) {
    return (
      <View className="flex-1 justify-center items-center px-6">
        <Text className="text-gray-400 text-center">
          Nenhum exercício encontrado
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={exercises}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
      renderItem={({ item }) => (
        <View className="bg-gray-900 rounded-lg p-4 mb-4 border border-gray-800">
          <Text className="text-white font-semibold">{item.name}</Text>

          {item.instructions ? (
            <Text
              numberOfLines={2}
              className="text-gray-400 text-sm mt-2"
            >
              {item.instructions}
            </Text>
          ) : null}

          <Text className="text-[#a78bfa] text-xs mt-3">
            {MUSCLE_GROUP_LABELS[item.muscleGroup]}
          </Text>
        </View>
      )}
    />
  );
}
