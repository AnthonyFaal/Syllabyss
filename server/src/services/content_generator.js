// courseGenerator.js

const axios = require("axios");
const openai = require("../config/openaiClient");
const { OPEN_AI_MODEL } = require("../config/openaiClient");

const CONTENT_GENERATION_API = "https://c694cdd91ed6.ngrok-free.app/generate";

// 🔧 Generate Content URL
const generateContentUrl = async (title, content, contentType) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 📡 [START] Generating content URL for: "${title}" (${contentType})`);
  console.log(`[${timestamp}] 📝 Content length: ${content?.length} characters`);

  try {
    const apiContentType = contentType === "video" ? "video" : "pdf";
    console.log(`[${timestamp}] 🔧 Sending to API as type: ${apiContentType}`);

    const response = await axios.post(CONTENT_GENERATION_API, {
      title,
      content,
      output_format: apiContentType,
    });

    console.log(`[${timestamp}] ✅ API responded. Status: ${response.status}`);
    console.log(`[${timestamp}] 📦 API Response:`, response.data);

    if (response.data?.url && response.data?.type === apiContentType) {
      console.log(`[${timestamp}] 🌐 Generated URL: ${response.data.url}`);
      return response.data.url;
    }

    console.error(`[${timestamp}] ❌ Unexpected structure in response`, response.data);
    return null;

  } catch (error) {
    console.error(`[${timestamp}] ❌ Error generating content URL: ${error.message}`);
    console.error(`[${timestamp}] 🔍 Debug Info:`, {
      title: title,
      contentLength: content?.length,
      type: contentType,
    });
    return null;
  }
};


// 🧠 Generate Course Content
async function generateCourseContent(userPrompt, userHistory = [], options = {}) {
  const { defaultContentType = "article", defaultDifficulty = "beginner" } = options;

  const messages = [
    {
        "role": "system",
        "content": `
      You are a professional curriculum designer and subject matter expert.  
      Your task is to generate **high-quality, accurate, and structured educational course content** in **valid JSON format only**.  

      📝 **Course Content Rules:**  
      - The content must be clear, factual, and logically structured  
      - No generic statements, fluff, or placeholders — always teach with actionable information  
      - Follow a structured teaching style suitable for real learners (no marketing tone)  
      - Use correct grammar, no spelling mistakes  

      📚 **Article Content Must Have:**  
      - Clear headings and subheadings  
      - Bullet points or numbered steps where applicable  
      - Real-life examples to illustrate key concepts  
      - Key takeaways at the end  
      - Easy to read at a Grade 6–10 level  

      📦 **JSON Format:**  
      {
        title, // Extract the course topic as-is from the user input. Example: "Web Programming"
        description,
        difficulty_level, // lowercase, e.g. "beginner", "intermediate", "advanced"
        estimated_duration, // integer, minutes
        modules: [
          {
            title,
            description,
            order_number,
            learning_materials: [
              {
                title,
                content_type, // article, video, etc.
                content, // Clear, structured explanation. Must teach the topic, not just outline it.
                content_url,
                duration, // integer minutes, min 1
                order_number
              }
            ]
          }
        ]
      }

      ⚠️ **Important:**  
      - Only valid JSON in your response  
      - The content must be fact-checked, correct, and error-free  
      - Always provide structured, professional learning content  
      `
      },

    {
      role: "user",
      content: `
    Create a professional course on "${userPrompt}" using ${defaultContentType} with ${defaultContentType === "article" ? "1 module" : "maximum 2 modules"} and total estimated duration of 2 minutes.  
    Default difficulty is "${defaultDifficulty}".  
    Here is user history (do not repeat): ${JSON.stringify(userHistory.map(({ title, description, difficulty_level, estimated_duration }) => ({ title, description, difficulty_level, estimated_duration })))}
    `
    }

  ];

  const response = await openai.chat.completions.create({
    model: OPEN_AI_MODEL,
    messages,
    temperature: 0.7,
    top_p: 0.95
  });

  const content = response.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty response from OpenAI");

  const parsed = JSON.parse(content.trim());

  // Post-process modules
  for (const [modIdx, mod] of parsed.modules.entries()) {
    mod.order_number = modIdx + 1;

   for (const [matIdx, mat] of mod.learning_materials.entries()) {
  mat.order_number = matIdx + 1;
  mat.content_type = mat.content_type || defaultContentType;

  // ✅ Convert duration to integer using Math.ceil or Math.floor
  const rawDuration = mat.duration || 0.5;
  mat.duration = Math.max(1, Math.ceil(rawDuration)); // Ensure minimum duration of 1 minute

 if (mat.content && ["article", "video"].includes(mat.content_type)) {
  const format = mat.content_type === "article" ? "pdf" : "video";
  mat.content_url = await generateContentUrl(mat.title, mat.content, format);
} else {
  mat.content_url = null;
  console.warn(`⚠️ No content available for material "${mat.title}". Skipping URL generation.`);
}

}
  }
 if (defaultContentType === "article" && parsed.modules.length > 1) {
  parsed.modules = [parsed.modules[0]];
}

 const totalDuration = parsed.modules.reduce(
  (sum, mod) => sum + mod.learning_materials.reduce((s, m) => s + (m.duration || 0), 0),
  0
);

return {
  ...parsed,
 estimated_duration: Math.max(1, Math.min(Math.floor(totalDuration), 2))
// Always integer, max 2
};

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
    type = 'personalized',
    currentDifficulty = 'intermediate',
    currentContentType = 'article'
) {
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
            : currentDifficulty,
        duration: Math.min(120, Math.max(5, result.duration || 30)),
        type: ['personalized','trending','new_skill'].includes(result.type)
            ? result.type
            : type,
        contentType: ['article','video'].includes(result.contentType)
            ? result.contentType
            : currentContentType,
        reason: result.reason || "Recommended based on your progress",
        confidence: Math.min(100, Math.max(0, result.confidence || 75))
    };
}

// ✅ Export functions
module.exports = {
  generateCourseContent,
  generateQuizContent,
  generateCourseRecommendation
};
