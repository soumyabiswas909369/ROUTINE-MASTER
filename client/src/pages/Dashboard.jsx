import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Calendar, BookOpen, FileText, DollarSign, TrendingUp, TrendingDown, Heart, CheckSquare, BarChart3, Target, Timer, Flame, ClipboardList, Dumbbell, Skull } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import GravityContainer from '../components/GravityContainer';
import Card from '../components/Card';
import RoutineIntelligenceCard from '../components/RoutineIntelligenceCard';
import { reminderAPI, routineAPI, expenseAPI, goalAPI, focusAPI, habitAPI, weeklyReviewAPI } from '../utils/api';
import './Dashboard.css';

export default function Dashboard() {
    const [stats, setStats] = useState({
        reminders: 0,
        routines: 0,
        totalIncome: 0,
        totalExpense: 0,
        balance: 0
    });
    const [dailyData, setDailyData] = useState([]);
    const [habitTrendData, setHabitTrendData] = useState([]);
    const [moduleBadges, setModuleBadges] = useState({
        goals: { text: 'New', loading: true },
        focus: { text: 'Start', loading: true },
        habits: { text: 'New', loading: true },
        review: { text: 'New', loading: true },
        analytics: { text: 'This Week', loading: false },
        workout: { text: 'Track', loading: false },
        sins: { text: 'Reflect', loading: false }
    });

    useEffect(() => {
        loadStats();
        loadModuleBadges();
    }, []);

    const loadStats = async () => {
        try {
            const [remindersRes, routinesRes, expensesStatsRes, habitTrendRes] = await Promise.all([
                reminderAPI.getAll(1, 1, { isActive: true }),
                routineAPI.getAll(1, 1),
                expenseAPI.getDashboardStats(),
                habitAPI.getDailyTrend().catch(() => ({ data: { trend: [] } }))
            ]);

            const statsData = expensesStatsRes.data;
            const recentStats = statsData.recent || { totalStats: [], dailyTrend: [] };
            const globalStats = statsData.global || { totalIncome: 0, totalExpense: 0 };
            const totalStats = recentStats.totalStats[0] || { totalIncome: 0, totalExpense: 0 };
            const balance = globalStats.totalIncome - globalStats.totalExpense;

            let runningBalance = balance;
            const mappedData = recentStats.dailyTrend.map(day => ({
                id: day._id,
                income: day.income,
                expense: day.expense,
                net: day.income - day.expense
            }));

            const totalRecentChange = mappedData.reduce((acc, curr) => acc + curr.net, 0);
            let currentTrendBalance = balance - totalRecentChange;

            const trendData = mappedData.map(day => {
                currentTrendBalance += day.net;
                return {
                    date: new Date(day.id).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    income: day.income,
                    expense: day.expense,
                    balanceTrend: currentTrendBalance
                };
            });

            if (trendData.length === 1) {
                trendData.unshift({
                    ...trendData[0],
                    date: 'Start'
                });
            }

            setStats({
                reminders: remindersRes.data.totalItems || 0,
                routines: routinesRes.data.totalItems || 0,
                totalIncome: totalStats.totalIncome,
                totalExpense: totalStats.totalExpense,
                balance: balance,
                comparison: statsData.monthComparison || { currentBalance: 0, lastBalance: 0, hasLastMonthData: false }
            });
            setDailyData(trendData);
            let hTrend = (habitTrendRes.data.trend || []).slice(-14);
            if (hTrend.length === 1) {
                hTrend.unshift({
                    ...hTrend[0],
                    date: 'Start'
                });
            }
            setHabitTrendData(hTrend);
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    };

    const loadModuleBadges = async () => {
        // Load all badge stats in parallel, gracefully handle failures
        const results = await Promise.allSettled([
            goalAPI.getStats(),
            focusAPI.getStats(),
            habitAPI.getStats(),
            weeklyReviewAPI.getStats()
        ]);

        setModuleBadges({
            goals: {
                text: results[0].status === 'fulfilled'
                    ? (results[0].value.data.active > 0 ? `${results[0].value.data.active} Active` : 'New')
                    : 'New',
                loading: false
            },
            focus: {
                text: results[1].status === 'fulfilled'
                    ? (results[1].value.data.weeklyMinutes > 0 ? `${Math.round(results[1].value.data.weeklyMinutes / 60)}h ${results[1].value.data.weeklyMinutes % 60}m` : 'Start')
                    : 'Start',
                loading: false
            },
            habits: {
                text: results[2].status === 'fulfilled'
                    ? (results[2].value.data.maxStreak > 0 ? `${results[2].value.data.maxStreak} Day Streak` : (results[2].value.data.total > 0 ? `${results[2].value.data.completedToday}/${results[2].value.data.total} Today` : 'New'))
                    : 'New',
                loading: false
            },
            review: {
                text: results[3].status === 'fulfilled'
                    ? (results[3].value.data.hasCurrentWeek ? 'In Progress' : 'New')
                    : 'New',
                loading: false
            },
            analytics: { text: 'This Week', loading: false }
        });
    };

    const moduleCards = [
        { path: '/time-analytics', icon: BarChart3, title: 'Time Analytics', badgeKey: 'analytics', color: 'blue' },
        { path: '/goals', icon: Target, title: 'Goal Tracker', badgeKey: 'goals', color: 'purple' },
        { path: '/focus', icon: Timer, title: 'Focus Mode', badgeKey: 'focus', color: 'orange' },
        { path: '/habits', icon: Flame, title: 'Habit Streaks', badgeKey: 'habits', color: 'blue' },
        { path: '/weekly-review', icon: ClipboardList, title: 'Weekly Review', badgeKey: 'review', color: 'cyan' },
        { path: '/workout', icon: Dumbbell, title: 'Workout Tracker', badgeKey: 'workout', color: 'blue' },
        { path: '/sins-reflection', icon: Skull, title: 'Sins Reflection', badgeKey: 'sins', color: 'red' }
    ];

    const renderComparison = () => {
        const { currentBalance, lastBalance, hasLastMonthData } = stats.comparison || {};

        if (!hasLastMonthData) {
            return { text: "No data for last month", color: 'rgba(255,255,255,0.6)', isUp: true };
        }

        const diff = currentBalance - lastBalance;
        const absDiff = Math.abs(Math.round(diff));
        const isUp = diff >= 0;

        return {
            text: `₹${absDiff.toLocaleString()} from last month`,
            color: isUp ? '#10b981' : '#ef4444',
            isUp
        };
    };

    // Custom Tooltip for Habit Graph
    const HabitTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const d = payload[0].payload;
            return (
                <div className="glass-card" style={{ padding: '0.75rem', border: '1px solid rgba(255,255,255,0.2)' }}>
                    <p style={{ color: '#cbd5e1', fontSize: '0.8rem', marginBottom: '0.25rem' }}>{label}</p>
                    <p style={{ color: '#fff', fontWeight: 'bold', fontSize: '1rem', margin: 0 }}>
                        {d.completed}/{d.total} habits <span style={{ color: '#a78bfa', fontSize: '0.85rem' }}>({d.rate}%)</span>
                    </p>
                </div>
            );
        }
        return null;
    };

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="glass-card" style={{ padding: '0.75rem', border: '1px solid rgba(255,255,255,0.2)' }}>
                    <p style={{ color: '#cbd5e1', fontSize: '0.8rem', marginBottom: '0.25rem' }}>{label}</p>
                    <p style={{ color: '#fff', fontWeight: 'bold', fontSize: '1rem', margin: 0 }}>
                        ₹{payload[0].value.toLocaleString()}
                    </p>
                </div>
            );
        }
        return null;
    };

    // Shared Dashboard Content (for both Mobile and Desktop structures if they differ, but we can unify mostly)
    const DashboardContent = () => (
        <>
            <div className="dashboard-header animate-fade-in">
                <h1 className="module-title text-gradient">Dashboard</h1>
                <p>Your complete overview</p>
            </div>

            {/* Featured Balance Card - "The Monolith" */}
            <div className="featured-section animate-fade-in" style={{ animationDelay: '0.1s' }}>
                <Card className="featured-balance-card glass-card">
                    <div className="featured-content">
                        <span className="label text-xs uppercase tracking-wider text-gray-400">Monthly Balance</span>
                        <h2 className="amount text-5xl font-bold text-white my-2 text-neon">₹{stats.balance.toLocaleString()}</h2>
                        {(() => {
                            const comp = renderComparison();
                            return (
                                <div className="trend-tag" style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                                    padding: '6px 14px', borderRadius: '999px',
                                    background: `${comp.color}15`,
                                    border: `1px solid ${comp.color}30`,
                                    backdropFilter: 'blur(8px)'
                                }}>
                                    <TrendingUp
                                        size={16}
                                        style={{
                                            color: comp.color,
                                            transform: comp.isUp ? 'none' : 'scaleY(-1)'
                                        }}
                                    />
                                    <span style={{ fontSize: '0.875rem', fontWeight: 500, color: comp.color }}>
                                        {comp.text}
                                    </span>
                                </div>
                            );
                        })()}
                    </div>

                    <div className="featured-chart-overlay mt-6" style={{ height: '280px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={dailyData.slice(-14)} margin={{ top: 20, right: 10, left: 0, bottom: 10 }}>
                                <defs>
                                    <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                                <XAxis
                                    dataKey="date"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                                    dy={10}
                                    interval="preserveStartEnd"
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                                    tickFormatter={(value) => `₹${value}`}
                                    dx={-10}
                                    width={45}
                                />
                                <Tooltip cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeDasharray: '3 3' }} content={<CustomTooltip />} />
                                <Area
                                    type="monotone"
                                    dataKey="balanceTrend"
                                    stroke="#3b82f6"
                                    fill="url(#blueGradient)"
                                    strokeWidth={3}
                                    activeDot={{ r: 6, fill: '#fff', stroke: '#3b82f6', strokeWidth: 2 }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            {/* ─── Habit Completion Graph ─── */}
            {habitTrendData.length > 0 && habitTrendData.some(d => d.total > 0) && (
                <div className="featured-section animate-fade-in" style={{ animationDelay: '0.15s', marginTop: '1.5rem' }}>
                    <Card className="featured-balance-card glass-card">
                        <div className="featured-content">
                            <span className="label text-xs uppercase tracking-wider text-gray-400">Habit Completion</span>
                            <h2 className="amount text-5xl font-bold text-white my-2" style={{ fontSize: '2.5rem', background: 'linear-gradient(135deg, #a78bfa, #7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                {habitTrendData[habitTrendData.length - 1]?.rate ?? 0}% Today
                            </h2>
                            <div className="trend-tag" style={{
                                display: 'inline-flex', alignItems: 'center', gap: '8px',
                                padding: '6px 14px', borderRadius: '999px',
                                background: 'rgba(167,139,250,0.12)',
                                border: '1px solid rgba(167,139,250,0.3)',
                                backdropFilter: 'blur(8px)'
                            }}>
                                <Flame size={16} style={{ color: '#a78bfa' }} />
                                <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#a78bfa' }}>
                                    {habitTrendData[habitTrendData.length - 1]?.completed ?? 0} / {habitTrendData[habitTrendData.length - 1]?.total ?? 0} habits done today
                                </span>
                            </div>
                        </div>

                        <div className="featured-chart-overlay mt-6" style={{ height: '220px', width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={habitTrendData} margin={{ top: 20, right: 10, left: 0, bottom: 10 }}>
                                    <defs>
                                        <linearGradient id="habitGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false}
                                        tick={{ fill: '#9ca3af', fontSize: 11 }} dy={10} interval="preserveStartEnd" />
                                    <YAxis axisLine={false} tickLine={false}
                                        tick={{ fill: '#9ca3af', fontSize: 11 }}
                                        tickFormatter={(v) => `${v}%`} dx={-10} width={40} domain={[0, 100]} />
                                    <Tooltip cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeDasharray: '3 3' }} content={<HabitTooltip />} />
                                    <Area type="monotone" dataKey="rate" stroke="#a78bfa"
                                        fill="url(#habitGradient)" strokeWidth={3}
                                        activeDot={{ r: 6, fill: '#fff', stroke: '#a78bfa', strokeWidth: 2 }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>
            )}

            {/* Master Brain Card (Routine Intelligence) */}
            <div className="animate-fade-in" style={{ animationDelay: '0.2s', marginTop: '1.5rem' }}>
                <RoutineIntelligenceCard />
            </div>

            {/* Module Cards Grid */}
            <div className="module-cards-grid animate-fade-in" style={{ animationDelay: '0.2s', marginTop: '2rem' }}>
                {moduleCards.map(({ path, icon: Icon, title, badgeKey, color }, index) => (
                    <Link key={path} to={path} className="module-card-link">
                        <Card className={`module-card ${color}`} color={color} hover={true}>
                            <div className={`module-card-icon-wrapper ${color}`}>
                                <Icon size={28} />
                            </div>
                            <h3 className="module-card-title">{title}</h3>
                            <div className={`module-card-badge ${color}`}>
                                {moduleBadges[badgeKey]?.loading ? (
                                    <span className="animate-pulse">...</span>
                                ) : (
                                    moduleBadges[badgeKey]?.text
                                )}
                            </div>
                        </Card>
                    </Link>
                ))}
            </div>


        </>
    );

    return (
        <div className="dashboard container mx-auto px-4 py-6">
            <DashboardContent />
        </div>
    );
}
