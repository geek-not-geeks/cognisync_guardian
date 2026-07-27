import { createServerFn } from "@tanstack/react-start";
import { generateText, Output, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const InputSchema = z.object({
  imageBase64: z.string().optional(),
  rawText: z.string().optional(),
  mimeType: z.string().optional(),
});

const TaskSchema = z.object({
  title: z.string(),
  deadline: z.string().nullable(),
  effortSize: z.enum(["Quick", "Standard", "Deep Work"]),
  difficulty: z.enum(["Comfortable", "Challenging", "Very Hard"]),
});

const ResultSchema = z.object({
  tasks: z.array(TaskSchema),
  confidence: z.number(),
});

const PROMPT =
  "You are an expert academic executive assistant. Analyze this syllabus, whiteboard scan, or raw text. Extract all distinct homework assignments, exams, or study tasks into structured action items. Keep titles under 200 characters. If a deadline is not stated, set deadline to null. Also return an overall extraction confidence between 0 and 1.";

export const parseSyllabus = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    if (!data.imageBase64 && !data.rawText) {
      return { ok: false as const, reason: "No image payload or text string provided." };
    }

    const key = process.env.LOVABLE_API_KEY;
    if (!key) {
      return { ok: false as const, reason: "AI service is not configured." };
    }

    const gateway = createLovableAiGatewayProvider(key);

    const content: Array<Record<string, unknown>> = [{ type: "text", text: PROMPT }];
    if (data.imageBase64) {
      content.push({
        type: "file",
        data: data.imageBase64.replace(/^data:[^;]+;base64,/, ""),
        mediaType: data.mimeType || "image/jpeg",
      });
    }
    if (data.rawText) {
      content.push({ type: "text", text: `Raw Text to Parse: ${data.rawText}` });
    }

    try {
      const { output } = await generateText({
        model: gateway("google/gemini-3.6-flash"),
        output: Output.object({ schema: ResultSchema }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        messages: [{ role: "user", content: content as any }],
      });

      return {
        ok: true as const,
        payload: output.tasks.map((t) => ({
          title: t.title,
          deadline: t.deadline ?? undefined,
          effortSize: t.effortSize,
          difficulty: t.difficulty,
        })),
        confidence: output.confidence,
      };
    } catch (err) {
      if (NoObjectGeneratedError.isInstance(err)) {
        return { ok: false as const, reason: "AI extraction could not resolve structured tasks." };
      }
      const message = err instanceof Error ? err.message : "Extraction pipeline failure.";
      if (message.includes("429")) {
        return { ok: false as const, reason: "AI rate limit reached — please try again shortly." };
      }
      if (message.includes("402")) {
        return { ok: false as const, reason: "AI credits exhausted — please top up to continue." };
      }
      return { ok: false as const, reason: message };
    }
  });
