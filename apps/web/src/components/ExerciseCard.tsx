"use client";

import Image from "next/image";
import Link from "next/link";
import type { Exercise } from "@workout/shared";
import { EQUIP_LABELS, MUSCLE_META } from "@/lib/meta";

export function ExerciseCard({ exercise }: { exercise: Exercise }) {
  const m = MUSCLE_META[exercise.muscleGroup];
  return (
    <Link
      href={`/exercises/${exercise.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-lg border bg-[var(--surface)] transition-colors hover:border-[var(--muted-2)]"
    >
      <span
        aria-hidden
        className="absolute left-0 top-0 z-10 h-full w-1"
        style={{ background: m.color }}
      />
      <div className="relative aspect-[4/3] overflow-hidden bg-white">
        {exercise.imageUrl ? (
          <Image
            src={exercise.imageUrl}
            alt={exercise.name}
            fill
            unoptimized
            sizes="(max-width: 768px) 50vw, 300px"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
          />
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3 pl-4">
        <h3 className="font-[family-name:var(--font-display-face)] text-sm font-medium leading-tight text-[var(--text)]">
          {exercise.name}
        </h3>
        <div className="mt-auto flex items-center gap-2 font-[family-name:var(--font-mono-face)] text-[11px] uppercase tracking-wide text-[var(--muted)]">
          <span style={{ color: m.color }}>{m.label}</span>
          <span className="text-[var(--border)]">/</span>
          <span>{EQUIP_LABELS[exercise.equipment]}</span>
        </div>
      </div>
    </Link>
  );
}
