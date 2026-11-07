import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout.jsx';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';

// Pages
import { FeedPage } from './pages/FeedPage.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { OnboardingPage } from './pages/OnboardingPage.jsx';
import { WelcomePage } from './pages/WelcomePage.jsx';
import { VisionPage } from './pages/VisionPage.jsx';
import { SubmitActionPage } from './pages/SubmitActionPage.jsx';
import { ShopPage } from './pages/ShopPage.jsx';
import { LeaderboardPage } from './pages/LeaderboardPage.jsx';
import { MapPage } from './pages/MapPage.jsx';
import { ProfilePage } from './pages/ProfilePage.jsx';
import { AdminPage } from './pages/AdminPage.jsx';
import { NotFoundPage } from './pages/NotFoundPage.jsx';

export function App() {
  return (
    <Routes>
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route path="/welcome" element={<WelcomePage />} />
      <Route path="/login" element={<LoginPage />} />

      <Route path="/" element={<Layout />}>
        <Route index element={<FeedPage />} />
        <Route path="vision" element={<VisionPage />} />
        <Route
          path="submit"
          element={
            <ProtectedRoute>
              <SubmitActionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="shop"
          element={
            <ProtectedRoute>
              <ShopPage />
            </ProtectedRoute>
          }
        />
        <Route path="leaderboard" element={<LeaderboardPage />} />
        <Route path="map" element={<MapPage />} />
        <Route
          path="profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin"
          element={
            <ProtectedRoute requireStaff={true}>
              <AdminPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
