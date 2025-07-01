// courseGenerator.js

const axios = require("axios");
const openai = require("../config/openaiClient");
const { OPEN_AI_MODEL } = require("../config/openaiClient");

const CONTENT_GENERATION_API = "https://7483-34-16-248-165.ngrok-free.app/generate";

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
      role: "system",
      content: `You are an expert curriculum designer. Return JSON only. 
           For article (PDF) materials, include rich and well-structured content (e.g., use headings, bullet points, numbered steps, examples, or key takeaways).
 Format: {
        title,  // Professional title that doesn't simply repeat the prompt
        description, 
        difficulty_level, 
        estimated_duration, 
        modules:[
          {
          title, 
          description, 
          order_number, 

          learning_materials:[{
            title, 
            content_type, 
            content, 
            content_url
            duration, 
            order_number
            }]
        }]
      }`,
    },
    {
      role: "user",
      content: `Create a course on "${userPrompt}" with max 2 modules and 2 minutes total. Use ${defaultContentType} and ${defaultDifficulty} as defaults. 
      Previous: ${JSON.stringify(userHistory.map(({ title, description, difficulty_level, estimated_duration }) => ({ title, description, difficulty_level, estimated_duration })))}`,
    },
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

// 🧪 Generate Quiz Content
/*async function generateQuizContent(courseTitle, learningMaterials = []) {
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

  // Determine difficulty based on question features
  function determinePoints(question) {
    const wordCount = question.question_text?.split(/\s+/).length || 0;
    const optionCount = question.options?.length || 0;

    // Basic heuristic: longer & more complex => higher points
    if (wordCount > 20 || optionCount >= 5) return 20;
    if (wordCount > 15) return 15;
    if (wordCount > 10) return 10;
    return 5;
  }

  // Process and validate questions and options
  parsed.questions = (parsed.questions || [])
    .slice(0, 5)
    .map((q, idx) => {
      const validOptions = (q.options || []).filter(
        (opt) => typeof opt.text === "string" && opt.text.trim() !== ""
      );

      return {
        question_text: q.question_text,
        question_type: q.question_type,
        points: determinePoints(q), // dynamically assigned
        order_number: idx + 1,
        options: validOptions.map((opt, i) => ({
          option_text: opt.text.trim(),
          is_correct: !!opt.is_correct,
          order_number: i + 1,
        })),
      };
    });

  // Set defaults and finalize output
  return {
    title: parsed.title || `${courseTitle} Quiz`,
    description: parsed.description || `Quiz for ${courseTitle}`,
    passing_score: parsed.passing_score || 70,
    max_attempts: parsed.max_attempts || 3,
    time_limit: parsed.time_limit || 5,
    questions: parsed.questions,
  };
}*/

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
async function generateCourseRecommendation(userPrompt, userHistory = [], recommendationType = 'personalized') {
  const messages = [
    {
      role: "system",
      content: `You are a career guidance AI. Suggest a course idea in JSON only format like:
      {
        suggested_course_title, // short precise
        suggested_course_description,  // short precise
        suggested_difficulty_level, // 'beginner' | 'intermediate' | 'advanced'
        suggested_estimated_duration, // integer in minutes less than from 2 and 5
        recommendation_type, // 'personalized' | 'trending' | 'new_skill'
        reason,  // short precise
        confidence_score // between 0 and 100
      }
      Return only the JSON.`
    },
    {
      role: "user",
      content: `Suggest a course for the prompt "${userPrompt}".
      User's history: ${JSON.stringify(userHistory.map(h => ({ title: h.title, level: h.difficulty_level })))}
      Recommendation type: ${recommendationType}`
    }
  ];

  const response = await openai.chat.completions.create({
    model: OPEN_AI_MODEL,
    messages,
    temperature: 0.7,
    top_p: 0.9
  });

  const content = response.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty response from OpenAI");

  const parsed = JSON.parse(content.trim());

  // Fallbacks in case values are missing
  return {
    suggested_course_title: parsed.suggested_course_title || "Untitled Course",
    suggested_course_description: parsed.suggested_course_description || "No description provided.",
    suggested_difficulty_level: parsed.suggested_difficulty_level || "beginner",
    suggested_estimated_duration: Math.max(1, parseInt(parsed.suggested_estimated_duration) || 5),
    recommendation_type: parsed.recommendation_type || recommendationType,
    reason: parsed.reason || "Based on your interests and activity history.",
    confidence_score: Math.min(100, Math.max(0, parseFloat(parsed.confidence_score) || 70)),
  };
}

// ✅ Export functions
module.exports = {
  generateCourseContent,
  generateQuizContent,
  generateCourseRecommendation
};
