import axiosInstance from './axiosInstance';

const apiRequest = async ({ method, url, data = null, params = null, headers = {} }) => {
  try {
    const response = await axiosInstance({
      method,
      url,
      data,
      params,
      headers,
    });
    return response;
  } 
  catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

export const get = (url, params = {}, headers = {}) =>
  apiRequest({ method: 'get', url, params, headers });

export const post = (url, data = {}, headers = {}) =>
  apiRequest({ method: 'post', url, data, headers });

export const put = (url, data = {}, headers = {}) =>
  apiRequest({ method: 'put', url, data, headers });

export const del = (url, data = {}, headers = {}) =>
  apiRequest({ method: 'delete', url, data, headers });

// Now export the auth API calls using these helpers

export const registerUser = (data) => post('/auth/register', data);

export const loginUser = (data) => post('/auth/login', data);

export const verifyEmail = (token) => get(`/auth/verify/${token}`);

export const updatePassword = (data) => put('/auth/update-password', data);

export const updateUserBio = (userId, data) => put(`/users/${userId}/bio`, data);

export const getUsers = () => get('/users');

export const getUserById = (userId) => get(`/users/${userId}`);

export const uploadProfileImage = (userId, file) => {
  const formData = new FormData();
  formData.append('image', file);
  return put(`/users/${userId}/profile-image`, formData, {
    'Content-Type': 'multipart/form-data',
  });
};
 
// Interest flow API calls
export const createInterestFlow = (data) => post('/interest-flow', data);

export const getInterestFlowsByUserId = (userId) => get(`/interest-flow/user/${userId}`);

export const updateInterestFlow = (interestFlowId, data) => put(`/interest-flow/${interestFlowId}`, data);


// Get all courses (public)
export const getAllCourses = () => get('/courses');

export const createCourse = (data) => post('/courses', data);

export const deleteCourse = (courseId) => del(`/courses/${courseId}`);

export const getCourseById = (courseId) => get(`/courses/${courseId}`);

export const getCoursesByUserId = (userId) =>get(`/courses/user/${userId}`) 

export const updateCourse = (courseId, data) => put(`/courses/${courseId}`, data);

// Questions
export const createQuestion = (data) => post('/questions', data);
export const getQuestionsByQuiz = (quizId) => get(`/quizzes/${quizId}/questions`);

// Question Options
export const createOption = (data) => post('/question-options', data);
export const getOptionsByQuestion = (questionId) => get(`/questions/${questionId}/options`);

// Quiz Attempts
export const createAttempt = (data) => post('/attempts', data);
export const getAttemptsByUser = (userId) => get(`/users/${userId}/attempts`);

// Answers
export const createAnswer = (data) => post('/answers', data);
export const getAnswersByAttempt = (attemptId) => get(`/attempts/${attemptId}/answers`);

export const createOrUpdateProgress = (data) => post('/progress', data);
export const getProgressByMaterial = (userId, materialId) => get(`/progress/user/${userId}/material/${materialId}`);
export const getUserProgress = (userId) => get(`/progress/user/${userId}`);
export const updateProgressStatus = (userId, materialId, data) =>
  apiRequest({
    method: 'patch',
    url: `/progress/user/${userId}/material/${materialId}/status`,
    data,
  });
export const recordProgressTime = (userId, materialId, data) =>
  apiRequest({
    method: 'patch',
    url: `/progress/user/${userId}/material/${materialId}/time`,
    data,
  });
export const getCompletedMaterials = (userId) => get(`/progress/user/${userId}/completed`);
export const getInProgressMaterials = (userId) => get(`/progress/user/${userId}/in-progress`);

// Achievements
export const createAchievement = (data) => post('/achievements', data);
export const getAllAchievements = () => get('/achievements');
export const getAchievement = (id) => get(`/achievements/${id}`);
export const updateAchievement = (id, data) => put(`/achievements/${id}`, data);
export const deleteAchievement = (id) => del(`/achievements/${id}`);

// User Achievements
export const grantAchievement = (data) => post('/user-achievements', data);
export const getUserAchievements = (userId) => get(`/users/${userId}/achievements`);
export const markUserAchievementAsSeen = (userAchievementId, data) =>
  apiRequest({
    method: 'patch',
    url: `/user-achievements/${userAchievementId}/seen`,
    data,
  });

// Leaderboard
export const getLeaderboard = () => get('/leaderboard');
export const getUserRank = (userId) => get(`/users/${userId}/rank`);

