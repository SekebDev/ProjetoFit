import { useState } from "react";
import { FlatList, Text, TextInput, View } from "react-native";
import {
  Card,
  EmptyState,
  ErrorState,
  Header,
  LoadingState,
  MuscleDot,
  Screen,
} from "@/components/ui";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { useExercises } from "@/lib/hooks";
import { colors } from "@/lib/theme";
import { MUSCLE_GROUP_LABELS } from "@/lib/types";

export default function BibliotecaScreen() {
  const [search, setSearch] = useState("");
  const { data: exercises, isLoading, error } = useExercises(search);

  return (
    <Screen>
      <Header title="Biblioteca" right={<ProfileAvatar />} />
      <View className="px-4 pt-4">
        <TextInput
          placeholder="Buscar exercicio"
          placeholderTextColor={colors.muted2}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          accessibilityLabel="Buscar exercicio"
          className="rounded-xl border border-border bg-surface px-4 py-3 font-body text-text"
        />
      </View>

      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message="Nao foi possivel carregar a biblioteca." />
      ) : !exercises || exercises.length === 0 ? (
        <EmptyState
          title="Nenhum exercicio encontrado"
          subtitle={search ? "Tente outro termo." : undefined}
        />
      ) : (
        <FlatList
          data={exercises}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          renderItem={({ item }) => (
            <Card className="flex-row items-center gap-3">
              <MuscleDot group={item.muscleGroup} />
              <View className="flex-1">
                <Text className="font-body-semibold text-base text-text">
                  {item.name}
                </Text>
                <Text className="mt-0.5 font-body text-xs text-muted">
                  {MUSCLE_GROUP_LABELS[item.muscleGroup]}
                </Text>
              </View>
            </Card>
          )}
        />
      )}
    </Screen>
  );
}
