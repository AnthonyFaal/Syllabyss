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



// ==============================================
// // Dashboard
// ==============================================
export const overview = async (userId) => {const response = await get(`/dashboard/${userId}/overview`);return response.data;};
export const getAdminOverview = async () => {const response = await get(`/admin/overview`);return response.data;};
export const timetable = async (userId) => {const response = await get(`/dashboard/${userId}/timetable`);return response.data;};


// ==============================================
// // Auth
// ==============================================
export const registerUser = (data) => post('/auth/register', data);
export const loginUser = (data) => post('/auth/login', data);
export const verifyEmail = (token) => get(`/auth/verify/${token}`);
export const updatePassword = (data) => put('/auth/update-password', data);
export const forgotPassword = (data) => put('auth/forgot-password', data);
export const updateUserBio = (userId, data) => put(`/users/${userId}/bio`, data);
export const getUsers = () => get('/users');
export const getUserById = (userId) => get(`/users/${userId}`);
export const uploadProfileImage = (userId, file) => {const formData = new FormData();formData.append('image', file);return put(`/users/${userId}/profile-image`, formData, {'Content-Type': 'multipart/form-data',});};
 
// ==============================================
// User API endpoint (Get authenticated user)
// ==============================================
export const getMe = () => get('/me').then(res => res.data);


// ==============================================
// // Interest flow API calls
// ==============================================
 
export const createInterestFlow = (data) => post('/interest-flow', data);
export const getInterestFlowsByUserId = () => get(`/interest-flow/user`);
export const updateInterestFlow = (interestFlowId, data) => put(`/interest-flow/${interestFlowId}`, data);
export const getInterstStats = ()=> get('/interest-flow')

// ==============================================
// // Course
// ==============================================

export const getAllCourses = () => get('/courses');
export const createCourse = (data) => post('/courses', data);
export const deleteCourse = (courseId) => del(`/courses/${courseId}`);
export const getCourseById = (courseId) => get(`/courses/${courseId}`);
export const getCourseModules = (courseId) => get(`/courses/${courseId}/modules`);
export const getCoursesByUserId = (userId) =>get(`/courses/user/${userId}`) 
export const updateModule = (moduleId, data) => patch(`/courses/${moduleId}/update`, data);
export const updateCourseStatus = (courseId, data) => patch(`/courses/${courseId}/status`, data);


// ==============================================
// // Quiz
// ==============================================
export const submitQuizAnswers = (quiz_id, answers) =>  post(`/quizzes/${quiz_id}/answer`, { answers });
export const getQuizAttemptStatus = (quiz_id) =>  get(`/quizzes/${quiz_id}/attempt-status`);


// ==============================================
// // Materials
// ==============================================

export const createOrUpdateProgress = (data) => post('/progress', data);
export const getProgressByMaterial = (userId, materialId) => get(`/progress/user/${userId}/material/${materialId}`);
export const getUserProgress = (userId) => get(`/progress/user/${userId}`);
export const updateProgressStatus = (userId, materialId, data) =>apiRequest({ method: 'patch',url: `/progress/user/${userId}/material/${materialId}/status`,data,});
export const recordProgressTime = (userId, materialId, data) =>apiRequest({method: 'patch',url: `/progress/user/${userId}/material/${materialId}/time`,data,});
export const getCompletedMaterials = (userId) => get(`/progress/user/${userId}/completed`);
export const getInProgressMaterials = (userId) => get(`/progress/user/${userId}/in-progress`);


// ==============================================
// // Goals
// ==============================================
export const createGoal = (data) => post('/goals', data);
export const deleteGoal = (id) => del(`/goals/${id}`);
export const updateGoal = (id, data) => put(`/goals/${id}`, data);
export const getAllGoals = () => get('/goals');
export const getGoal = (id) => get(`/goals/${id}`);

export const grantGoal = (data) => post('/goals/user', data);
export const getUserGoals = () => get('/goals/users'); // ✅ backend gets user from token

export const markUserGoalAsSeen = (userGoalId) =>
  apiRequest({
    method: 'patch',
    url: `/goals/user/${userGoalId}/seen`, // ✅ fixed
  });

export const trackGoalProgress = (event_type, metadata = {}) =>
  post('/goals/track-progress', {
    event_type,
    metadata,
  });

// ==============================================
// Chat API endpoints
// ==============================================

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
export const joinChat = (chatId) => post(`/chats/${chatId}/members`);
export const addMember = (chatId, memberData) => post(`/chats/${chatId}/members`, memberData);
export const removeMember = (chatId, userId) => del(`/chats/${chatId}/members/${userId}`);
export const getMembers = (chatId) => get(`/chats/${chatId}/members`);
// Typing indicators
export const setTyping = (chatId) => post(`/chats/${chatId}/typing`);
export const getTypingUsers = (chatId) => get(`/chats/${chatId}/typing`);


// ==============================================
// Event API endpoints
// ==============================================
export const createEvent = (chatId, eventData) => post(`/chats/${chatId}/events`, eventData);
export const getChatEvents = (chatId, status) => get(`/chats/${chatId}/events`, { params: { status } });
export const getEventDetails = (eventId) => get(`/events/${eventId}`);
export const updateEvent = (eventId, updateData) => put(`/events/${eventId}`, updateData);
export const deleteEvent = (eventId) => del(`/events/${eventId}`);
// Event participation
export const registerForEvent = (eventId) => post(`/events/${eventId}/participants`);
export const getEventParticipants = (eventId, status) => get(`/events/${eventId}/participants`, { params: { status } });
export const updateParticipantStatus = (eventId, participantId, status) => (
  put(`/events/${eventId}/participants/${participantId}`, { status })
);
// Event messaging
export const postEventMessage = (eventId, messageData) => post(`/events/${eventId}/messages`, messageData);
export const getEventMessages = (eventId) => get(`/events/${eventId}/messages`);


// ==============================================
// // Recommendations
// ==============================================
export const getRecommendations = (userId) => get(`/recommendations/${userId}`);
export const acceptRecommendation = (recommendationId) => patch(`/recommendations/${recommendationId}/accept`);


// ==============================================
// // Leaderboard APIs
// ==============================================
export const getLeaderboard = () => get(`/leaderboard`);
export const getUserRank = (userId) => get(`/leaderboard/users/${userId}/rank`);
export const updateUserXP = (userId, xpData) => patch(`/leaderboard/users/${userId}/xp`, xpData);


// ==============================================
// // Insights APIs
// ==============================================
export const getUserKPIs = () => get(`/insights/kpis`);
export const getUserQuizTrends = () => get(`/insights/quiz-trends`);
export const getUserGoalProgress = () => get(`/insights/goals/progress`);
export const getUserRecentActivity = () => get(`/insights/activity`);
export const getUserXPBreakdown = () => get(`/insights/xp-breakdown`);
export const getUserActivityLog = () => get(`/insights/user/activity-log`).then(res => res.data);
export const getBestPerformingCourse = () => get(`/insights/user/best-course`).then(res => res.data);


// ==============================================
// dialogue API endpoints
// ==============================================

export const askTutor = (message) => post('/assistant/ask', { message });

// ==============================================
// Feedback API endpoints
// ==============================================
export const createFeedback = (data) => post('/feedback', data);
export const getAllFeedback = () => get('/feedback');
export const getFeedbackById = (id) => get(`/feedback/${id}`);
export const getFeedbackByCourse = (courseId) => get(`/feedback/by-course/${courseId}`);
export const getFeedbackByUser = () => get('/feedback/user');
export const updateFeedback = (id, data) => put(`/feedback/${id}`, data);
export const deleteFeedback = (id) => del(`/feedback/${id}`);


export  const defaultAvatar = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAOEAAADhCAMAAAAJbSJIAAAALVBMVEXQ0NCxsbG0tLTPz8/Hx8e3t7fAwMDMzMy9vb21tbW6urrBwcGurq7FxcXT09M4BFhyAAAE60lEQVR4nO2dW5OjIBCFVUSNEv7/z92YzQVjVIRmOKTO97IPUzXl2Ya+QNNTVYQQQgghhBBCCCGEEEIIIYQQQgghhBCSBDuT+yNSYfvrMF60voxD16rfk9kOTW3qN2Of+4tE6Qfjqrtj6jb3Z4nR6k91Lzv+wlq1alyZ781UvkQ17Oi7LVWd+wMjsdc9eXcuRXuc3QX6kqhyf2Ywtj+Wd6dUiXZ/BzroMiV6rdAHo6rK86l9461vptFDW5RK2/ob0DFlQW71GiJwjo6lJHJTmMBZYxF2tOECZ1r47RgpsDZDbgVHRAqcJUJb0U6R+tAl2i7WgneJ19w6toleog9QPWpYoP9Gk1vKBq2Qvts67XJr+YpvteQlEbLeEBRY14hG3DpRC+OSW84a74LXD8CIcR1FFdaAYd/2ohoBl2l1urLfBzPqWzl3A7gR7whKRIwXM3JhH7VOtIOUwjG3lC3EjAir0Er5U1iFlVRURN2HtyqYCj2ZcgvZREihwcxpZqRs+PMKgW/4j+/uvUBN2m50MgpxF6lQPARepDIKDfJNokjq3eCdYbyR2IfQJhSJFrhZ94xEtIA88X4TfXCKvUZvBWKsMzVXZDdTqU7HlsAdtMDqEn+4rzvgfKbqZW4vgDei0C0wcHEodc+Ne4QhpVDjehsZgcgKhc4SgRUGNl5+AlzhyxzqI+dtMtdrqB1DdyRKC9Tb0QcCCrGrp+jSoobsw1gQrxA3Z/tPdAsmcDB8ECsR3YTV/Gp0/SrWE2Ma4FjoEhj5p74AAz4IO8vADoQLwhoWkLO1FWFhsZw1GlgLN9DJzCchCnEPL74QVGSUtA2DDhbxk5klp30N8Bnid9RZheglxZqT7hSzs3uXk48tS1ujM6eq4bL86JMTHcNlCpyfXP64QO+4X54bfeIbMZBboPbx9qZFpdwu3p4GtyP4AO83e0VVFQt8K4zCwr1V7yklXvqeFxW2A75Wc5hHmL1vjzys+Jqi0Jcxiq+de2rMq+/neM6CeTXqzfmB0eCj+Npnz9BrZ9m22df4+s9QT8W4Gq1ycm0nxO3lbs1rIo2TAA2gGvtFcFhc5G5pbJx8zV3OZsDbj7b/DO+LVEy1w+diNbU7GMp+NDmgTY2yrV5vtuXxp1X9NOra/KcZh9ZdinY9VcM0Hc5i3XImX6c+9e06vm95XAhDWrVaf8528kypN0OKye51bHuQXXsY4Sie6GvGycqbI3TfXA4GlNneI+3JZEjV1T61gzHdzlrtv7iob78kw91wf2K8Za2nfj360Vbt5N82bS5/q/FgQvAXmrG7OVH74OZRp20PtaFR/+FEvoi3P3oc7xsvqJmh+aNCUuiNYQjmL847lJ9vSCUx/VReuaFlgaQ+ehR6UhFF0s0oNlcvhpRWPH3tmYSU4zFlp7IFk661SGR6pwTJOm9yC3uTKCxmjPSfJDJiblkuSdoYgUyYpnVDSY7UiyZFf1H2dG1JgkscsVFsMsh3wWEt0hTLFCHldpHPa4SGB8khvhGFh8zGMwpvRJtb0BpZgXDbsBYvhOG2obhCqUlzckg7UzhHI518i80lFUQ2XGAc0CyRVSj5lw+kkM1MIU4RP6DCc0DV9w+o8BSC4+TlED2q+X2FlW7wEL5JVM4/u7/53A9VxA9hWsIIIYQQQgghhBBCCCGEEEIIIYQQQgghOPwDhx9CCdDcDFsAAAAASUVORK5CYII=';
