import { FlatList, Text, View } from "react-native";
import {
  Card,
  EmptyState,
  ErrorState,
  Header,
  LoadingState,
  Pill,
  Screen,
} from "@/components/ui";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { usePlans } from "@/lib/hooks";

export default function PlanosScreen() {
  const { data: plans, isLoading, error } = usePlans();

  return (
    <Screen>
      <Header title="Planos" right={<ProfileAvatar />} />
      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message="Nao foi possivel carregar seus planos." />
      ) : !plans || plans.length === 0 ? (
        <EmptyState
          title="Nenhum plano ainda"
          subtitle="Crie um plano no site pra ve-lo aqui."
        />
      ) : (
        <FlatList
          data={plans}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          renderItem={({ item }) => (
            <Card>
              <View className="flex-row items-center justify-between">
                <Text className="flex-1 font-display text-lg text-text">
                  {item.name}
                </Text>
                {item.isActive ? <Pill label="Ativo" /> : null}
              </View>
              <View className="mt-3 flex-row items-center justify-between">
                <Text className="font-body text-xs text-muted">
                  {item.dayCount} {item.dayCount === 1 ? "dia" : "dias"}
                </Text>
                <Text className="font-body text-xs text-muted-2">
                  {item.source === "AI" ? "Gerado por IA" : "Manual"}
                </Text>
              </View>
            </Card>
          )}
        />
      )}
    </Screen>
  );
}
