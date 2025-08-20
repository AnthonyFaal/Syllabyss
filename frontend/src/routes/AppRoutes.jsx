import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import GuestRoute from './GuestRoute';

import AdminPage from '../pages/AdminPage';
import AuthPage from "../pages/auth/AuthPage";
import CoursesPage from '../pages/course/CoursePage';
import ProfilePage from '../pages/profile/ProfilePage';
import InsightsPage from '../pages/InsightsPage';
import DashboardPage from '../pages/DashboardPage';
import SidebarLayout from '../layouts/SidebarLayout';
import ChallengesPage from '../pages/ChallengesPage';
import Terms from "../pages/Policies/TermsConditions";
import InterestFlow from "../pages/interest/InterestPage";
import CollaborationPage from '../pages/CollaborationPage';
import UpdatePasswordPage from '../pages/auth/UpdatePasswordPage';

const AppRoutes = () => (
  <Routes>
    {/* Root */}
    <Route path="/" element={<Navigate to="/auth" replace />} />

    {/* Public routes */}
    <Route path="/user-interest" element={<InterestFlow/>} />
    <Route path="/forgot-password" element={<UpdatePasswordPage />} />
    <Route path="/terms" element={<Terms />} />

    {/* Guest-only routes */}
    <Route path="/auth" element={<GuestRoute><AuthPage /></GuestRoute>} />

    {/* Protected routes */}
    <Route path="/app" element={<ProtectedRoute><SidebarLayout /></ProtectedRoute>}>
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={<DashboardPage />} />
      <Route path="courses" element={<CoursesPage />} />
      <Route path="challenges" element={<ChallengesPage />} />
      <Route path="insights" element={<InsightsPage />} />
      <Route path="collaboration" element={<CollaborationPage />} />
      <Route path="admin" element={<AdminPage />} />
      <Route path="profile" element={<ProfilePage />} />
      <Route path="profile/:id" element={<ProfilePage />} />
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Route>

    {/* Fallback */}
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default AppRoutes;
