import { Routes, Route, Navigate } from 'react-router-dom';

/*----------------------------------------------------------*/
import ProtectedRoute from './ProtectedRoute';

/*----------------------------------------------------------*/
import AdminPage from '../pages/AdminPage';
import AuthPage from "../pages/auth/AuthPage";
import CoursesPage from '../pages/CoursesPage';
import ProfilePage from '../pages/profile/ProfilePage';
import InsightsPage from '../pages/InsightsPage';
import DashboardPage from '../pages/DashboardPage';
import SidebarLayout from '../layouts/SidebarLayout';
import ChallengesPage from '../pages/ChallengesPage';
import Terms from "../pages/Policies/TermsConditions";
import UserInterest from "../pages/interest/InterestPage"
import ContentStudioPage from '../pages/ContentStudioPage';
import CollaborationPage from '../pages/CollaborationPage';


const AppRoutes = () => (
  <Routes>
    {/* Redirect root to auth */}
    <Route path="/" element={<Navigate to="/auth" replace />} />

    {/* Public / Standalone routes */}
    <Route path="/user-interest"  element = {<UserInterest/>}/>
    <Route path="/auth" element={<AuthPage />} />
    <Route path="/terms" element={<Terms />} />

    {/* Protected App Routes under sidebar layout */}
     <Route path="/app" element={<ProtectedRoute><SidebarLayout /></ProtectedRoute>}>
      {/* Default app route redirects to dashboard */}
      <Route index element={<Navigate to="dashboard" replace />} />
      
      {/* Main content routes */}
      <Route path="dashboard" element={<DashboardPage />} />
      <Route path="courses" element={<CoursesPage />} />
      <Route path="challenges" element={<ChallengesPage />} />
      <Route path="content" element={<ContentStudioPage />} />
      <Route path="insights" element={<InsightsPage />} />
      <Route path="collaboration" element={<CollaborationPage />} />
      <Route path="admin" element={<AdminPage />} />
      
      {/* User profile routes */}
      <Route path="profile" element={<ProfilePage />} />

      {/* Catch-all route for undefined paths */}
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Route>

    {/* Catch-all route for undefined root paths */}
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default AppRoutes;