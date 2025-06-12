const ModelClient = require("@azure-rest/ai-inference").default;
const { isUnexpected } = require("@azure-rest/ai-inference");
const { AzureKeyCredential } = require("@azure/core-auth");

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = "https://models.github.ai/inference";
const DEEPSEEK_MODEL = "deepseek/DeepSeek-V3-0324";

async function generateCourseContent(userPrompt, userHistory = [], options = {}) {
  try {
    if (!userPrompt || typeof userPrompt !== "string") {
      throw new Error("Invalid user prompt");
    }

    const { defaultContentType = "article", defaultDifficulty = "beginner" } = options;

    const formattedHistory = Array.isArray(userHistory)
      ? userHistory.map(course => ({
          title: course.title,
          description: course.description,
          difficulty_level: course.difficulty_level,
          estimated_duration: course.estimated_duration,
        }))
      : [];

    const messages = [
      {
        role: "system",
        content: `You are an expert curriculum designer. Respond with pure JSON only, without any Markdown formatting, code blocks, or additional text.
        The JSON must contain these fields:
        - title (string)
        - description (string)
        - difficulty_level ("beginner", "intermediate", or "advanced")
        - estimated_duration (number, in minutes, max 2)
        - modules (array, max 2 items) with:
          - title (string)
          - description (string)
          - order_number (number)
          - learning_materials (array) with:
            - title (string)
            - content_type ("video", "article", "quiz", or "exercise")
            - content_url (string or null)
            - duration (number, in minutes)
            - order_number (number)`
      },
      {
        role: "user",
        content: `Create a comprehensive course based on: "${userPrompt}".\n
        ${formattedHistory.length > 0 ? `Previous courses:\n${JSON.stringify(formattedHistory)}.\n` : ""}
        Requirements:
        - Maximum 2 modules
        - Total duration must not exceed 2 minutes
        - Default content type: ${defaultContentType}
        - Default difficulty: ${defaultDifficulty}`
      }
    ];

    const client = ModelClient(DEEPSEEK_API_URL, new AzureKeyCredential(DEEPSEEK_API_KEY));

    const response = await client.path("/chat/completions").post({
      body: {
        model: DEEPSEEK_MODEL,
        messages,
        temperature: 0.7,
        top_p: 0.95,
        max_tokens: 2048,
        response_format: { type: "json_object" } // Explicitly request JSON response
      },
    });

    if (isUnexpected(response)) {
      throw response.body.error;
    }

    const content = response.body.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Invalid response structure from DeepSeek API");
    }

    // Clean the content by removing any Markdown code block syntax
    let cleanedContent = content.replace(/^```json\s*|\s*```$/g, '').trim();

    // Parse the JSON content with error handling
    let parsed;
    try {
      parsed = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error("Failed to parse response:", cleanedContent);
      throw new Error(`Failed to parse AI response: ${parseError.message}`);
    }

    // Validate and enforce constraints
    if (!parsed.title || !parsed.description) {
      throw new Error("AI response missing required fields");
    }

    // Set defaults if missing
    parsed.difficulty_level = parsed.difficulty_level || defaultDifficulty;
    parsed.estimated_duration = Math.min(parsed.estimated_duration || 2, 2);

    // Ensure max 2 modules
    if (Array.isArray(parsed.modules)) {
      parsed.modules = parsed.modules.slice(0, 2);
      
      // Process each module
      parsed.modules.forEach((module, moduleIndex) => {
        module.order_number = moduleIndex + 1;
        
        if (Array.isArray(module.learning_materials)) {
          module.learning_materials.forEach((material, materialIndex) => {
            material.content_type = material.content_type || defaultContentType;
            material.order_number = materialIndex + 1;
            material.duration = Math.min(material.duration || 0.5, 1); // Cap at 1 minute per material
          });
        } else {
          module.learning_materials = [];
        }
      });
    } else {
      parsed.modules = [];
    }

    // Recalculate total duration
    const totalDuration = parsed.modules.reduce((total, module) => {
      return total + (module.learning_materials?.reduce((sum, mat) => sum + (mat.duration || 0), 0) || 0);
    }, 0);
    parsed.estimated_duration = Math.min(totalDuration, 2);

    return parsed;

  } catch (error) {
    console.error("Error in generateCourseContent:", error);
    throw new Error(`Failed to generate course content: ${error.message}`);
  }
}

module.exports = {
  generateCourseContent,
};