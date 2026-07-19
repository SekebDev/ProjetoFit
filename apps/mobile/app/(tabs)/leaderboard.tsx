import {
  View,
  Text,
  FlatList,
  Pressable,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useState } from "react";
import { useGroups, useGroupLeaderboard } from "@/lib/hooks";
import { LEADERBOARD_METRIC_LABELS } from "@/lib/types";

export default function LeaderboardScreen() {
  const { data: groups, isLoading: loadingGroups, error } = useGroups();
  const [selectedId, setSelectedId] = useState<string>();

  // Sem escolha explicita, mostra o primeiro grupo.
  const activeGroupId = selectedId ?? groups?.[0]?.id;

  if (loadingGroups) {
    return (
      <View className="flex-1 bg-[#0e1014] justify-center items-center">
        <ActivityIndicator size="large" color="#a78bfa" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-[#0e1014] justify-center items-center px-6">
        <Text accessibilityRole="alert" className="text-red-400 text-center">
          Nao foi possivel carregar seus grupos.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#0e1014]">
      <View className="px-6 py-4 border-b border-gray-800">
        <Text className="text-white text-2xl font-bold">🏆 Ranking</Text>
      </View>

      {!groups || groups.length === 0 ? (
        <View className="flex-1 justify-center items-center px-8">
          <Text className="text-gray-400 text-center">
            O ranking é por grupo. Entre em um grupo pelo site para competir com
            seus amigos.
          </Text>
        </View>
      ) : (
        <>
          {groups.length > 1 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}
            >
              {groups.map((group) => {
                const isActive = group.id === activeGroupId;
                return (
                  <Pressable
                    key={group.id}
                    onPress={() => setSelectedId(group.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isActive }}
                    className={
                      isActive
                        ? "bg-purple-600 px-4 py-2 rounded-full"
                        : "bg-gray-900 border border-gray-700 px-4 py-2 rounded-full"
                    }
                  >
                    <Text className="text-white text-sm">{group.name}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}

          <GroupRanking groupId={activeGroupId} />
        </>
      )}
    </View>
  );
}

function GroupRanking({ groupId }: { groupId: string | undefined }) {
  const { data, isLoading, error, refetch } = useGroupLeaderboard(groupId);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

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
          Nao foi possivel carregar o ranking.
        </Text>
      </View>
    );
  }

  if (!data || data.entries.length === 0) {
    return (
      <View className="flex-1 justify-center items-center px-6">
        <Text className="text-gray-400 text-center">
          Ninguém pontuou neste grupo ainda
        </Text>
      </View>
    );
  }

  const unit = LEADERBOARD_METRIC_LABELS[data.metric];

  return (
    <FlatList
      data={data.entries}
      keyExtractor={(item) => item.userId}
      contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#a78bfa"
        />
      }
      renderItem={({ item }) => (
        <View className="bg-gray-900 rounded-lg p-4 mb-3 flex-row items-center border border-gray-800">
          <Text className="text-[#a78bfa] font-bold text-lg mr-3 w-8">
            {item.position}º
          </Text>
          <View className="flex-1">
            <Text className="text-white font-semibold">{item.name}</Text>
            <Text className="text-gray-400 text-sm">
              {item.value} {unit}
            </Text>
          </View>
          {item.behindLeader > 0 ? (
            <Text className="text-gray-500 text-xs">
              -{item.behindLeader}
            </Text>
          ) : null}
        </View>
      )}
    />
  );
}
