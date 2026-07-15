import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { ExercisesService } from "./exercises.service";

function makeRow(over: Record<string, unknown> = {}) {
  return {
    id: "id1",
    slug: "bench",
    name: "Bench Press",
    muscleGroup: "CHEST",
    category: "COMPOUND",
    equipment: "BARBELL",
    imageUrl: "http://img",
    videoUrl: null,
    instructions: "faça",
    defaultRestSec: 120,
    createdAt: new Date(),
    ...over,
  };
}

describe("ExercisesService", () => {
  it("aplica filtros e ordena por nome", async () => {
    const findMany = vi.fn().mockResolvedValue([makeRow()]);
    const service = new ExercisesService({ exercise: { findMany } } as never);
    const res = await service.findAll({ muscleGroup: "CHEST", search: "ben" });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { name: "asc" } }),
    );
    expect(res[0].slug).toBe("bench");
  });

  it("lança NotFound quando o slug não existe", async () => {
    const findUnique = vi.fn().mockResolvedValue(null);
    const service = new ExercisesService({ exercise: { findUnique } } as never);
    await expect(service.findBySlug("x")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
