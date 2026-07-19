import { View, Text, FlatList, ActivityIndicator, RefreshControl } from "react-native";
import { useLeaderboard } from "@/lib/hooks";
import { useState } from "react";

export default function LeaderboardScreen() {
  const { data: ranking, isLoading, refetch } = useLeaderboard();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (isLoading && !ranking) {
    return (
      <View className="flex-1 bg-[#0e1014] justify-center items-center">
        <ActivityIndicator size="large" color="#a78bfa" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#0e1014]">
      <View className="px-6 py-4 border-b border-gray-800">
        <Text className="text-white text-2xl font-bold">🏆 Ranking</Text>
      </View>

      {!ranking || ranking.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-400">Nenhum usuário no ranking</Text>
        </View>
      ) : (
        <FlatList
          data={ranking}
          keyExtractor={(item) => item.userId}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#a78bfa"
            />
          }
          renderItem={({ item, index }) => (
            <View className="bg-gray-900 rounded-lg p-4 mb-3 flex-row items-center border border-gray-800">
              <Text className="text-primary font-bold text-lg mr-3">
                #{index + 1}
              </Text>
              <View className="flex-1">
                <Text className="text-white font-semibold">{item.userName}</Text>
                <Text className="text-gray-400 text-sm">
                  {item.totalWeight || 0} kg
                </Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}
