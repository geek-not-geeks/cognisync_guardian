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

// Gemini 1.5 Flash is retired and now returns a provider 404 on v1beta.
// Do not read GEMINI_MODEL here: a stale project secret can reintroduce the
// retired model at runtime even when the deployed source looks correct.
const GEMINI_MODEL = "gemini-2.0-flash";

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

    const aiResponse = await callGeminiModel(apiKey, GEMINI_MODEL, contents);

    if (!aiResponse.ok) {
      const lastAiError = await aiResponse.text();
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
