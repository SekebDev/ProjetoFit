"use client";

import { useState } from "react";
import {
  DOPAMINE_GAMES,
  EQUIPMENT,
  EXPERIENCES,
  FOCUS_AREAS,
  GOALS,
  type Profile,
  type UpdateProfileInput,
} from "@workout/shared";
import { GAME_LABELS } from "@/lib/games/registry";
import { EQUIP_LABELS } from "@/lib/meta";
import { cn, numOrNull } from "@/lib/utils";

const GOAL_LABELS: Record<(typeof GOALS)[number], string> = {
  FAT_LOSS: "Emagrecimento",
  HYPERTROPHY: "Hipertrofia",
  STRENGTH: "Forca",
  GENERAL: "Geral",
};
const EXP_LABELS: Record<(typeof EXPERIENCES)[number], string> = {
  BEGINNER: "Iniciante",
  RETURNING: "Retomando",
  INTERMEDIATE: "Intermediario",
  ADVANCED: "Avancado",
};
const FOCUS_LABELS: Record<(typeof FOCUS_AREAS)[number], string> = {
  UPPER: "Superior",
  LOWER: "Inferior",
  PUSH: "Empurrar",
  PULL: "Puxar",
  CHEST: "Peito",
  BACK: "Costas",
  SHOULDERS: "Ombros",
  ARMS: "Bracos",
  LEGS: "Pernas",
  CORE: "Core",
};

function toggle<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

interface Props {
  initial: Profile | null;
  onSubmit: (input: UpdateProfileInput) => void;
  saving: boolean;
  saved: boolean;
}

export function ProfileForm({ initial, onSubmit, saving, saved }: Props) {
  const [goal, setGoal] = useState<UpdateProfileInput["goal"]>(
    initial?.goal ?? "GENERAL",
  );
  const [experience, setExperience] = useState<UpdateProfileInput["experience"]>(
    initial?.experience ?? "BEGINNER",
  );
  const [daysPerWeek, setDaysPerWeek] = useState(initial?.daysPerWeek ?? 3);
  const [sessionMin, setSessionMin] = useState(
    initial?.sessionMin?.toString() ?? "",
  );
  const [focusAreas, setFocusAreas] = useState<UpdateProfileInput["focusAreas"]>(
    initial?.focusAreas ?? [],
  );
  const [equipment, setEquipment] = useState<UpdateProfileInput["equipment"]>(
    initial?.equipment ?? [],
  );
  const [birthYear, setBirthYear] = useState(
    initial?.birthYear?.toString() ?? "",
  );
  const [heightCm, setHeightCm] = useState(initial?.heightCm?.toString() ?? "");
  const [weightKg, setWeightKg] = useState(initial?.weightKg?.toString() ?? "");
  const [injuries, setInjuries] = useState(initial?.injuries ?? "");
  const [dopamineMode, setDopamineMode] = useState(
    initial?.dopamineMode ?? false,
  );
  const [dopamineGames, setDopamineGames] = useState<
    UpdateProfileInput["dopamineGames"]
  >(initial?.dopamineGames ?? []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      goal,
      experience,
      daysPerWeek,
      sessionMin: numOrNull(sessionMin),
      focusAreas,
      equipment,
      birthYear: numOrNull(birthYear),
      heightCm: numOrNull(heightCm),
      weightKg: numOrNull(weightKg),
      injuries: injuries.trim() || null,
      dopamineMode,
      dopamineGames,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <Field label="Objetivo">
        <Segmented
          options={GOALS.map((g) => ({ value: g, label: GOAL_LABELS[g] }))}
          value={goal}
          onChange={setGoal}
        />
      </Field>

      <Field label="Experiencia">
        <Segmented
          options={EXPERIENCES.map((e) => ({ value: e, label: EXP_LABELS[e] }))}
          value={experience}
          onChange={setExperience}
        />
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Dias por semana" hint={`${daysPerWeek}x`}>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5, 6, 7].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDaysPerWeek(d)}
                className={cn(
                  "h-9 flex-1 rounded-md border font-[family-name:var(--font-mono-face)] text-sm tabular-nums transition-colors",
                  daysPerWeek === d
                    ? "border-[var(--chalk)] bg-[var(--chalk)] text-black"
                    : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]",
                )}
              >
                {d}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Minutos por sessao">
          <NumberInput
            value={sessionMin}
            onChange={setSessionMin}
            placeholder="60"
          />
        </Field>
      </div>

      <Field label="Areas de foco">
        <ChipGroup
          options={FOCUS_AREAS.map((f) => ({ value: f, label: FOCUS_LABELS[f] }))}
          selected={focusAreas}
          onToggle={(v) => setFocusAreas((prev) => toggle(prev, v))}
        />
      </Field>

      <Field label="Equipamento disponivel">
        <ChipGroup
          options={EQUIPMENT.map((e) => ({ value: e, label: EQUIP_LABELS[e] }))}
          selected={equipment}
          onToggle={(v) => setEquipment((prev) => toggle(prev, v))}
        />
      </Field>

      <div className="grid gap-6 sm:grid-cols-3">
        <Field label="Ano nasc.">
          <NumberInput
            value={birthYear}
            onChange={setBirthYear}
            placeholder="1995"
          />
        </Field>
        <Field label="Altura (cm)">
          <NumberInput
            value={heightCm}
            onChange={setHeightCm}
            placeholder="178"
          />
        </Field>
        <Field label="Peso (kg)">
          <NumberInput
            value={weightKg}
            onChange={setWeightKg}
            placeholder="82"
          />
        </Field>
      </div>

      <Field label="Lesoes / observacoes">
        <textarea
          value={injuries}
          onChange={(e) => setInjuries(e.target.value)}
          rows={3}
          placeholder="Ex.: ombro direito sensivel em supino inclinado"
          className="w-full rounded-md border bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted-2)] focus:border-[var(--muted)]"
        />
      </Field>

      <Field label="Modo Dopamina">
        <div className="flex items-center justify-between gap-4 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5">
          <span className="text-sm text-[var(--muted)]">
            Minigame no tempo de descanso
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={dopamineMode}
            aria-label="Ativar Modo Dopamina"
            onClick={() => setDopamineMode((v) => !v)}
            className={cn(
              "relative h-6 w-11 shrink-0 rounded-full border transition-colors",
              dopamineMode
                ? "border-[var(--chalk)] bg-[var(--chalk)]"
                : "border-[var(--border)] bg-[var(--surface-2)]",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 size-4 rounded-full bg-black transition-transform",
                dopamineMode ? "translate-x-5" : "translate-x-0.5",
              )}
            />
          </button>
        </div>
        {dopamineMode ? (
          <div className="mt-3">
            <p className="mb-2 font-[family-name:var(--font-mono-face)] text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
              Jogos (vazio = todos)
            </p>
            <ChipGroup
              options={DOPAMINE_GAMES.map((g) => ({
                value: g,
                label: GAME_LABELS[g],
              }))}
              selected={dopamineGames}
              onToggle={(v) => setDopamineGames((prev) => toggle(prev, v))}
            />
          </div>
        ) : null}
      </Field>

      <div className="flex items-center gap-4 border-t pt-6">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-[var(--chalk)] px-5 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Salvando..." : "Salvar perfil"}
        </button>
        {saved ? (
          <span className="font-[family-name:var(--font-mono-face)] text-xs text-[var(--m-legs)]">
            Perfil salvo.
          </span>
        ) : null}
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <label className="font-[family-name:var(--font-mono-face)] text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
          {label}
        </label>
        {hint ? (
          <span className="font-[family-name:var(--font-mono-face)] text-xs text-[var(--muted-2)]">
            {hint}
          </span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      inputMode="numeric"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-md border bg-[var(--surface)] px-3 py-2 font-[family-name:var(--font-mono-face)] text-sm tabular-nums text-[var(--text)] placeholder:text-[var(--muted-2)] focus:border-[var(--muted)]"
    />
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-md border px-4 py-2 text-sm font-medium transition-colors",
            value === o.value
              ? "border-[var(--chalk)] bg-[var(--chalk)] text-black"
              : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ChipGroup<T extends string>({
  options,
  selected,
  onToggle,
}: {
  options: { value: T; label: string }[];
  selected: T[];
  onToggle: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = selected.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onToggle(o.value)}
            className={cn(
              "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
              on
                ? "border-[var(--chalk)] bg-[var(--chalk)] text-black"
                : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
