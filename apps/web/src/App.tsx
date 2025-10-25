import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';

// Pages
import LandingPage from '@/pages/LandingPage';
import AuthPage from '@/pages/AuthPage';
import DashboardPage from '@/pages/DashboardPage';
import MarketplacePage from '@/pages/MarketplacePage';
import ParcelDetailPage from '@/pages/ParcelDetailPage';
import P2PLoansPage from '@/pages/P2PLoansPage';
import CreateLoanPage from '@/pages/CreateLoanPage';
import LoanDetailsPage from '@/pages/LoanDetailsPage';
import ExpressLoansPage from '@/pages/ExpressLoansPage';
import VerificationPage from '@/pages/VerificationPage';
import ChatPage from '@/pages/ChatPage';
import MintParcelPage from '@/pages/MintParcelPage';
import MyParcelsPage from '@/pages/MyParcelsPage';
import CommunityVotingPage from './pages/votingpage';
import AdminPage from '@/pages/AdminPage';
import SettingsPage from '@/pages/SettingsPage';
import ActivityPage from '@/pages/ActivityPage';
import EmailVerificationPage from '@/pages/EmailVerificationPage';
import ResendVerificationPage from '@/pages/ResendVerificationPage';

// Components
import LoadingSpinner from '@/components/LoadingSpinner';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout/Layout';

// Hooks
import { useAuthStore } from '@/store/authStore';

function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <Layout>
      <Suspense fallback={<LoadingSpinner />}>
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />
            
            {/* Email Verification Routes */}
            <Route path="/auth/verify-email" element={<EmailVerificationPage />} />
            <Route path="/auth/verify-email-pending" element={<EmailVerificationPage />} />
            <Route path="/auth/resend-verification" element={<ResendVerificationPage />} />
            <Route path="/auth/forgot-password" element={<AuthPage />} />
            <Route path="/auth/reset-password" element={<AuthPage />} />
            
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            } />
            <Route path="/marketplace" element={
              <ProtectedRoute>
                <MarketplacePage />
              </ProtectedRoute>
            } />
            <Route path="/parcels/:id" element={
              <ProtectedRoute>
                <ParcelDetailPage />
              </ProtectedRoute>
            } />
            <Route path="/loans" element={
              <ProtectedRoute>
                <P2PLoansPage />
              </ProtectedRoute>
            } />
            <Route path="/p2p-loans" element={
              <ProtectedRoute>
                <P2PLoansPage />
              </ProtectedRoute>
            } />
            <Route path="/p2p-loans/create" element={
              <ProtectedRoute>
                <CreateLoanPage />
              </ProtectedRoute>
            } />
            <Route path="/p2p-loans/:id" element={
              <ProtectedRoute>
                <LoanDetailsPage />
              </ProtectedRoute>
            } />
            <Route path="/express-loans" element={
              <ProtectedRoute>
                <ExpressLoansPage />
              </ProtectedRoute>
            } />
            <Route path="/verification" element={
              <ProtectedRoute>
                <VerificationPage />
              </ProtectedRoute>
            } />
            <Route path="/votingpage" element={
              <ProtectedRoute>
                <CommunityVotingPage />
              </ProtectedRoute>
            } />
            <Route path="/chat/:contextId" element={
              <ProtectedRoute>
                <ChatPage />
              </ProtectedRoute>
            } />
            <Route path="/mint" element={
              <ProtectedRoute>
                <MintParcelPage />
              </ProtectedRoute>
            } />
            <Route path="/my-parcels" element={
              <ProtectedRoute>
                <MyParcelsPage />
              </ProtectedRoute>
            } />
            <Route path="/activity" element={
              <ProtectedRoute>
                <ActivityPage />
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute requiredRole="ADMIN">
                <AdminPage />
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </Suspense>
      
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'rgba(30, 41, 59, 0.95)',
            color: '#fff',
            border: '1px solid rgba(0, 209, 122, 0.3)',
            borderRadius: '12px',
            backdropFilter: 'blur(12px)',
          },
        }}
      />
    </Layout>
  );
}

export default App;