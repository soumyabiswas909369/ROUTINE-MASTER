import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, TrendingUp, Zap, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import Card from '../components/Card';
import { routineAPI, studyAPI, focusAPI } from '../utils/api';
import './TimeAnalytics.css';

export default function TimeAnalytics() {
    const navigate = useNavigate();
    const [weekData, setWeekData] = useState([]);
    const [stats, setStats] = useState({ totalMinutes: 0, completionRate: 0, peakHour: 'N/A' });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAnalytics();
    }, []);

    const loadAnalytics = async () => {
        try {
            const [focusRes, routinesRes] = await Promise.all([
                focusAPI.getAll(),
                routineAPI.getAll(1, 1000)
            ]);

            const sessions = focusRes.data.sessions || [];
            // Handle paginated response { data: [], ... }
            const routines = routinesRes.data.data || routinesRes.data.items || (Array.isArray(routinesRes.data) ? routinesRes.data : []);

            // Build weekly data (last 7 days)
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const today = new Date();
            const weekChart = [];

            for (let i = 6; i >= 0; i--) {
                const d = new Date(today);
                d.setDate(d.getDate() - i);
                d.setHours(0, 0, 0, 0);
                const nextD = new Date(d);
                nextD.setDate(nextD.getDate() + 1);

                const dayMinutes = sessions
                    .filter(s => {
                        const sd = new Date(s.completedAt);
                        return sd >= d && sd < nextD;
                    })
                    .reduce((sum, s) => sum + s.duration, 0);

                weekChart.push({
                    day: days[d.getDay()],
                    minutes: dayMinutes,
                    hours: +(dayMinutes / 60).toFixed(1)
                });
            }

            // Total focus this week
            const totalMinutes = weekChart.reduce((sum, d) => sum + d.minutes, 0);

            // Routine completion rate
            const totalRoutines = routines.length;
            const completedRoutines = routines.filter(r => r.isCompleted || r.completed).length;
            const completionRate = totalRoutines > 0 ? Math.round((completedRoutines / totalRoutines) * 100) : 0;

            // Peak hours
            const hourCounts = {};
            sessions.forEach(s => {
                const h = new Date(s.completedAt).getHours();
                hourCounts[h] = (hourCounts[h] || 0) + 1;
            });
            let peakHour = 'N/A';
            if (Object.keys(hourCounts).length > 0) {
                const maxH = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0][0];
                const h = parseInt(maxH);
                peakHour = `${h % 12 || 12}${h < 12 ? 'AM' : 'PM'} – ${(h + 2) % 12 || 12}${(h + 2) < 12 ? 'AM' : 'PM'}`;
            }

            setWeekData(weekChart);
            setStats({ totalMinutes, completionRate, peakHour });
        } catch (err) {
            console.error('Error loading analytics:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (mins) => {
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    };

    return (
        <div className="time-analytics-page">
            <button className="back-btn" onClick={() => navigate('/')}>
                <ArrowLeft size={20} />
                <span>Back</span>
            </button>

            <h1 className="module-title text-gradient">Time Analytics</h1>
            <p className="page-subtitle">Your weekly productivity breakdown</p>

            {loading ? (
                <div className="loading-state">Loading analytics...</div>
            ) : (
                <>
                    <div className="analytics-stats-row">
                        <Card className="analytics-stat-card">
                            <Clock size={24} className="stat-icon" />
                            <div className="stat-value">{formatTime(stats.totalMinutes)}</div>
                            <div className="stat-label">Total Focus</div>
                        </Card>
                        <Card className="analytics-stat-card">
                            <TrendingUp size={24} className="stat-icon" />
                            <div className="stat-value">{stats.completionRate}%</div>
                            <div className="stat-label">Routine Done</div>
                        </Card>
                        <Card className="analytics-stat-card">
                            <Zap size={24} className="stat-icon" />
                            <div className="stat-value peak-value">{stats.peakHour}</div>
                            <div className="stat-label">Peak Hours</div>
                        </Card>
                    </div>

                    <Card className="chart-card">
                        <h2><BarChart3 size={20} /> Daily Focus Time</h2>
                        <div className="chart-container">
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={weekData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                                    <XAxis
                                        dataKey="day"
                                        tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
                                        axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
                                        axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                                        tickLine={false}
                                        unit="m"
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'rgba(15, 15, 15, 0.95)',
                                            border: '1px solid rgba(59, 130, 246,0.3)',
                                            borderRadius: '12px',
                                            color: '#f8fafc'
                                        }}
                                        formatter={(value) => [`${value} min`, 'Focus']}
                                    />
                                    <Bar dataKey="minutes" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
                                    <defs>
                                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                                            <stop offset="100%" stopColor="#2563eb" stopOpacity={0.6} />
                                        </linearGradient>
                                    </defs>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </>
            )}
        </div>
    );
}
