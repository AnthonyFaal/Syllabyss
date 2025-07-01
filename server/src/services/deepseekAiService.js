const ModelClient = require("@azure-rest/ai-inference").default;
const { isUnexpected } = require("@azure-rest/ai-inference");
const { AzureKeyCredential } = require("@azure/core-auth");
const axios = require("axios"); 

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = "https://models.github.ai/inference";
const DEEPSEEK_MODEL = "deepseek/DeepSeek-V3-0324";
const CONTENT_GENERATION_API = "https://1b97-35-240-190-13.ngrok-free.app/generate";

async function generateContentUrl(title, content, contentType) {
  console.log(`📡 Starting content URL generation for "${title}" (${contentType})`);
  console.log(`📝 Content length: ${content.length} characters`);
  
  try {
    const apiContentType = contentType === "video" ? "video" : "pdf";
    console.log(`🔧 Preparing request to content generation API with type: ${apiContentType}`);
    
    const response = await axios.post(CONTENT_GENERATION_API, {
      title,
      content, 
      output_format: apiContentType,
    });
    
    console.log(`✅ Received response from content generation API. Status: ${response.status}`);
    console.debug(`📦 Response data:`, response.data);
    
    if (response.data && response.data.url && response.data.type === apiContentType) {
      console.log(`🌐 Generated URL: ${response.data.url}`);
      return response.data.url; 
    }
    
    console.error("❌ Invalid response structure from content generation API");
    throw new Error("Invalid response from content generation API");
  } catch (error) {
    console.error(`❌ Failed to generate ${contentType} URL:`, error.message);
    console.error("Request details:", {
      title: title.substring(0, 50) + (title.length > 50 ? "..." : ""),
      contentLength: content.length,
      contentType
    });
    return null;
  }
}

async function generateCourseContent(userPrompt, userHistory = [], options = {}) {
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] Starting course content generation...`);
  console.debug('Input parameters:', { userPrompt, userHistory, options });

  try {
    if (!userPrompt || typeof userPrompt !== "string") {
      const error = new Error("Invalid user prompt");
      console.error('Validation failed:', error.message, { userPrompt });
      throw error;
    }

    const { defaultContentType = "article", defaultDifficulty = "beginner" } = options;
    console.log(`Using defaults - Content Type: ${defaultContentType}, Difficulty: ${defaultDifficulty}`);

    // Format user history
    const historyStart = Date.now();
    const formattedHistory = Array.isArray(userHistory)
      ? userHistory.map(course => ({
          title: course.title,
          description: course.description,
          difficulty_level: course.difficulty_level,
          estimated_duration: course.estimated_duration,
        }))
      : [];
    console.debug(`Formatted history in ${Date.now() - historyStart}ms`, formattedHistory);

    // Prepare messages for API
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
    console.debug('Prepared messages for API:', messages);

    // Call DeepSeek API
    console.log(`[${new Date().toISOString()}] Calling DeepSeek API...`);
    const apiStart = Date.now();
    const client = ModelClient(DEEPSEEK_API_URL, new AzureKeyCredential(DEEPSEEK_API_KEY));

    const response = await client.path("/chat/completions").post({
      body: {
        model: DEEPSEEK_MODEL,
        messages,
        temperature: 0.7,
        top_p: 0.95,
        max_tokens: 2048,
        response_format: { type: "json_object" }
      },
    });

    console.log(`[${new Date().toISOString()}] API call completed in ${Date.now() - apiStart}ms`);
    
    if (isUnexpected(response)) {
      console.error('API returned unexpected response:', response.body.error);
      throw response.body.error;
    }

    const content = response.body.choices?.[0]?.message?.content;
    if (!content) {
      const error = new Error("Invalid response structure from DeepSeek API");
      console.error(error.message, { response });
      throw error;
    }

    // Parse and clean response
    console.log('Processing API response...');
    let cleanedContent = content.replace(/^```json\s*|\s*```$/g, '').trim();
    let parsed;
    try {
      parsed = JSON.parse(cleanedContent);
      console.debug('Successfully parsed API response');
    } catch (parseError) {
      console.error("Failed to parse response:", { cleanedContent, error: parseError });
      throw new Error(`Failed to parse AI response: ${parseError.message}`);
    }

    // Set defaults and validate structure
    console.log('Validating and enhancing course structure...');
    parsed.difficulty_level = parsed.difficulty_level || defaultDifficulty;
    parsed.estimated_duration = Math.min(parsed.estimated_duration || 2, 2);
    console.debug('Base course structure:', { 
      title: parsed.title, 
      difficulty: parsed.difficulty_level,
      duration: parsed.estimated_duration 
    });

    // Process modules
    if (Array.isArray(parsed.modules)) {
      console.log(`Processing ${parsed.modules.length} modules...`);
      parsed.modules = parsed.modules.slice(0, 2);

      for (let moduleIndex = 0; moduleIndex < parsed.modules.length; moduleIndex++) {
        const module = parsed.modules[moduleIndex];
        module.order_number = moduleIndex + 1;
        console.debug(`Processing module ${module.order_number}: ${module.title}`);

        if (Array.isArray(module.learning_materials)) {
          console.log(`Processing ${module.learning_materials.length} learning materials...`);
          for (let materialIndex = 0; materialIndex < module.learning_materials.length; materialIndex++) {
            const material = module.learning_materials[materialIndex];
            console.debug(`Processing material ${materialIndex + 1}: ${material.title}`);

            material.content_type = material.content_type || defaultContentType;
            material.order_number = materialIndex + 1;
            material.duration = Math.min(material.duration || 0.5, 1);

            // Generate content URL if applicable
            if (["article", "video"].includes(material.content_type)) {
              console.log(`Generating URL for ${material.content_type} material...`);
              const typeForUrl = material.content_type === "article" ? "pdf" : "video";
              material.content_url = await generateContentUrl(
                material.title,
                userPrompt,
                typeForUrl
              );
              console.debug(`Generated URL: ${material.content_url}`);
            } else {
              material.content_url = null;
            }
          }
        } else {
          console.warn('Module has no valid learning_materials array, initializing empty array');
          module.learning_materials = [];
        }
      }
    } else {
      console.warn('Response has no valid modules array, initializing empty array');
      parsed.modules = [];
    }

    // Calculate total duration
    const totalDuration = parsed.modules.reduce((total, module) => {
      return total + (module.learning_materials?.reduce((sum, mat) => sum + (mat.duration || 0), 0) || 0);
    }, 0);
    parsed.estimated_duration = Math.min(totalDuration, 2);
    console.log(`Final calculated duration: ${parsed.estimated_duration} minutes`);

    console.log(`[${new Date().toISOString()}] Course generation completed successfully in ${Date.now() - startTime}ms`);
    console.debug('Final course structure:', parsed);
    return parsed;

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in generateCourseContent after ${Date.now() - startTime}ms:`, {
      error: error.message,
      stack: error.stack,
      inputParams: { userPrompt, userHistory, options }
    });
    throw new Error(`Failed to generate course content: ${error.message}`);
  }
}


async function generateQuizContent(courseTitle, learningMaterials, options = {}) {
  console.log("📝 Starting quiz generation process");
  console.log(`🏷️ Course title: ${courseTitle}`);
  console.log(`📚 Learning materials count: ${learningMaterials.length}`);
  console.log(`⚙️ Options:`, options);

  try { 
    if (!courseTitle || typeof courseTitle !== "string") {
      console.error("❌ Invalid course title provided");
      throw new Error("Invalid course title");
    }

    const formattedMaterials = learningMaterials.map(mat => ({
      title: mat.title,
      content: mat.content
    }));

    console.log("📦 Formatted learning materials:", formattedMaterials);

    const messages = [
      {
        role: "system",
        content: `You are an expert educational AI...` // (truncated for brevity)
      },
      {
        role: "user",
        content: `Generate a quiz for the course titled "${courseTitle}"...` // (truncated for brevity)
      }
    ];

    console.log("✉️ Constructed messages for AI:", messages);

    console.log("🔌 Initializing DeepSeek API client");
    const client = ModelClient(DEEPSEEK_API_URL, new AzureKeyCredential(DEEPSEEK_API_KEY));

    console.log("📤 Sending quiz generation request to DeepSeek API...");
    const response = await client.path("/chat/completions").post({
      body: {
        model: DEEPSEEK_MODEL,
        messages,
        temperature: 0.7,
        top_p: 0.9,
        max_tokens: 2048,
        response_format: { type: "json_object" }
      },
    });

    console.log(`📥 Received API response. Status: ${response.status}`);
    
    if (isUnexpected(response)) {
      console.error("❌ Unexpected API response:", response.body.error);
      throw response.body.error;
    }

    const content = response.body.choices?.[0]?.message?.content;
    console.log("📄 Raw AI quiz response:", content);

    if (!content) {
      console.error("❌ Empty content in quiz API response");
      throw new Error("Invalid response structure from DeepSeek API");
    }

    console.log("🧹 Cleaning quiz response content...");
    let cleanedContent = content.replace(/^```json\s*|\s*```$/g, '').trim();
    console.debug("🧽 Cleaned quiz content:", cleanedContent);

    let parsed;
    try {
      console.log("🔍 Parsing quiz JSON content...");
      parsed = JSON.parse(cleanedContent);
      console.log("✅ Successfully parsed quiz JSON");
    } catch (parseError) {
      console.error("❌ Failed to parse quiz JSON:", cleanedContent);
      throw new Error(`Failed to parse AI quiz response: ${parseError.message}`);
    }

    console.log("🔍 Validating quiz structure...");
    if (!parsed.title || !Array.isArray(parsed.questions)) {
      console.error("❌ Missing required fields in quiz response:", parsed);
      throw new Error("AI quiz response missing required fields");
    }

    console.log("⚙️ Setting quiz defaults...");
    parsed.passing_score = parsed.passing_score || 70;
    parsed.max_attempts = parsed.max_attempts || 3;
    parsed.time_limit = parsed.time_limit || 5;

    console.log(`📊 Initial quiz structure:
      Title: ${parsed.title}
      Questions: ${parsed.questions.length}
      Passing Score: ${parsed.passing_score}
      Time Limit: ${parsed.time_limit} mins`);

    console.log("📝 Processing questions...");
    parsed.questions = parsed.questions.slice(0, 5).map((q, index) => {
      console.log(`❓ Processing question ${index + 1}: ${q.question_text.substring(0, 50)}...`);
      
      q.points = q.points || 1;
      q.order_number = index + 1;

      if (["multiple_choice", "true_false"].includes(q.question_type) && Array.isArray(q.options)) {
        console.log(`🔘 Processing ${q.options.length} options for question ${index + 1}`);
        q.options = q.options.map((opt, optIndex) => ({
          ...opt,
          order_number: optIndex + 1
        }));
      } else {
        console.warn(`⚠️ Invalid question type or options for question ${index + 1}`);
        q.options = [];
      }

      return q;
    });

    console.log("🎉 Quiz generation completed successfully");
    console.log(`📝 Final quiz details:
      Title: ${parsed.title}
      Questions: ${parsed.questions.length}
      Passing Score: ${parsed.passing_score}%
      Time Limit: ${parsed.time_limit} minutes`);

    return parsed;

  } catch (error) {
    console.error("❌ Error in generateQuizContent:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack
    });
    throw new Error(`Failed to generate quiz content: ${error.message}`);
  }
}

module.exports = {
  generateCourseContent,
  generateQuizContent
};