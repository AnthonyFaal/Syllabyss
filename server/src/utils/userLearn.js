const {BaseRepository} = require('./index');

const interestRepo = new BaseRepository('user_interest_flows', 'interest_flow_id');
const skillRepo = new BaseRepository('user_skills', 'skill_id');
const courseRepo = new BaseRepository('courses', 'course_id');
const progressRepo = new BaseRepository('user_progress', 'progress_id');
const materialRepo = new BaseRepository('learning_materials', 'material_id');

async function getUserLearningProfile(user_id) {
  const profile = {
    interestField: null,
    specialization: null,
    experience: null,
    skills: [],
    learningStyle: null,
    pastCourses: [],
    goals: [] // Assuming you’ll later add this
  };

  // 1️⃣ Interest + Specialization + Experience
  const interestFlow = (await interestRepo.getWhere({ user_id })).pop();
  if (interestFlow) {
    profile.interestField = interestFlow.selected_field;
    profile.specialization = interestFlow.selected_specialization;
    profile.experience = interestFlow.selected_experience;

    // 2️⃣ Skills
    const skills = await skillRepo.getWhere({ interest_flow_id: interestFlow.interest_flow_id });
    profile.skills = skills.map(s => s.skill);
  }

  // 3️⃣ Past Courses
  const courses = await courseRepo.getWhere({ user_id });
  profile.pastCourses = courses.map(c => c.title);

  // 4️⃣ Learning Style (infer from recent materials)
  const { rows: recentProgress } = await progressRepo.rawQuery(`
    SELECT lm.content_type
    FROM user_progress up
    JOIN learning_materials lm ON up.material_id = lm.material_id
    WHERE up.user_id = $1
    ORDER BY up.last_accessed DESC NULLS LAST
    LIMIT 5
  `, [user_id]);

  if (recentProgress.length) {
    // Count occurrences of content_type
    const typeCounts = {};
    recentProgress.forEach(row => {
      typeCounts[row.content_type] = (typeCounts[row.content_type] || 0) + 1;
    });

    // Choose most frequent
    const sortedTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
    const topType = sortedTypes[0][0];

    // Map content_type to inferred style
    const typeToStyle = {
      video: 'visual',
      infographic: 'visual',
      article: 'read/write',
      audio: 'auditory',
      interactive: 'kinesthetic',
      quiz: 'mixed'
    };

    profile.learningStyle = typeToStyle[topType] || 'unknown';
  } else {
    profile.learningStyle = 'unknown';
  }

  // 5️⃣ Goals (optional - if you want)
  const goalRepo = new BaseRepository('user_goals', 'user_goal_id');
  const userGoals = await goalRepo.getWhere({ user_id });
  profile.goals = userGoals.map(g => `Goal ${g.goal_id}: ${g.status}`);

  return profile;
}

module.exports = getUserLearningProfile;
