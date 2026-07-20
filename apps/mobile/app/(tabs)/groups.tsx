import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import {
  Card,
  EmptyState,
  ErrorState,
  Header,
  LoadingState,
  Screen,
} from "@/components/ui";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { useGroups, useGroupLeaderboard } from "@/lib/hooks";
import { LEADERBOARD_METRIC_LABELS } from "@/lib/types";

export default function GruposScreen() {
  const groups = useGroups();
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);

  // Seleciona o primeiro grupo assim que a lista chega, sem useEffect: deriva do
  // dado atual, e o usuario pode trocar depois.
  const activeId = selectedId ?? groups.data?.[0]?.id;
  const leaderboard = useGroupLeaderboard(activeId);

  if (groups.isLoading) return <LoadingState />;
  if (groups.error) {
    return (
      <Screen>
        <Header title="Grupos" right={<ProfileAvatar />} />
        <ErrorState message="Nao foi possivel carregar seus grupos." />
      </Screen>
    );
  }

  const list = groups.data ?? [];

  return (
    <Screen>
      <Header title="Grupos" right={<ProfileAvatar />} />
      {list.length === 0 ? (
        <EmptyState
          title="Voce ainda nao esta em nenhum grupo"
          subtitle="Entre em um grupo no site pra competir aqui."
        />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          <View className="flex-row flex-wrap gap-2">
            {list.map((group) => {
              const isActive = group.id === activeId;
              return (
                <Pressable
                  key={group.id}
                  onPress={() => setSelectedId(group.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  className={`rounded-full border px-3 py-1.5 ${
                    isActive
                      ? "border-chalk bg-chalk"
                      : "border-border bg-surface"
                  }`}
                >
                  <Text
                    className={`font-body-medium text-sm ${
                      isActive ? "text-bg" : "text-muted"
                    }`}
                  >
                    {group.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Card>
            {leaderboard.isLoading ? (
              <Text className="font-body text-sm text-muted">Carregando…</Text>
            ) : leaderboard.error || !leaderboard.data ? (
              <Text
                accessibilityRole="alert"
                className="font-body text-sm text-m-chest"
              >
                Nao foi possivel carregar o ranking.
              </Text>
            ) : leaderboard.data.entries.length === 0 ? (
              <Text className="font-body text-sm text-muted">
                Ranking ainda vazio.
              </Text>
            ) : (
              <View className="gap-3">
                <Text className="font-mono text-[11px] uppercase tracking-wide text-muted">
                  Ranking — {LEADERBOARD_METRIC_LABELS[leaderboard.data.metric]}
                </Text>
                {leaderboard.data.entries.map((entry) => (
                  <View
                    key={entry.userId}
                    className="flex-row items-center gap-3"
                  >
                    <Text className="w-6 font-display text-sm text-muted-2">
                      {entry.position}
                    </Text>
                    <Text className="flex-1 font-body-semibold text-sm text-text">
                      {entry.name}
                    </Text>
                    <Text className="font-mono text-sm text-chalk">
                      {entry.value}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </Card>
        </ScrollView>
      )}
    </Screen>
  );
}
