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

export const patch = (url, data = {}, headers = {}) =>
  apiRequest({ method: 'patch', url, data, headers });

export const del = (url, data = {}, headers = {}) =>
  apiRequest({ method: 'delete', url, data, headers });


export const overview = async (userId) => {
  const response = await get(`/dashboard/${userId}/overview`);
  return response.data; // Make sure to return the data property
};

export const getAdminOverview = async () => {
  const response = await get(`/admin/overview`);
  return response.data; // Make sure to return the data property
};
export const timetable = async (userId) => {
  const response = await get(`/dashboard/${userId}/timetable`);
  return response.data; // Make sure to return the data property
};

export const registerUser = (data) => post('/auth/register', data);

export const loginUser = (data) => post('/auth/login', data);

export const verifyEmail = (token) => get(`/auth/verify/${token}`);

export const updatePassword = (data) => put('/auth/update-password', data);

export const forgotPassword = (data) => put('auth/forgot-password', data);

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
export const getCourseModules = (courseId) => get(`/courses/${courseId}/modules`);
export const getCoursesByUserId = (userId) =>get(`/courses/user/${userId}`) 
export const updateModule = (moduleId, data) => patch(`/courses/${moduleId}/update`, data);
export const updateCourseStatus = (courseId, data) => patch(`/courses/${courseId}/status`, data);


export const submitQuizAnswers = (quiz_id, answers) =>  post(`/quizzes/${quiz_id}/answer`, { answers });
export const getQuizAttemptStatus = (quiz_id) =>  get(`/quizzes/${quiz_id}/attempt-status`);

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

// Goals
export const createGoal = (data) => post('/goals', data);
export const deleteGoal = (id) => del(`/goals/${id}`);
export const updateGoal = (id, data) => put(`/goals/${id}`, data);
export const getAllGoals = () => get('/goals');
export const getGoal = (id) => get(`/goals/${id}`);

// User Goals
export const grantGoal = (data) => post('/user-goals', data);
export const getUserGoals = (userId) => get(`/users/${userId}/goals`);
export const markUserGoalAsSeen = (userGoalId, data) =>
  apiRequest({
    method: 'patch',
    url: `/user-goals/${userGoalId}/seen`,
    data,
  });


// Chat API endpoints
export const getPublicChats = () => get('/chats/public-chats');
export const createChat = (chatData) => post('/chats', chatData);
export const getUserChats = (userId) => get(`/chats/user/${userId}`);
export const getChat = (chatId) => get(`/chats/${chatId}`);
export const updateChat = (chatId, updateData) => put(`/chats/${chatId}`, updateData);
export const deleteChat = (chatId) => del(`/chats/${chatId}`);

// Message endpoints
export const sendMessage = (chatId, messageData) => post(`/chats/${chatId}/messages`, messageData);
export const getMessages = (chatId) => get(`/chats/${chatId}/messages`);

// Member endpoints

export const joinChat = (chatId, userId) => post(`/chats/${chatId}/members`, {userId});
export const addMember = (chatId, memberData) => post(`/chats/${chatId}/members`, memberData);
export const removeMember = (chatId, userId) => del(`/chats/${chatId}/members/${userId}`);
export const getMembers = (chatId) => get(`/chats/${chatId}/members`);

// Typing indicators
export const setTyping = (chatId) => post(`/chats/${chatId}/typing`);
export const getTypingUsers = (chatId) => get(`/chats/${chatId}/typing`);

// Recommendations
export const getRecommendations = (userId) => get(`/recommendations/${userId}`);
export const acceptRecommendation = (recommendationId) => patch(`/recommendations/${recommendationId}/accept`);


// Leaderboard APIs
export const getLeaderboard = () => get(`/leaderboard`);
export const getUserRank = (userId) => get(`/leaderboard/users/${userId}/rank`);
export const updateUserXP = (userId, xpData) => patch(`/leaderboard/users/${userId}/xp`, xpData);

// Insights APIs
export const getUserKPIs = (userId) => get(`/insights/kpis/${userId}`);
export const getUserQuizTrends = (userId) => get(`/insights/quiz-trends/${userId}`);
export const getUserGoalProgress = (userId) => get(`/insights/goals/progress/${userId}`);
export const getUserRecentActivity = (userId) => get(`/insights/activity/${userId}`);
export const getUserXPBreakdown = (userId) => get(`/insights/xp-breakdown/${userId}`);