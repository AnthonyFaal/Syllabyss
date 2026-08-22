// courseGenerator.js

const axios = require("axios");
const https = require("https");
const openai = require("../config/openaiClient");
const { OPEN_AI_MODEL } = require("../config/openaiClient");
const dotenv = require('dotenv');
dotenv.config();
 
const { jsonrepair } = require("jsonrepair");

const CONTENT_GENERATION_API =`${process.env.CONTENT_GENERATOR_URL}/generate`;
 

// Create HTTPS agent to avoid TLS keep-alive issues
const httpsAgent = new https.Agent({
  keepAlive: false,          // disable connection reuse (fixes bad record mac)
  minVersion: "TLSv1.2",     // force TLS 1.2+ (ngrok sometimes breaks on TLS1.3)
});

const generateContentUrl = async (title, structuredContent, outputFormat, voice) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 📡 [START] Generating content URL for: "${title}" (${outputFormat})`);

  try {
    const apiFormat = outputFormat === "article" ? "pdf" : outputFormat;

    const normalizedContent = structuredContent.map(block => ({
      type: block.type,
      content: block.content,
      ...(apiFormat !== "pdf" ? { narration: block.narration || block.content } : {})
    }));

    const payload = {
      title,
      output_format: apiFormat,
      voice: voice || "Ava",
      structured_content: normalizedContent
    };

    const response = await axios.post(CONTENT_GENERATION_API, payload, {
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      httpsAgent, // ✅ add the custom agent here
    });

    console.log("📡 API response:", response.data);

    if (!response.data?.url) {
      console.warn(`[${timestamp}] ⚠️ API did not return a URL. Returning placeholder.`);
      return "about:blank";
    }

    return response.data.url;

  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Error generating content URL: ${error.message}`);
    throw error;
  }
};

// 🧠 Generate Course Content
async function generateCourseContent(userPrompt, userHistory = [], options = {}) {
  // Use passed values if provided, otherwise default
  const content_type = options.content_type ?? "article"; // fallback only if undefined or null
  const difficulty_level = options.difficulty_level ?? "beginner";
  const voice = options.voice ?? "Ava";
 
  const isArticle = content_type === "article";

  // ---- LLM Call (same as before) ----
const messages = [
  {
    role: "system",
    content: `
      You are a professional curriculum designer. Return ONLY valid JSON (never include markdown, HTML, or explanatory text if the format is video).
      Produce structured course content matching this JSON schema:

      {
        "title": string, // Extract the course topic as-is from the user input
        "description": string,
        "difficulty_level": "beginner" | "intermediate" | "advanced",
        "estimated_duration": integer, // minutes
        "output_format": "article" | "video",
        "voice": string | null,
        "modules": [
          {
            "title": string,
            "description": string,
            "bloom_level": "Remember" | "Understand" | "Apply" | "Analyze" | "Evaluate" | "Create",
            "order_number": integer,
            "learning_materials": [
              {
                "title": string,
                "content_type": "article" | "video",
                "structured_content": [
                  { 
                    "type": "text" | "code" | "diagram" | "quote" | "list", // strictly these only
                    "header": string | null, // meaningful mini-header, null if plain text
                    "content": string, // no HTML, only plain text; lists must be newline-separated
                    "narration": string (required if video, forbidden if article)
                  }
                ],
                "content_url": string | null,
                "duration": integer, // minutes, min 1
                "order_number": integer
              }
            ]
          }
        ]
      }

      Rules:
      - Each module must follow Bloom's Taxonomy progression:
        1. Module 1: Remember & Understand
        2. Module 2: Apply & Analyze
        3. Module 3: Evaluate & Create (skip if video with only 2 modules)
      - For video: EVERY content block MUST include a 'narration' field
      - For article: NEVER include 'narration'
      - "voice" is required if video, null if article
      - Article content must be detailed and self-contained (≈3–5 pages), including:
        * Clear explanations
        * Step-by-step examples
        * Code snippets
        * Diagrams, lists, or quotes as needed
      - Lists must be **newline-separated text**, NOT HTML or markdown
      - Video content: 30–90 seconds narration per block with visuals
      - Avoid placeholders or minimal text; every block must be meaningful
      - Each module can have max 2 materials for PDF, 1 for video
    `.trim()
  },
  {
    role: "user",
    content: `
      Generate a professional course on "\${userPrompt}".
      Type: \${content_type}, Difficulty: \${difficulty_level}.
      User history (do not repeat): \${JSON.stringify(userHistory.map(h => ({ title: h.title, description: h.description })))}
      Ensure the content is rich, detailed, readable, and modules progress through Bloom's Taxonomy levels.
    `.trim()
  }
];

   const resp = await openai.chat.completions.create({
    model: OPEN_AI_MODEL,
    messages,
    temperature: 0.3,
    max_tokens: 1400,
  });

  const raw = resp.choices?.[0]?.message?.content;
  if (!raw) throw new Error("Empty response from LLM");

  let parsed;
  try { parsed = JSON.parse(raw.trim()); } 
  catch (e) {
    console.warn("⚠️ Raw JSON invalid, attempting repair...");
    try { parsed = JSON.parse(jsonrepair(raw)); } 
    catch (repairErr) { throw repairErr; }
  }

  // Use the values as-is if provided; fallback only if missing
  parsed.output_format = content_type;
  parsed.voice = isArticle ? null : voice;

  // ---- Post-process modules ----
  for (const [modIdx, mod] of parsed.modules.entries()) {
    mod.order_number = modIdx + 1;

    for (const [matIdx, mat] of mod.learning_materials.entries()) {
      mat.order_number = matIdx + 1;
      mat.content_type = mat.content_type ?? content_type;
      mat.title = mat.title ?? `Material ${mat.order_number}`;
      mat.duration = Math.max(1, Math.ceil(mat.duration ?? (isArticle ? 10 : 1)));

      if (!Array.isArray(mat.structured_content) || !mat.structured_content.length) {
        mat.structured_content = [{
          type: "text",
          content: "Content missing – placeholder.",
          narration: isArticle ? undefined : "Narration not provided"
        }];
      }

      const format = isArticle ? "pdf" : "video";
      const voiceToUse = isArticle ? null : voice;

      mat.content_url = await generateContentUrl(mat.title, mat.structured_content, format, voiceToUse);
    }
  }

  const totalDuration = parsed.modules.reduce(
    (sum, mod) => sum + mod.learning_materials.reduce((s, m) => s + (m.duration ?? 0), 0),
    0
  );

  return { ...parsed, estimated_duration: Math.max(1, Math.floor(totalDuration)) };
}


async function generateQuizContent(courseTitle, learningMaterials = []) {
  const messages = [
    {
      role: "system",
      content: `You are a professional quiz creator. Output a JSON with:
      {
        title,
        description,  
        questions: [
          {
            question_text: string,
            question_type: "multiple_choice" | "true_false",
            options: [
              { text: string (non-empty), is_correct: boolean }
            ]
          }
        ],
        passing_score: number,
        max_attempts: number,
        time_limit: number
      }
      Return only JSON. Do not include explanations or any text outside the JSON.`,
    },
    {
      role: "user",
      content: `Generate a 5-question quiz for the course "${courseTitle}" based on the materials: ${JSON.stringify(
        learningMaterials.map((m) => m.title)
      )}`,
    },
  ];

  const response = await openai.chat.completions.create({
    model: OPEN_AI_MODEL,
    messages,
    temperature: 0.7,
    top_p: 0.95,
  });

  const content = response.choices?.[0]?.message?.content;
  if (!content) throw new Error("No content returned from quiz generation");

  const parsed = JSON.parse(content.trim());

  // Determine initial weights based on question complexity
  function determineQuestionWeight(question) {
    const wordCount = question.question_text?.split(/\s+/).length || 0;
    const optionCount = question.options?.length || 0;
    const hasMultipleCorrect = question.options?.filter(opt => opt.is_correct).length > 1;

    // Weight calculation
    let weight = 1; // base weight
    
    // Add weight for question length
    if (wordCount > 25) weight += 3;
    else if (wordCount > 15) weight += 2;
    else if (wordCount > 10) weight += 1;

    // Add weight for options complexity
    if (optionCount > 4) weight += 2;
    else if (optionCount > 3) weight += 1;

    // Add weight for multiple correct answers
    if (hasMultipleCorrect) weight += 2;

    return Math.max(1, weight); // ensure minimum weight of 1
  }

  // Process and validate questions
  let questions = (parsed.questions || [])
    .slice(0, 5)
    .map((q, idx) => {
      const validOptions = (q.options || []).filter(
        (opt) => typeof opt.text === "string" && opt.text.trim() !== ""
      );

      return {
        question_text: q.question_text || `Question ${idx + 1}`,
        question_type: q.question_type || 'multiple_choice',
        weight: determineQuestionWeight(q),
        order_number: idx + 1,
        options: validOptions.map((opt, i) => ({
          option_text: opt.text.trim(),
          is_correct: !!opt.is_correct,
          order_number: i + 1,
        })),
      };
    });

  // Normalize weights to sum to 100 points
  const totalWeight = questions.reduce((sum, q) => sum + q.weight, 0);
  let pointsAssigned = 0;
  
  // Assign points to all questions except last
  questions = questions.map((q, i) => {
    if (i < questions.length - 1) {
      const points = Math.round((q.weight / totalWeight) * 100);
      pointsAssigned += points;
      return { ...q, points };
    }
    // Last question gets remaining points to ensure sum is exactly 100
    return { ...q, points: 100 - pointsAssigned };
  });

  // Validate point distribution
  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
  if (totalPoints !== 100) {
    // Adjust last question if rounding caused imbalance
    questions[questions.length - 1].points += (100 - totalPoints);
  }

  return {
    title: parsed.title || `${courseTitle} Quiz`,
    description: parsed.description || `Quiz for ${courseTitle}`,
    passing_score: Math.min(Math.max(parsed.passing_score || 70, 50), 90), // Ensure between 50-90
    max_attempts: Math.min(Math.max(parsed.max_attempts || 3, 1), 10), // Ensure between 1-10
    time_limit: Math.min(Math.max(parsed.time_limit || 5, 1), 120), // Ensure between 1-120 minutes
    questions,
  };
}

// 🌟 Generate Recommendation
async function generateCourseRecommendation(
    prompt, 
    history, 
    currentDifficulty,
    currentContentType
)
{
    const messages = [
        {
            role: "system",
            content: `Suggest ONE course in JSON format only:
            {
                "title": "string < 5 words",
                "description": "string < 10 words",
                "difficulty": "'beginner'|'intermediate'|'advanced'",
                "duration": "number (minutes 5-120)",
                "type": "'personalized'|'trending'|'new_skill'",
                "contentType": "'article'|'video'",
                "reason": "string < 15 words",
                "confidence": "number 0-100"
            }`
        },
        {
            role: "user",
            content: `Current: ${currentDifficulty} level, ${currentContentType} format.
            History: ${history.length} past recommendations.
            Prompt: ${prompt}`
        }
    ];

    const response = await openai.chat.completions.create({
        model: OPEN_AI_MODEL,
        messages,
        temperature: 0.7,
        response_format: { type: "json_object" }
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) throw new Error("Empty response");

    const result = JSON.parse(content);
    
    return {
        title: result.title || "Recommended Course",
        description: result.description || "Next learning step",
        difficulty: ['beginner','intermediate','advanced'].includes(result.difficulty) 
            ? result.difficulty 
            : null,   // no fallback
        duration: (typeof result.duration === 'number' && result.duration >= 5 && result.duration <= 120) 
            ? result.duration 
            : null,   // no fallback
        type: ['personalized','trending','new_skill'].includes(result.type)
            ? result.type
            : null,   // no fallback
        contentType: ['article','video'].includes(result.contentType)
            ? result.contentType
            : null,   // no fallback
        reason: result.reason || null,
        confidence: (typeof result.confidence === 'number' && result.confidence >= 0 && result.confidence <= 100)
            ? result.confidence
            : null   // no fallback
    };

}
 
// ✅ Export functions
module.exports = {
  generateCourseContent,
  generateQuizContent,
  generateCourseRecommendation
};
