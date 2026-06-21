/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from './lib/firebase';
import { doc, getDoc, getDocFromServer } from 'firebase/firestore';
import { MotionConfig } from 'motion/react';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RankingPage from './pages/RankingPage';
import ScholarshipPage from './pages/ScholarshipPage';
import ComplaintsPage from './pages/ComplaintsPage';
import SchoolDetailPage from './pages/SchoolDetailPage';
import DashboardPage from './pages/DashboardPage';
import AuthProvider from './contexts/AuthContext';

// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';

export default function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Test Firebase connection as required by instructions
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  return (
    <Router>
      <AuthProvider>
        <MotionConfig transition={{ type: 'tween', ease: 'easeOut', duration: 0.18 }}>
          <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-slate-800 selection:bg-emerald-100 selection:text-emerald-900">
            <Navbar />
            <main className="flex-grow">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/ranking" element={<RankingPage />} />
                <Route path="/scholarships" element={<ScholarshipPage />} />
                <Route path="/complaints" element={<ComplaintsPage />} />
                <Route path="/school-detail" element={<SchoolDetailPage />} />
                <Route path="/dashboard/*" element={<DashboardPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </MotionConfig>
      </AuthProvider>
    </Router>
  );
}
