const { BaseRepository } = require('./index');
const db = require("../config/db");

// Initialize repositories
const courseRepo = new BaseRepository('courses', 'course_id');
const moduleRepo = new BaseRepository('modules', 'module_id');
const materialRepo = new BaseRepository('learning_materials', 'material_id');
const goalRepo = new BaseRepository('user_goals', 'user_goal_id');
const timetableRepo = new BaseRepository('timetable', 'id');

async function createTimetable(userId) {
  try {
    const date = new Date();
    const formattedDate = date.toISOString().split("T")[0];
    console.log(`📅 Generating timetable for user ${userId} on ${formattedDate}`);

    // 1. Fetch all user's modules — even from completed courses — to clean completed modules
    const allModules = await moduleRepo.getAll(userId );

    const completedModuleIds = allModules
      .filter(module => module.is_complete)
      .map(m => m.module_id);

    if (completedModuleIds.length > 0) {
      console.log(`🗑️ Found ${completedModuleIds.length} completed modules to delete from timetable`);

      const deleteQuery = `
        DELETE FROM timetable 
        WHERE user_id = $1 
        AND module_id = ANY($2::int[])
        RETURNING *`;

      const { rows: deletedEntries } = await db.query(deleteQuery, [userId, completedModuleIds]);

      console.log(`✅ Deleted ${deletedEntries.length} timetable entries`);
    }

    // 2. Fetch in-progress courses after cleaning
    const [courses, goals] = await Promise.all([
      courseRepo.getAll({ user_id: userId, status: "in_progress" }),
      goalRepo.getAll({ user_id: userId })
    ]);

    if (courses.length === 0) {
      console.log("⚠️ No in-progress courses. Cleanup done, nothing to schedule.");
      return { userId, date: formattedDate, entries: [] };
    }

    // 3. Fetch modules for active courses & materials
    const modules = (await Promise.all(
      courses.map(course => moduleRepo.getAll({ course_id: course.course_id }))
    )).flat();

    const materials = (await Promise.all(
      modules.map(module => materialRepo.getAll({ module_id: module.module_id }))
    )).flat();

    // 4. Create lookup maps
    const courseMap = new Map(courses.map(c => [c.course_id, c]));
    const moduleMap = new Map(modules.map(m => [m.module_id, m]));
    const goalMap = new Map(goals.map(g => [g.course_id, g]));

    // 5. Get existing entries for today
    const existingEntries = await timetableRepo.getAll({
      user_id: userId,
      date: formattedDate
    });

    // 6. Filter out materials already scheduled
    const scheduledMaterialIds = new Set(existingEntries.map(e => e.material_id));
    const newMaterials = materials.filter(material =>
      !scheduledMaterialIds.has(material.material_id)
    );

    // 7. Schedule algorithm
    const entries = [];
    let currentTime = new Date(`${formattedDate}T09:00:00`);
    const endTime = new Date(`${formattedDate}T18:00:00`);
    const maxDuration = 180; // minutes
    let totalDuration = calculateTotalDuration(existingEntries, formattedDate);

    const scheduledCourses = new Set();

    for (const material of newMaterials) {
      if (totalDuration >= maxDuration) break;

      const module = moduleMap.get(material.module_id);
      const course = module ? courseMap.get(module.course_id) : null;

      if (course && scheduledCourses.has(course.course_id)) continue;

      const duration = material.duration || 30;
      const endTimeSlot = new Date(currentTime.getTime() + duration * 60 * 1000);

      if (endTimeSlot > endTime) {
        currentTime = new Date(`${formattedDate}T09:00:00`);
        scheduledCourses.clear(); // Reset for new loop
        continue;
      }

      const entry = createTimetableEntry({
        userId,
        formattedDate,
        currentTime,
        endTimeSlot,
        material,
        module,
        course,
        goal: course ? goalMap.get(course.course_id) : null
      });

      const createdEntry = await timetableRepo.create(entry);
      entries.push(createdEntry);
      totalDuration += duration;
      currentTime = new Date(endTimeSlot.getTime() + 15 * 60 * 1000); // 15 min break

      if (course) {
        scheduledCourses.add(course.course_id);
      }

      console.log(`➕ Scheduled: ${material.title} (Course: ${course?.course_title}) from ${entry.start_time} to ${entry.end_time}`);
    }

    return {
      userId,
      date: formattedDate,
      entries: [...existingEntries, ...entries],
      totalDuration
    };

  } catch (error) {
    console.error('❌ Timetable generation failed:', error);
    throw error;
  }
}

// Helper functions
function calculateTotalDuration(entries, date) {
  return entries.reduce((sum, e) => {
    const start = new Date(`${date}T${e.start_time}`);
    const end = new Date(`${date}T${e.end_time}`);
    return sum + (end - start) / (60 * 1000);
  }, 0);
}

function createTimetableEntry({
  userId,
  formattedDate,
  currentTime,
  endTimeSlot,
  material,
  module,
  course,
  goal
}) {
  return {
    user_id: userId,
    date: formattedDate,
    start_time: currentTime.toTimeString().slice(0, 5),
    end_time: endTimeSlot.toTimeString().slice(0, 5),
    course_id: course?.course_id,
    module_id: module?.module_id,
    material_id: material.material_id,
    deadline: material.deadline || module?.deadline || course?.deadline || goal?.deadline
  };
}

module.exports = { createTimetable };
