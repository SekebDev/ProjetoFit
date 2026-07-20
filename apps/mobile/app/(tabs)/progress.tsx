import { ScrollView, Text, View } from "react-native";
import {
  Card,
  EmptyState,
  ErrorState,
  Header,
  LoadingState,
  Screen,
} from "@/components/ui";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { useProgressSummary } from "@/lib/hooks";

/** kg com separador de milhar pt-BR, sem casas decimais. */
function formatKg(value: number): string {
  return `${Math.round(value).toLocaleString("pt-BR")} kg`;
}

/** Rotulo curto da semana a partir do ISO weekStart. */
function weekLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

export default function ProgressoScreen() {
  const { data, isLoading, error } = useProgressSummary();

  if (isLoading) return <LoadingState />;
  if (error || !data) {
    return (
      <Screen>
        <Header title="Progresso" right={<ProfileAvatar />} />
        <ErrorState message="Nao foi possivel carregar seu progresso." />
      </Screen>
    );
  }

  const maxVolume = Math.max(1, ...data.weeklyVolume.map((w) => w.volume));
  const hasData = data.totalSessions > 0;

  return (
    <Screen>
      <Header title="Progresso" right={<ProfileAvatar />} />
      {!hasData ? (
        <EmptyState
          title="Sem treinos registrados"
          subtitle="Seus numeros aparecem aqui depois do primeiro treino."
        />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          <Card>
            <Text className="font-mono text-[11px] uppercase tracking-wide text-muted">
              Treinos totais
            </Text>
            <Text className="mt-1 font-display text-3xl text-chalk">
              {data.totalSessions}
            </Text>
          </Card>

          {data.weeklyVolume.length > 0 ? (
            <Card>
              <Text className="font-mono text-[11px] uppercase tracking-wide text-muted">
                Volume semanal
              </Text>
              <View className="mt-3 gap-2">
                {data.weeklyVolume.map((w) => (
                  <View
                    key={w.weekStart}
                    className="flex-row items-center gap-3"
                  >
                    <Text className="w-12 font-mono text-[11px] text-muted-2">
                      {weekLabel(w.weekStart)}
                    </Text>
                    <View className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                      <View
                        className="h-2 rounded-full bg-m-back"
                        style={{ width: `${(w.volume / maxVolume) * 100}%` }}
                      />
                    </View>
                    <Text className="w-20 text-right font-body text-xs text-muted">
                      {formatKg(w.volume)}
                    </Text>
                  </View>
                ))}
              </View>
            </Card>
          ) : null}

          {data.records.length > 0 ? (
            <Card>
              <Text className="font-mono text-[11px] uppercase tracking-wide text-muted">
                Recordes
              </Text>
              <View className="mt-3 gap-3">
                {data.records.map((r) => (
                  <View
                    key={r.exercise.id}
                    className="flex-row items-center justify-between"
                  >
                    <Text className="flex-1 font-body-semibold text-sm text-text">
                      {r.exercise.name}
                    </Text>
                    <Text className="font-mono text-sm text-chalk">
                      {r.maxWeightKg != null ? formatKg(r.maxWeightKg) : "—"}
                    </Text>
                  </View>
                ))}
              </View>
            </Card>
          ) : null}
        </ScrollView>
      )}
    </Screen>
  );
}
