import { Routes, Route, Navigate } from 'react-router-dom';

/*----------------------------------------------------------*/
import ProtectedRoute from './ProtectedRoute';

/*----------------------------------------------------------*/
import AdminPage from '../pages/AdminPage';
import AuthPage from "../pages/auth/AuthPage";
import CoursesPage from '../pages/course/CoursePage';
import ProfilePage from '../pages/profile/ProfilePage';
import InsightsPage from '../pages/InsightsPage';
import DashboardPage from '../pages/DashboardPage';
import SidebarLayout from '../layouts/SidebarLayout';
import ChallengesPage from '../pages/ChallengesPage';
import Terms from "../pages/Policies/TermsConditions";
import UserInterest from "../pages/interest/InterestPage"
import CollaborationPage from '../pages/CollaborationPage';


const AppRoutes = () => (
  <Routes>
    {/* Redirect root to auth */}
    <Route path="/" element={<Navigate to="/auth" replace />} />

    {/* Public / Standalone routes */}
    <Route path="/user-interest"  element = {<UserInterest/>}/>
    <Route path="/auth" element={<AuthPage />} />
    <Route path="/terms" element={<Terms />} />
     <Route path="/app" element={<ProtectedRoute><SidebarLayout /></ProtectedRoute>}>
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={<DashboardPage />} />
      <Route path="courses" element={<CoursesPage />} />
      <Route path="challenges" element={<ChallengesPage />} />
      <Route path="insights" element={<InsightsPage />} />
      <Route path="collaboration" element={<CollaborationPage />} />
      <Route path="admin" element={<AdminPage />} />
      <Route path="profile" element={<ProfilePage />} />
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Route>

    {/* Catch-all route for undefined root paths */}
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default AppRoutes;