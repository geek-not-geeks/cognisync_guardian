import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Strict JSON Schema sent to the LLM to guarantee structured array returns
const TASK_SCHEMA = {
  type: "object",
  properties: {
    tasks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string", description: "Clear, concise action item title" },
          deadline: { type: "string", description: "Extracted natural language date/time (e.g., 'Tomorrow 5pm', '22 July')" },
          effortSize: { type: "string", enum: ["Quick", "Standard", "Deep Work"] },
          difficulty: { type: "string", enum: ["Comfortable", "Challenging", "Very Hard"] },
        },
        required: ["title", "effortSize", "difficulty"],
      },
    },
    confidence: { type: "number", description: "Overall extraction confidence between 0.0 and 1.0" },
  },
  required: ["tasks", "confidence"],
};

const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";
const LEGACY_MODEL_ALIASES: Record<string, string> = {
  "gemini-1.5-flash": DEFAULT_GEMINI_MODEL,
  "models/gemini-1.5-flash": DEFAULT_GEMINI_MODEL,
  "gemini-1.5-flash-latest": DEFAULT_GEMINI_MODEL,
  "models/gemini-1.5-flash-latest": DEFAULT_GEMINI_MODEL,
};

function normalizeGeminiModel(model: string) {
  const trimmed = model.trim();
  const withoutPrefix = trimmed.replace(/^models\//, "");
  return LEGACY_MODEL_ALIASES[trimmed] ?? LEGACY_MODEL_ALIASES[withoutPrefix] ?? withoutPrefix;
}

function resolveGeminiModels() {
  const configuredModel = Deno.env.get("GEMINI_MODEL")?.trim();
  const primaryModel = configuredModel ? normalizeGeminiModel(configuredModel) : DEFAULT_GEMINI_MODEL;

  return Array.from(new Set([primaryModel, DEFAULT_GEMINI_MODEL]));
}

async function callGeminiModel(apiKey: string, model: string, contents: unknown[]) {
  return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: contents }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: TASK_SCHEMA,
      },
    }),
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ ok: false, reason: "Unauthorized session." }, 401);
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return jsonResponse({ ok: false, reason: "Unauthorized session." }, 401);
    }

    let requestPayload: { imageBase64?: string; rawText?: string; mimeType?: string };
    try {
      requestPayload = await req.json();
    } catch (_payloadErr) {
      return jsonResponse({ ok: false, reason: "Malformed request payload." }, 400);
    }

    const { imageBase64, rawText, mimeType } = requestPayload;
    if (!imageBase64 && !rawText) {
      return jsonResponse({ ok: false, reason: "No image payload or text string provided." }, 400);
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return jsonResponse({ ok: false, reason: "Missing GEMINI_API_KEY edge function secret." });
    }

    const promptInstructions = "You are an expert academic executive assistant. Analyze this syllabus, whiteboard scan, or raw text. Extract all distinct homework assignments, exams, or study tasks into structured action items. Clamp titles to 200 characters. If deadlines are omitted, leave deadline empty.";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contents: any[] = [{ text: promptInstructions }];
    if (imageBase64) {
      contents.push({
        inline_data: {
          mime_type: mimeType || "image/jpeg",
          data: imageBase64.replace(/^data:image\/\w+;base64,/, ""),
        },
      });
    }
    if (rawText) {
      contents.push({ text: `Raw Text to Parse: ${rawText}` });
    }

    let aiResponse: Response | null = null;
    let lastAiError = "AI model unavailable.";
    for (const model of resolveGeminiModels()) {
      aiResponse = await callGeminiModel(apiKey, model, contents);
      if (aiResponse.ok) break;

      lastAiError = await aiResponse.text();
      const isRetriableModelMiss = aiResponse.status === 404 && /gemini-1\.5-flash|not found|supported for generateContent/i.test(lastAiError);
      if (!isRetriableModelMiss) break;
    }

    if (!aiResponse || !aiResponse.ok) {
      return jsonResponse({ ok: false, reason: `AI Gateway Error: ${lastAiError}` });
    }

    let parsedResult: { tasks?: unknown; confidence?: number } = {};
    try {
      const aiData = await aiResponse.json();
      const rawJsonString = aiData?.candidates?.[0]?.content?.parts?.[0]?.text;
      parsedResult = JSON.parse(rawJsonString || '{"tasks":[],"confidence":0}');
    } catch (_parseErr) {
      return jsonResponse({ ok: false, reason: "Malformed AI payload — could not parse structured JSON." });
    }

    const tasks = Array.isArray(parsedResult.tasks) ? parsedResult.tasks : [];
    const confidence =
      typeof parsedResult.confidence === "number" ? parsedResult.confidence : 0;

    return jsonResponse({ ok: true, payload: tasks, confidence });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Extraction pipeline failure.";
    return jsonResponse({ ok: false, reason: message });
  }
});
