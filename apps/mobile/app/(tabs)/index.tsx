import { ScrollView, Text, View } from "react-native";
import {
  Card,
  ErrorState,
  Header,
  LoadingState,
  Pill,
  Screen,
} from "@/components/ui";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import {
  useActiveSession,
  useDeload,
  useNextWorkout,
  useStreak,
} from "@/lib/hooks";
import type { Deload, StreakState } from "@/lib/types";

const STREAK_LABELS: Record<StreakState, string> = {
  unscheduled: "Sem agenda",
  idle: "Parada",
  active: "Ativa",
  resting: "Descanso",
  atRisk: "Em risco",
};

const DELOAD_REASONS: Record<NonNullable<Deload["reason"]>, string> = {
  FATIGUE: "Fadiga acumulada",
  CYCLE: "Fim de ciclo",
  BOTH: "Fadiga e fim de ciclo",
};

export default function PainelScreen() {
  const nextWorkout = useNextWorkout();
  const streak = useStreak();
  const deload = useDeload();
  const active = useActiveSession();

  // O painel depende do treino e da sequencia; se ambos falharem, e erro real.
  if (nextWorkout.isLoading || streak.isLoading) {
    return <LoadingState />;
  }
  if (nextWorkout.error && streak.error) {
    return <ErrorState message="Nao foi possivel carregar o painel." />;
  }

  const session = active.data;
  const next = nextWorkout.data;
  const s = streak.data;
  const d = deload.data;

  return (
    <Screen>
      <Header title="Hipertrof.AI" right={<ProfileAvatar />} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {session ? (
          <Card className="border-chalk/30">
            <Text className="font-mono text-[11px] uppercase tracking-wide text-muted">
              Treino em andamento
            </Text>
            <Text className="mt-1 font-display text-lg text-chalk">
              {session.planDay?.name ?? "Treino livre"}
            </Text>
          </Card>
        ) : null}

        <Card>
          <Text className="font-mono text-[11px] uppercase tracking-wide text-muted">
            Proximo treino
          </Text>
          {next ? (
            <>
              <View className="mt-1 flex-row items-center justify-between">
                <Text className="flex-1 font-display text-lg text-text">
                  {next.name}
                </Text>
                {next.isToday ? <Pill label="Hoje" /> : null}
              </View>
              {next.focus ? (
                <Text className="mt-1 font-body text-sm text-muted">
                  {next.focus}
                </Text>
              ) : null}
              <Text className="mt-3 font-body text-xs text-muted-2">
                {next.planName}
              </Text>
            </>
          ) : (
            <Text className="mt-1 font-body text-sm text-muted">
              Nenhum plano ativo. Crie um plano no site pra ver seu proximo
              treino aqui.
            </Text>
          )}
        </Card>

        <View className="flex-row gap-3">
          <Card className="flex-1">
            <Text className="font-mono text-[11px] uppercase tracking-wide text-muted">
              Sequencia
            </Text>
            <Text className="mt-1 font-display text-3xl text-chalk">
              {s?.current ?? 0}
            </Text>
            <Text className="font-body text-xs text-muted-2">
              recorde {s?.best ?? 0}
            </Text>
          </Card>
          <Card className="flex-1 justify-center">
            <Text className="font-mono text-[11px] uppercase tracking-wide text-muted">
              Estado
            </Text>
            <Text className="mt-1 font-body-semibold text-base text-text">
              {s ? STREAK_LABELS[s.state] : "—"}
            </Text>
            {s?.trainedToday ? (
              <Text className="mt-1 font-body text-xs text-m-legs">
                Treinou hoje
              </Text>
            ) : null}
          </Card>
        </View>

        {d?.recommend ? (
          <Card className="border-m-shoulders/40">
            <Text className="font-mono text-[11px] uppercase tracking-wide text-m-shoulders">
              Semana leve recomendada
            </Text>
            <Text className="mt-1 font-body text-sm text-text">
              {d.reason ? DELOAD_REASONS[d.reason] : "Hora de aliviar a carga"}
            </Text>
          </Card>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
