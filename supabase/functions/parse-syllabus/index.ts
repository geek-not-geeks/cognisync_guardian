import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization")!;
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized session." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { imageBase64, rawText, mimeType } = await req.json();
    if (!imageBase64 && !rawText) {
      return new Response(JSON.stringify({ error: "No image payload or text string provided." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      throw new Error("Missing server AI configuration credentials.");
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

    const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: contents }],
        generationConfig: {
          temperature: 0.1,
          response_mime_type: "application/json",
          response_schema: TASK_SCHEMA,
        },
      }),
    });

    if (!aiResponse.ok) {
      const errBody = await aiResponse.text();
      throw new Error(`AI Gateway Error: ${errBody}`);
    }

    const aiData = await aiResponse.json();
    const rawJsonString = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsedResult = JSON.parse(rawJsonString || '{"tasks":[], "confidence": 0}');

    return new Response(
      JSON.stringify({
        ok: true,
        payload: parsedResult.tasks,
        confidence: parsedResult.confidence,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Extraction pipeline failure.";
    return new Response(
      JSON.stringify({ ok: false, reason: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
