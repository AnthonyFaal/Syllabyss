const { 
  validateEntity, 
  BaseRepository, 
  generateDeadline
} = require('../utils/index');
const { generateCourseContent } = require('../services/deepseekAiService');

const courseRepository = new BaseRepository('courses');
const moduleRepository = new BaseRepository('modules');
const materialRepository = new BaseRepository('learning_materials');

class CourseController {
   async createCourse(req, res, next) {
    try {
      const { prompt, user_id, content_type, difficulty_level } = req.body;

      if (!prompt || !user_id) {
        return res.status(400).json({
          success: false,
          error: "Missing prompt or user_id",
        });
      }

      // Validate optional inputs and set defaults
      const validContentTypes = ["video", "article", "quiz", "exercise"];
      const validDifficulties = ["beginner", "intermediate", "advanced"];

      const defaultContentType = validContentTypes.includes(content_type) ? content_type : "article";
      const defaultDifficulty = validDifficulties.includes(difficulty_level) ? difficulty_level : "beginner";

      // Step 1: Fetch user history (past courses)
      const pastCourses = await courseRepository.getAll({ user_id });

      // Step 2: Generate course structure with AI, passing optional defaults
      const courseStructure = await generateCourseContent(prompt, pastCourses, {
        defaultContentType,
        defaultDifficulty,
      });

      // Step 3: Extract and save the course
      const courseData = {
        title: courseStructure.title,
        description: courseStructure.description,
        difficulty_level: courseStructure.difficulty_level,
        estimated_duration: courseStructure.estimated_duration,
        user_id,
        deadline: generateDeadline({
          durationType: "course",
          durationValue: courseStructure.estimated_duration,
          durationUnit: "minutes",
          strategy: "custom",
        }),
      };

      validateEntity(courseData, "course", "create");
      const course = await courseRepository.create(courseData);

      // Step 4: Save modules and learning materials
      for (const [index, mod] of courseStructure.modules.entries()) {
        const moduleData = {
          course_id: course.course_id,
          title: mod.title,
          description: mod.description,
          order_number: mod.order_number || index + 1,
        };

        const module = await moduleRepository.create(moduleData);

        for (const [mIndex, mat] of (mod.learning_materials || []).entries()) {
          const materialData = {
            module_id: module.module_id,
            title: mat.title,
            content_type: mat.content_type || defaultContentType,
            content_url: mat.content_url || "",
            duration: mat.duration || 0,
            order_number: mat.order_number || mIndex + 1,
          };

          await materialRepository.create(materialData);
        }
      }

      res.status(201).json({
        success: true,
        data: course,
      });
    } catch (error) {
      next(error);
    }
  }

   async getCourse(req, res, next) {
    try {
      const courseId = req.params.id;
      const course = await courseRepository.getById(courseId);
      
      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }
      
      // Get all modules for this course
      const modules = await moduleRepository.getAll({ course_id: courseId });
      
      // For each module, get its learning materials
      const courseWithModules = await Promise.all(modules.map(async (mod) => {
        const materials = await materialRepository.getAll({ module_id: mod.module_id });
        return {
          ...mod,
          learning_materials: materials
        };
      }));
      
      res.status(200).json({
        success: true,
        data: {
          ...course,
          modules: courseWithModules
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllCourses(req, res, next) {
    try {
      const { difficulty, search, page, limit } = req.query;
      const conditions = {};
      
      if (difficulty) {
        conditions.difficulty_level = difficulty;
      }
      
      if (search) {
        conditions.title = { ilike: `%${search}%` };
      }
      
      const courses = await courseRepository.paginate({
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10,
        conditions
      });
      
      // For each course, get its modules and materials
      const enrichedCourses = await Promise.all(courses.data.map(async (course) => {
        const modules = await moduleRepository.getAll({ course_id: course.course_id });
        
        const modulesWithMaterials = await Promise.all(modules.map(async (mod) => {
          const materials = await materialRepository.getAll({ module_id: mod.module_id });
          return {
            ...mod,
            learning_materials: materials
          };
        }));
        
        return {
          ...course,
          modules: modulesWithMaterials
        };
      }));
      
      res.status(200).json({
        success: true,
        ...courses,
        data: enrichedCourses
      });
    } catch (error) {
      next(error);
    }
  }
  
    async getCoursesByUser(req, res, next) {
    try {
      const userId = req.params.userId || req.user.id;
      const { page, limit } = req.query;
      
      const courses = await courseRepository.paginate({
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10,
        conditions: { user_id: userId }
      });
      
      // For each course, get its modules and materials
      const enrichedCourses = await Promise.all(courses.data.map(async (course) => {
        const modules = await moduleRepository.getAll({ course_id: course.course_id });
        
        const modulesWithMaterials = await Promise.all(modules.map(async (mod) => {
          const materials = await materialRepository.getAll({ module_id: mod.module_id });
          return {
            ...mod,
            learning_materials: materials
          };
        }));
        
        return {
          ...course,
          modules: modulesWithMaterials
        };
      }));
      
      res.status(200).json({
        success: true,
        ...courses,
        data: enrichedCourses
      });
    } catch (error) {
      next(error);
    }
  }
  
  async updateCourse(req, res, next) {
    try {
      const courseId = req.params.id;
      const userId = req.user.id;
      const updateData = req.body;
      
      // Validate input
      validateEntity(updateData, 'course', 'update');
      
      // Check if course exists and belongs to user
      const existingCourse = await courseRepository.getById(courseId);
      if (!existingCourse) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }
      
      if (existingCourse.user_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to update this course'
        });
      }
      
      // Update course
      const updatedCourse = await courseRepository.update(courseId, updateData);
      
      res.status(200).json({
        success: true,
        data: updatedCourse
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteCourse(req, res, next) {
    try {
      const courseId = req.params.id;
      const userId = req.user.id;
      
      // Check if course exists and belongs to user
      const existingCourse = await courseRepository.getById(courseId);
      if (!existingCourse) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }
      
      if (existingCourse.user_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to delete this course'
        });
      }
      
      // Delete course
      await courseRepository.delete(courseId);
      
      res.status(200).json({
        success: true,
        message: 'Course deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteAllCourses(req, res, next) {
  try {
    // Verify admin privileges
    // if (!req.user.isAdmin) {
    //   return res.status(403).json({
    //     success: false,
    //     message: 'Admin privileges required'
    //   });
    // }

    // Get counts before deletion (optional)
    
    const moduleCount = await moduleRepository.count();
    const materialCount = await materialRepository.count();

    // Delete all courses - cascading will handle modules/materials
    const deletedCourses = await courseRepository.deleteAll();

    res.status(200).json({
      success: true,
      message: 'All courses and associated data deleted successfully',
      deletedCount: {
        courses: deletedCourses.length,
        modules: moduleCount, // These will be deleted by cascade
        materials: materialCount // These will be deleted by cascade
      }
    });
  } catch (error) {
    next(error);
  }
}
}

module.exports = new CourseController();