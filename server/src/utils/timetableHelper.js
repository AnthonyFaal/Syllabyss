const { BaseRepository } = require('./index');

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

    // 1. Fetch all required data in parallel
    const [courses, goals] = await Promise.all([
      courseRepo.getAll({ user_id: userId, status: "in_progress" }),
      goalRepo.getAll({ user_id: userId })
    ]);

    if (courses.length === 0) {
      console.log("No in-progress courses found for user");
      return { userId, date: formattedDate, entries: [] };
    }

    // 2. Fetch modules and materials in optimized way
    const modules = (await Promise.all(
      courses.map(course => moduleRepo.getAll({ course_id: course.course_id }))
    )).flat();

    const materials = (await Promise.all(
      modules.map(module => materialRepo.getAll({ module_id: module.module_id }))
    )).flat();

    // 3. Create lookup maps for faster access
    const courseMap = new Map(courses.map(c => [c.course_id, c]));
    const moduleMap = new Map(modules.map(m => [m.module_id, m]));
    const goalMap = new Map(goals.map(g => [g.course_id, g]));

    // 4. Process completed modules
    const completedModuleIds = modules
      .filter(module => module.is_complete)
      .map(m => m.module_id);

    if (completedModuleIds.length > 0) {
      await timetableRepo.deleteWhere({
        user_id: userId,
        module_id: { $in: completedModuleIds }
      });
      console.log(`🗑️ Deleted entries for ${completedModuleIds.length} completed modules`);
    }

    // 5. Get and process existing entries
    const existingEntries = await timetableRepo.getAll({ 
      user_id: userId,
      date: formattedDate 
    });

    const scheduledMaterialIds = new Set(existingEntries.map(e => e.material_id));
    const seenMaterials = new Set();

    // 6. Filter and prepare new materials
    const newMaterials = materials.filter(material => {
      if (scheduledMaterialIds.has(material.material_id)) return false;
      if (seenMaterials.has(material.material_id)) return false;
      seenMaterials.add(material.material_id);
      return true;
    });

    // 7. Schedule new materials
    const entries = [];
    let currentTime = new Date(`${formattedDate}T09:00:00`);
    const endTime = new Date(`${formattedDate}T18:00:00`);
    const maxDuration = 180;
    let totalDuration = calculateTotalDuration(existingEntries, formattedDate);

    for (const material of newMaterials) {
      if (totalDuration >= maxDuration || currentTime >= endTime) break;

      const module = moduleMap.get(material.module_id);
      const course = module ? courseMap.get(module.course_id) : null;
      const goal = course ? goalMap.get(course.course_id) : null;

      const duration = material.duration || 30;
      const endTimeSlot = new Date(currentTime.getTime() + duration * 60 * 1000);

      if (endTimeSlot > endTime) {
        currentTime = new Date(`${formattedDate}T09:00:00`);
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
        goal
      });

      const createdEntry = await timetableRepo.create(entry);
      entries.push(createdEntry);
      totalDuration += duration;
      currentTime = new Date(endTimeSlot.getTime() + 15 * 60 * 1000);
      
      console.log(`➕ Scheduled: ${material.title} from ${entry.start_time} to ${entry.end_time}`);
    }

    console.log(`✅ Successfully generated timetable with ${entries.length} new entries`);
    return {
      userId,
      date: formattedDate,
      entries: [...existingEntries, ...entries],
      totalDuration
    };

  } catch (error) {
    console.error('❌ Timetable generation failed:', error.message);
    throw new Error(`Timetable generation failed: ${error.message}`);
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