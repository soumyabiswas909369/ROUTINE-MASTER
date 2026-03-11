import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Reminders from './pages/Reminders';
import Routines from './pages/Routines';
import Study from './pages/Study';
import Documents from './pages/Documents';
import Expenses from './pages/Expenses';
import Attendance from './pages/Attendance';
import Dedication from './pages/Dedication';
import TimeAnalytics from './pages/TimeAnalytics';
import Goals from './pages/Goals';
import FocusMode from './pages/FocusMode';
import Habits from './pages/Habits';
import WeeklyReview from './pages/WeeklyReview';
import RoutineIntelligenceCore from './pages/RoutineIntelligenceCore';
import WorkoutTracker from './pages/WorkoutTracker';
import SinsReflection from './pages/SinsReflection';
import ParticleBackground from './components/ParticleBackground';
import './App.css';

import { useEffect, useState } from 'react';
import api from './utils/api';

import NotificationManager from './components/NotificationManager';
import Header from './components/Header';

function App() {
  const [isWakingUp, setIsWakingUp] = useState(true);

  useEffect(() => {
    // Ping the server to wake it up if it's sleeping (Render free tier)
    const wakeUpServer = async () => {
      try {
        await api.get('/health');
        console.log('Server is awake');
        setIsWakingUp(false);
      } catch (error) {
        console.log('Waking up server...', error);
        // Retry after a short delay
        setTimeout(wakeUpServer, 5000);
      }
    };
    wakeUpServer();
  }, []);

  return (
    <Router>
      <div className="app">
        <ParticleBackground />
        {isWakingUp && (
          <div className="server-wake-overlay">
            <div className="loader-content">
              <div className="spinner"></div>
              <h2>Connecting to Server</h2>
              <p>Waking up the system, please wait...</p>
            </div>
          </div>
        )}
        <NotificationManager isServerAwake={!isWakingUp} />
        <Header />
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/reminders" element={<Reminders />} />
            <Route path="/routines" element={<Routines />} />
            <Route path="/study" element={<Study />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/dedication" element={<Dedication />} />
            <Route path="/time-analytics" element={<TimeAnalytics />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/focus" element={<FocusMode />} />
            <Route path="/habits" element={<Habits />} />
            <Route path="/weekly-review" element={<WeeklyReview />} />
            <Route path="/routine-intelligence" element={<RoutineIntelligenceCore />} />
            <Route path="/workout" element={<WorkoutTracker />} />
            <Route path="/sins-reflection" element={<SinsReflection />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;

