const { BaseRepository, generateDeadline } = require('./index');
const courseRepository = new BaseRepository('courses');

// Mock AI or rules-based suggestion logic
function generateCourseTitleAndDescription(field, specialization, experience) {
  const title = `${experience[0].toUpperCase() + experience.slice(1)} ${specialization} with ${field}`;
  const description = `This course is designed for ${experience} learners who want to master ${specialization} in the context of ${field}. You'll build real-world projects and gain practical experience.`;
  return { title, description };
}

async function generateCourseFromInterest(userId, interestData) {
  try {
    const {
      selected_field: selectedField,
      selected_specialization: selectedSpecialization,
      selected_experience: selectedExperience,
    } = interestData;

    // Check for existing course for same field/specialization/experience
    const existing = await courseRepository.findOne({
      user_id: userId,
      difficulty_level: selectedExperience,
      title: `${selectedExperience[0].toUpperCase() + selectedExperience.slice(1)} ${selectedSpecialization} with ${selectedField}`,
    });

    if (existing) {
      console.log('Course already exists for this interest. Skipping...');
      return null;
    }

    const { title, description } = generateCourseTitleAndDescription(
      selectedField,
      selectedSpecialization,
      selectedExperience
    );

    const newCourse = {
      title,
      description,
      thumbnail_url: null, // optional default
      difficulty_level: selectedExperience,
      estimated_duration: 120, // minutes, could be dynamic
      user_id: userId,
      deadline: generateDeadline({
        durationType: 'course',
        durationValue: 2,
        durationUnit: 'days',
        strategy: 'custom'
      }),
    };

    const course = await courseRepository.create(newCourse);
    console.log(`Course created: ${course.title}`);
    return course;
  } catch (err) {
    console.error('Failed to generate course:', err.message);
    throw new Error('Course generation failed');
  }
}

module.exports = {
  generateCourseFromInterest,
};
