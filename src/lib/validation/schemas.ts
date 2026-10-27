import { z } from "zod";
export const sectionSchema = z.object({
  heading: z.string(),
  body: z.string(),
});
export const documentSchema = z.object({
  title: z.string(),
  summary: z.string(),
  sections: z.array(sectionSchema).min(1),
  warnings: z.array(z.string()),
});
export type DocumentResult = z.infer<typeof documentSchema>;
export const slidesSchema = z.object({
  title: z.string(),
  summary: z.string(),
  slides: z
    .array(
      z.object({
        title: z.string(),
        bullets: z.array(z.string()).max(6),
        notes: z.string(),
        visual: z.string(),
      }),
    )
    .min(1)
    .max(30),
  references: z.array(z.string()),
  warnings: z.array(z.string()),
});
export const examSchema = z.object({
  title: z.string(),
  questions: z
    .array(
      z.object({
        topic: z.string(),
        prompt: z.string(),
        options: z
          .array(z.string().min(1))
          .length(5)
          .refine(
            (options) => new Set(options).size === 5,
            "Lima pilihan harus berbeda.",
          ),
        correctIndex: z.number().int().min(0).max(4),
        explanation: z.string(),
        source: z.string().nullable(),
      }),
    )
    .min(5)
    .max(50),
});
export const matrixSchema = z.object({
  title: z.string(),
  summary: z.string(),
  journals: z
    .array(
      z.object({
        title: z.string(),
        authors: z.string(),
        year: z.string(),
        purpose: z.string(),
        method: z.string(),
        sample: z.string(),
        findings: z.string(),
        limitations: z.string(),
        gap: z.string(),
        source: z.string(),
      }),
    )
    .min(2)
    .max(20),
  warnings: z.array(z.string()),
});
export const rubricSchema = z
  .object({
    title: z.string(),
    summary: z.string(),
    criteria: z
      .array(
        z.object({
          name: z.string(),
          weight: z.number().min(0).max(100),
          score: z.number().min(0).max(100),
          evidence: z.string(),
          reason: z.string(),
          suggestion: z.string(),
        }),
      )
      .min(1),
    warnings: z.array(z.string()),
  })
  .refine(
    (x) => Math.abs(x.criteria.reduce((s, c) => s + c.weight, 0) - 100) < 0.01,
    "Bobot rubrik harus berjumlah 100",
  );
export const defenseSchema = z.object({
  title: z.string(),
  question: z.string(),
  feedback: z.string(),
  scores: z.array(
    z.object({
      criterion: z.string(),
      score: z.number().min(0).max(10),
      reason: z.string(),
    }),
  ),
  strongerAnswer: z.string(),
});
export const inputSchema = z
  .object({
    prompt: z.string().max(50000).default(""),
    fileIds: z.array(z.string().uuid()).max(20).default([]),
    projectId: z.string().uuid().optional(),
    options: z
      .record(
        z.string(),
        z.union([z.string().max(20000), z.number(), z.boolean()]),
      )
      .default({}),
  })
  .refine(
    (x) => x.prompt.trim().length > 0 || x.fileIds.length > 0,
    "Masukkan materi atau unggah dokumen.",
  );
export type GenerationInput = z.infer<typeof inputSchema>;
