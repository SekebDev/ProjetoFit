import { View, Text } from "react-native";

export default function ExercisesScreen() {
  return (
    <View className="flex-1 bg-[#0e1014] justify-center items-center">
      <Text className="text-white text-2xl">📖 Exercícios</Text>
      <Text className="text-gray-400 mt-4">Carregando...</Text>
    </View>
  );
}
