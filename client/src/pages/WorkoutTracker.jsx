import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Dumbbell, Plus, Trash2, ChevronDown, ChevronUp,
    BarChart3, Calendar, Activity, TrendingUp, Award, Scale,
    Edit2, Check, X, AlertCircle, Zap, Target, Flame, Heart, Info, Trophy, Layout,
    Timer, BicepsFlexed, Crosshair, Bell
} from 'lucide-react';
import { reminderAPI } from '../utils/api';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Legend, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import Card from '../components/Card';
import './WorkoutTracker.css';

/* ─── localStorage helpers ─── */
const load = (key, fallback) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; } };
const save = (key, val) => localStorage.setItem(key, JSON.stringify(val));

const KEYS = {
    days: 'rm_workout_days',
    logs: 'rm_workout_logs',
    bmi: 'rm_bmi_records'
};

const TABS = [
    { name: 'Workout Days', icon: Layout },
    { name: 'Log Workout', icon: Edit2 },
    { name: 'History', icon: Calendar },
    { name: 'Analytics', icon: BarChart3 },
    { name: 'Recommendations', icon: Zap },
    { name: 'BMI', icon: Scale }
];

const ICON_MAP = {
    Dumbbell: <Dumbbell size={18} />,
    Activity: <Activity size={18} />,
    Target: <Target size={18} />,
    Zap: <Zap size={18} />,
    Flame: <Flame size={18} />,
    TrendingUp: <TrendingUp size={18} />,
    Heart: <Heart size={18} />,
    Trophy: <Trophy size={18} />,
    Timer: <Timer size={18} />,
    BicepsFlexed: <BicepsFlexed size={18} />,
    Crosshair: <Crosshair size={18} />,
};

const DEFAULT_DAYS = [
    { id: 'dd1', name: 'Leg Day', exercises: [], icon: 'Activity' },
    { id: 'dd2', name: 'Chest Day', exercises: [], icon: 'Dumbbell' },
    { id: 'dd3', name: 'Back Day', exercises: [], icon: 'Target' },
    { id: 'dd4', name: 'Shoulder Day', exercises: [], icon: 'Zap' },
    { id: 'dd5', name: 'Push Day', exercises: [], icon: 'Flame' },
    { id: 'dd6', name: 'Pull Day', exercises: [], icon: 'TrendingUp' },
];

const uid = () => Math.random().toString(36).slice(2, 10);

/* ─── PRs per exercise from logs ─── */
function computePRs(logs) {
    const prs = {};
    const sorted = [...logs].sort((a,b) => new Date(a.date) - new Date(b.date));
    sorted.forEach(log => {
        log.exercises.forEach(ex => {
            const w = Math.max(...ex.sets.map(s => parseFloat(s.weight) || 0));
            if (w > 0) {
                if (!prs[ex.name] || w > prs[ex.name].weight) {
                    prs[ex.name] = { weight: w, date: log.date, prev: prs[ex.name] ? prs[ex.name].weight : 0 };
                }
            }
        });
    });
    return prs;
}

/* ─── Discipline score from logs ─── */
function logsThisWeek(logs) {
    const now = new Date();
    const start = new Date(now); start.setDate(now.getDate() - now.getDay());
    start.setHours(0, 0, 0, 0);
    return logs.filter(l => new Date(l.date) >= start).length;
}

/* ─── Keyword-based icon matching ─── */
function suggestIcon(name) {
  const n = name.toLowerCase();
  if (n.includes('leg') || n.includes('squat') || n.includes('deadlift') || n.includes('romanian')) return 'Activity';
  if (n.includes('chest') || n.includes('press') || n.includes('bench')) return 'Dumbbell';
  if (n.includes('back') || n.includes('row') || n.includes('pull')) return 'Target';
  if (n.includes('shoulder')) return 'Crosshair';
  if (n.includes('push')) return 'Flame';
  if (n.includes('pull')) return 'TrendingUp';
  if (n.includes('cardio') || n.includes('hiit') || n.includes('run')) return 'Zap';
  if (n.includes('arm') || n.includes('bicep') || n.includes('tricep')) return 'BicepsFlexed';
  if (n.includes('heart') || n.includes('recovery')) return 'Heart';
  if (n.includes('timer') || n.includes('emom') || n.includes('amrap')) return 'Timer';
  return 'Dumbbell';
}

export default function WorkoutTracker() {
    const navigate = useNavigate();
    const [tab, setTab] = useState(0);

    /* ─── State ─── */
    const [workoutDays, setWorkoutDays] = useState(() => {
        const saved = load(KEYS.days, null);
        if (!saved) return DEFAULT_DAYS;
        // Migration: Ensure all days have an icon and unique if possible
        let changed = false;
        const migrated = saved.map((day, idx) => {
          if (!day.icon || day.icon === 'Dumbbell' && idx > 0) {
            changed = true;
            return { ...day, icon: day.icon || suggestIcon(day.name) };
          }
          return day;
        });
        return migrated;
    });
    const [logs, setLogs] = useState(() => load(KEYS.logs, []));
    const [bmiRecords, setBmiRecords] = useState(() => load(KEYS.bmi, []));

    /* ─── Workout Days tab state ─── */
    const [newDayName, setNewDayName] = useState('');
    const [newDayIcon, setNewDayIcon] = useState('Dumbbell');
    const [showIconPickerFor, setShowIconPickerFor] = useState(null); // 'new' or dayId
    const [expandedDay, setExpandedDay] = useState(null);
    const [addingExerciseTo, setAddingExerciseTo] = useState(null);
    const [exForm, setExForm] = useState({ name: '', defaultSets: 3, defaultReps: 10, defaultWeight: 0, notes: '' });

    /* ─── Log Workout tab state ─── */
    const [logDate, setLogDate] = useState(new Date().toISOString().slice(0, 10));
    const [selectedDayId, setSelectedDayId] = useState('');
    const [logExercises, setLogExercises] = useState([]);
    const [logSaved, setLogSaved] = useState(false);

    /* ─── History filter ─── */
    const [historyFilter, setHistoryFilter] = useState('month');

    /* ─── Analytics selected exercise ─── */
    const [analyticsExercise, setAnalyticsExercise] = useState('');

    /* ─── BMI state ─── */
    const [bmiHeight, setBmiHeight] = useState('');
    const [bmiWeight, setBmiWeight] = useState('');
    const [bmiResult, setBmiResult] = useState(null);

    // Notifications State
    const [reminders, setReminders] = useState([]);
    const [isReminderLoading, setIsReminderLoading] = useState(false);

    /* ─── Persist ─── */
    useEffect(() => save(KEYS.days, workoutDays), [workoutDays]);
    useEffect(() => save(KEYS.logs, logs), [logs]);
    useEffect(() => save(KEYS.bmi, bmiRecords), [bmiRecords]);

    useEffect(() => {
        loadReminders();
    }, []);

    const loadReminders = async () => {
        try {
            const resp = await reminderAPI.getAll();
            const data = resp.data.data || resp.data;
            setReminders(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error("Failed to load reminders", e);
        }
    };

    const workoutReminder = useMemo(() => 
        reminders.find(r => r.type === 'workout' && r.isActive),
    [reminders]);

    const toggleReminder = async () => {
        setIsReminderLoading(true);
        try {
            if (workoutReminder) {
                await reminderAPI.delete(workoutReminder._id);
                setReminders(prev => prev.filter(r => r._id !== workoutReminder._id));
            } else {
                const newReminder = {
                    title: 'Time to Train!',
                    description: 'Keep your momentum high. Log your session now.',
                    type: 'workout',
                    time: '18:00', // 6 PM default
                    daysOfWeek: [0,1,2,3,4,5,6],
                    isActive: true
                };
                const resp = await reminderAPI.create(newReminder);
                setReminders(prev => [...prev, resp.data]);
            }
            window.dispatchEvent(new CustomEvent('sync-reminders'));
        } catch (e) { console.error("Toggle reminder failed", e); }
        finally { setIsReminderLoading(false); }
    };

    /* ────────────────────────────
       WORKOUT DAYS management
    ──────────────────────────── */
    const addDay = () => {
        if (!newDayName.trim()) return;
        setWorkoutDays(prev => [...prev, { id: uid(), name: newDayName.trim(), exercises: [], icon: newDayIcon }]);
        setNewDayName('');
        setNewDayIcon('Dumbbell');
        setShowIconPickerFor(null);
    };

    const updateDayIcon = (id, icon) => {
      setWorkoutDays(prev => prev.map(d => d.id === id ? { ...d, icon } : d));
      setShowIconPickerFor(null);
    };

    const deleteDay = (id) => setWorkoutDays(prev => prev.filter(d => d.id !== id));

    const addExercise = (dayId) => {
        if (!exForm.name.trim()) return;
        setWorkoutDays(prev => prev.map(d => d.id === dayId
            ? { ...d, exercises: [...d.exercises, { id: uid(), ...exForm }] }
            : d
        ));
        setExForm({ name: '', defaultSets: 3, defaultReps: 10, defaultWeight: 0, notes: '' });
        setAddingExerciseTo(null);
    };

    const deleteExercise = (dayId, exId) => {
        setWorkoutDays(prev => prev.map(d => d.id === dayId
            ? { ...d, exercises: d.exercises.filter(e => e.id !== exId) }
            : d
        ));
    };

    /* ────────────────────────────
       LOG WORKOUT
    ──────────────────────────── */
    const selectDay = (dayId) => {
        setSelectedDayId(dayId);
        const day = workoutDays.find(d => d.id === dayId);
        if (!day) return;
        setLogExercises(day.exercises.map(ex => ({
            exerciseId: ex.id,
            name: ex.name,
            sets: Array.from({ length: ex.defaultSets }, () => ({ reps: ex.defaultReps, weight: ex.defaultWeight })),
            notes: ex.notes || ''
        })));
        setLogSaved(false);
    };

    const updateSet = (exIdx, setIdx, field, value) => {
        setLogExercises(prev => {
            const copy = [...prev];
            copy[exIdx] = { ...copy[exIdx], sets: copy[exIdx].sets.map((s, i) => i === setIdx ? { ...s, [field]: value } : s) };
            return copy;
        });
    };

    const addSet = (exIdx) => {
        setLogExercises(prev => {
            const copy = [...prev];
            const lastSet = copy[exIdx].sets.at(-1);
            copy[exIdx] = { ...copy[exIdx], sets: [...copy[exIdx].sets, { ...lastSet }] };
            return copy;
        });
    };

    const removeSet = (exIdx, setIdx) => {
        setLogExercises(prev => {
            const copy = [...prev];
            copy[exIdx] = { ...copy[exIdx], sets: copy[exIdx].sets.filter((_, i) => i !== setIdx) };
            return copy;
        });
    };

    const saveLog = () => {
        if (!selectedDayId || logExercises.length === 0) return;
        const day = workoutDays.find(d => d.id === selectedDayId);
        const newLog = {
            id: uid(),
            date: logDate,
            dayId: selectedDayId,
            dayName: day?.name || 'Custom',
            exercises: logExercises
        };
        setLogs(prev => {
            // Replace existing log for that date+day, or add new
            const existing = prev.findIndex(l => l.date === logDate && l.dayId === selectedDayId);
            if (existing >= 0) {
                const copy = [...prev];
                copy[existing] = newLog;
                return copy;
            }
            return [...prev, newLog];
        });
        setLogSaved(true);
    };

    /* ────────────────────────────
       HISTORY filtered
    ──────────────────────────── */
    const filteredLogs = useMemo(() => {
        const now = new Date();
        return logs.filter(l => {
            const d = new Date(l.date);
            if (historyFilter === 'week') {
                const start = new Date(now); start.setDate(now.getDate() - 7);
                return d >= start;
            }
            if (historyFilter === 'month') {
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            }
            // year
            return d.getFullYear() === now.getFullYear();
        }).sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [logs, historyFilter]);

    /* ────────────────────────────
       ANALYTICS
    ──────────────────────────── */
    const allExerciseNames = useMemo(() => {
        const names = new Set();
        logs.forEach(l => l.exercises.forEach(e => names.add(e.name)));
        return [...names].sort();
    }, [logs]);

    useEffect(() => {
        if (!analyticsExercise && allExerciseNames.length > 0) {
            setAnalyticsExercise(allExerciseNames[0]);
        }
    }, [allExerciseNames]);

    // Weight progression for selected exercise
    const progressionData = useMemo(() => {
        if (!analyticsExercise) return [];
        return logs
            .filter(l => l.exercises.some(e => e.name === analyticsExercise))
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .map(log => {
                const ex = log.exercises.find(e => e.name === analyticsExercise);
                const maxWeight = Math.max(...ex.sets.map(s => parseFloat(s.weight) || 0));
                return { date: log.date.slice(5), weight: maxWeight };
            });
    }, [logs, analyticsExercise]);

    // Weekly Volume Load (last 8 weeks)
    const weeklyVolume = useMemo(() => {
        const weeks = {};
        logs.forEach(l => {
            const d = new Date(l.date);
            const weekStart = new Date(d);
            weekStart.setDate(d.getDate() - d.getDay());
            const key = weekStart.toISOString().slice(0, 10);
            const vol = l.exercises.reduce((acc, ex) =>
                acc + ex.sets.reduce((s, set) => s + (parseFloat(set.reps) || 0) * (parseFloat(set.weight) || 0), 0), 0);
            weeks[key] = (weeks[key] || 0) + vol;
        });
        return Object.entries(weeks)
            .sort(([a], [b]) => new Date(a) - new Date(b))
            .slice(-8)
            .map(([date, volume]) => ({ date: date.slice(5), volume: Math.round(volume) }));
    }, [logs]);

    // Volume per session (total kg lifted)
    const volumeData = useMemo(() =>
        logs.sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(-12)
            .map(log => {
                const volume = log.exercises.reduce((acc, ex) =>
                    acc + ex.sets.reduce((s, set) => s + (parseFloat(set.reps) || 0) * (parseFloat(set.weight) || 0), 0), 0);
                return { date: log.date.slice(5), volume: Math.round(volume) };
            }), [logs]);

    const prs = useMemo(() => computePRs(logs), [logs]);

    // Most trained muscle groups (simple keyword mapping)
    const muscleGroupData = useMemo(() => {
        const muscleMap = {
            'Legs': ['squat', 'leg', 'lunge', 'calf', 'hamstring', 'glute', 'deadlift', 'romanian'],
            'Chest': ['bench', 'chest', 'press', 'fly', 'push'],
            'Back': ['row', 'pull', 'lat', 'back', 'chin up', 'pull up'],
            'Shoulders': ['shoulder', 'overhead', 'lateral', 'delt'],
            'Arms': ['curl', 'tricep', 'bicep', 'arm'],
            'Core': ['plank', 'crunch', 'abs', 'core'],
        };
        const counts = {};
        logs.forEach(l => l.exercises.forEach(e => {
            const lower = e.name.toLowerCase();
            let matched = false;
            Object.entries(muscleMap).forEach(([muscle, keywords]) => {
                if (keywords.some(k => lower.includes(k))) {
                    counts[muscle] = (counts[muscle] || 0) + 1;
                    matched = true;
                }
            });
            if (!matched) counts['Other'] = (counts['Other'] || 0) + 1;
        }));
        return Object.entries(counts).map(([muscle, count]) => ({ muscle, count })).sort((a, b) => b.count - a.count);
    }, [logs]);

    /* ────────────────────────────
       RECOMMENDATIONS
    ──────────────────────────── */
    const recommendations = useMemo(() => {
        const recs = [];
        const weekCount = logsThisWeek(logs);

        if (logs.length === 0) {
            recs.push({ icon: <Dumbbell />, text: 'Start by creating your first workout day and logging a session!', type: 'info' });
            return recs;
        }

        if (weekCount >= 6) {
            recs.push({ icon: <Zap />, text: 'You\'ve trained 6+ times this week. Consider rest — muscles grow during recovery!', type: 'warning' });
        } else if (weekCount === 0) {
            recs.push({ icon: <Activity />, text: 'No sessions this week yet. Let\'s get back on track — even a short workout counts!', type: 'warning' });
        } else {
            recs.push({ icon: <Flame />, text: `Great consistency! ${weekCount} session${weekCount > 1 ? 's' : ''} this week.`, type: 'success' });
        }

        // Check stagnation per exercise
        allExerciseNames.forEach(name => {
            const exLogs = logs
                .filter(l => l.exercises.some(e => e.name === name))
                .sort((a, b) => new Date(a.date) - new Date(b.date))
                .slice(-4);
            if (exLogs.length >= 3) {
                const weights = exLogs.map(log => {
                    const ex = log.exercises.find(e => e.name === name);
                    return Math.max(...ex.sets.map(s => parseFloat(s.weight) || 0));
                });
                const allSame = weights.slice(-3).every(w => w === weights[weights.slice(-3)[0]]);
                if (allSame && weights[weights.length - 1] > 0) {
                    recs.push({ icon: <TrendingUp />, text: `Progressive Overload: You've completed 3+ sessions of ${name} at ${weights[weights.length-1]}kg. Recommendation: increase weight next session.`, type: 'info' });
                }
            }
        });

        // Fatigue Detection (Volume spike)
        if (weeklyVolume.length >= 2) {
            const lastWeek = weeklyVolume[weeklyVolume.length - 2].volume;
            const thisWeek = weeklyVolume[weeklyVolume.length - 1].volume;
            if (lastWeek > 0 && thisWeek > lastWeek * 1.3) {
                recs.push({ icon: <AlertCircle />, text: `Fatigue Detection: Training volume increased >30% this week. Ensure adequate recovery.`, type: 'warning' });
            }
        }

        // Training Balance (Push vs Pull)
        const pushVol = logsThisWeek(logs.filter(l => l.exercises.some(e => e.name.toLowerCase().includes('push') || e.name.toLowerCase().includes('chest'))));
        const pullVol = logsThisWeek(logs.filter(l => l.exercises.some(e => e.name.toLowerCase().includes('pull') || e.name.toLowerCase().includes('back'))));
        if (pushVol > 0 && pushVol >= pullVol * 2) {
            recs.push({ icon: <Scale />, text: `Training Imbalance: Push muscles trained twice as often as pull this week. Consider adding back/pull exercises.`, type: 'warning' });
        }

        // Form Guidance
        logs.slice(-3).forEach(l => l.exercises.forEach(ex => {
            const avgReps = ex.sets.reduce((a, s) => a + (parseFloat(s.reps)||0), 0) / ex.sets.length;
            const avgWeight = ex.sets.reduce((a, s) => a + (parseFloat(s.weight)||0), 0) / ex.sets.length;
            if (ex.name.toLowerCase().includes('deadlift') && avgReps > 12 && avgWeight < 40) {
                if (!recs.some(r => r.text.includes('deadlift reps exceed'))) {
                    recs.push({ icon: <Info />, text: `Form Guidance: If deadlift reps exceed 12 with low weight, consider increasing weight for optimal hypertrophy.`, type: 'info' });
                }
            } 
        }));
        
        // Muscle Group Recovery indicator
        const recentDays = {};
        logs.slice(-4).forEach(l => {
           l.exercises.forEach(ex => {
               const lower = ex.name.toLowerCase();
               let group = 'Other';
               if (lower.includes('leg') || lower.includes('squat')) group = 'Legs';
               else if (lower.includes('chest') || lower.includes('push') || lower.includes('bench')) group = 'Chest';
               else if (lower.includes('back') || lower.includes('pull') || lower.includes('row')) group = 'Back';
               
               if (group !== 'Other') recentDays[group] = (recentDays[group] || 0) + 1;
           });
        });
        Object.entries(recentDays).forEach(([group, count]) => {
            if (count >= 3) {
                 recs.push({ icon: <Heart />, text: `Recovery Alert: ${group} trained 3+ times in the last 4 logs. Ensure you are giving these muscles 48h to recover.`, type: 'warning' });
            }
        });

        // Days since last workout
        const sorted = [...logs].sort((a, b) => new Date(b.date) - new Date(a.date));
        if (sorted.length > 0) {
            const lastDate = new Date(sorted[0].date);
            const daysSince = Math.floor((new Date() - lastDate) / 86400000);
            if (daysSince >= 7) {
                recs.push({ icon: <AlertCircle />, text: `Last workout was ${daysSince} days ago. Your muscles miss the challenge — come back strong!`, type: 'warning' });
            } else if (daysSince === 0) {
                recs.push({ icon: <Check />, text: 'Excellent! You trained today. Recovery and nutrition are key now.', type: 'success' });
            }
        }

        if (Object.keys(prs).length > 0) {
            const prList = Object.entries(prs).sort((a, b) => b[1].weight - a[1].weight).slice(0, 1);
            prList.forEach(([name, pr]) => {
                recs.push({ icon: <Trophy />, text: `Personal Record: ${name} — ${pr.weight} kg (set on ${pr.date})`, type: 'success' });
            });
        }

        return recs;
    }, [logs, allExerciseNames, prs]);

    /* ────────────────────────────
       BMI
    ──────────────────────────── */
    const calculateBMI = () => {
        const h = parseFloat(bmiHeight) / 100; // cm to m
        const w = parseFloat(bmiWeight);
        if (!h || !w || h <= 0) return;
        const bmi = w / (h * h);
        const rounded = Math.round(bmi * 10) / 10;
        let category = '';
        if (bmi < 18.5) category = 'Underweight';
        else if (bmi < 25) category = 'Normal weight';
        else if (bmi < 30) category = 'Overweight';
        else category = 'Obese';

        setBmiResult({ bmi: rounded, category });

        // Save monthly record
        const month = new Date().toISOString().slice(0, 7);
        setBmiRecords(prev => {
            const existing = prev.findIndex(r => r.month === month);
            const record = { month, bmi: rounded, height: parseFloat(bmiHeight), weight: w, date: new Date().toISOString().slice(0, 10) };
            if (existing >= 0) { const c = [...prev]; c[existing] = record; return c; }
            return [...prev, record].sort((a, b) => a.month.localeCompare(b.month));
        });
    };

    const bmiCategory = (bmi) => {
        if (bmi < 18.5) return { label: 'Underweight', color: '#60a5fa' };
        if (bmi < 25) return { label: 'Normal', color: '#4ade80' };
        if (bmi < 30) return { label: 'Overweight', color: '#fb923c' };
        return { label: 'Obese', color: '#f87171' };
    };

    /* ────────────────────────────
       CUSTOM TOOLTIPS
    ──────────────────────────── */
    const ChartTooltip = ({ active, payload, label, unit = '' }) => {
        if (active && payload?.length) {
            return (
                <div className="wt-tooltip">
                    <p className="wt-tooltip-label text-xs">{label}</p>
                    <p className="wt-tooltip-value text-lg font-bold">{payload[0].value}{unit}</p>
                </div>
            );
        }
        return null;
    };

    /* ════════════════════════════
       RENDER
    ════════════════════════════ */
    return (
        <div className="wt-page">
            {/* Header */}
            <div className="wt-header">
                <div className="wt-header-controls">
                    <button 
                        className={`wt-reminder-toggle ${workoutReminder ? 'active' : ''}`}
                        onClick={toggleReminder}
                        disabled={isReminderLoading}
                        title={workoutReminder ? "Disable Workout Reminder" : "Enable Workout Reminder (6:00 PM)"}
                    >
                        <Bell size={20} />
                    </button>
                    <button className="back-btn" onClick={() => navigate('/')}>
                        <ArrowLeft size={20} /><span>Dashboard</span>
                    </button>
                </div>
                <div className="wt-title-section">
                    <h1 className="module-title wt-title-gradient">Workout Tracker</h1>
                    <p className="wt-subtitle">System Progression Interface</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="wt-tabs">
                {TABS.map((t, i) => (
                    <button key={t.name} className={`wt-tab ${tab === i ? 'active' : ''}`} onClick={() => setTab(i)}>
                        <t.icon size={16} className="wt-tab-icon" />
                        <span className="wt-tab-name">{t.name}</span>
                    </button>
                ))}
            </div>

            {/* ── TAB 0: Workout Days ── */}
            {tab === 0 && (
                <div className="wt-section animate-fade-in">
                    <Card className="wt-card wt-input-card">
                        <div className="wt-card-header">
                            <h3 className="wt-section-title"><Layout size={18} /> New Routine Template</h3>
                        </div>
                        <div className="wt-row wt-add-day-row">
                            <div className="wt-day-icon-box" onClick={() => setShowIconPickerFor('new')}>
                              {ICON_MAP[newDayIcon]}
                            </div>
                            <input
                                className="wt-input wt-premium-input"
                                placeholder="Routine Name (e.g. Hypertrophy A)"
                                value={newDayName}
                                onChange={e => {
                                  setNewDayName(e.target.value);
                                  setNewDayIcon(suggestIcon(e.target.value));
                                }}
                                onKeyDown={e => e.key === 'Enter' && addDay()}
                            />
                            <button className="wt-action-btn wt-btn-glow" onClick={addDay} title="Add Routine">
                                <Plus size={20} />
                            </button>
                        </div>
                        {showIconPickerFor === 'new' && (
                          <div className="wt-icon-picker animate-fade-in">
                            {Object.keys(ICON_MAP).map(iconName => (
                              <button 
                                key={iconName} 
                                className={`wt-picker-btn ${newDayIcon === iconName ? 'active' : ''}`}
                                onClick={() => { setNewDayIcon(iconName); setShowIconPickerFor(null); }}
                              >
                                {ICON_MAP[iconName]}
                              </button>
                            ))}
                          </div>
                        )}
                    </Card>

                    <div className="wt-days-grid">
                        {workoutDays.map(day => (
                            <Card key={day.id} className={`wt-day-card ${expandedDay === day.id ? 'expanded' : ''}`}>
                                <div className="wt-day-header-main" onClick={() => setExpandedDay(expandedDay === day.id ? null : day.id)}>
                                    <div className="wt-day-brand">
                                        <div className="wt-day-icon-box" onClick={(e) => { e.stopPropagation(); setShowIconPickerFor(day.id); }}>
                                            {ICON_MAP[day.icon] || <Dumbbell size={18} />}
                                        </div>
                                        <div>
                                            <h3 className="wt-day-display-name">{day.name}</h3>
                                            <span className="wt-day-stats-pill">
                                                {day.exercises.length} Exercises
                                            </span>
                                        </div>
                                    </div>
                                    <div className="wt-day-controls">
                                        <button className="wt-icon-btn wt-delete-btn" onClick={e => { e.stopPropagation(); deleteDay(day.id); }}>
                                            <Trash2 size={18} />
                                        </button>
                                        <div className="wt-expand-chevron">
                                            {expandedDay === day.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                        </div>
                                    </div>
                                </div>

                                {showIconPickerFor === day.id && (
                                  <div className="wt-day-details-panel" onClick={e => e.stopPropagation()}>
                                    <div className="wt-icon-picker">
                                      {Object.keys(ICON_MAP).map(iconName => (
                                        <button 
                                          key={iconName} 
                                          className={`wt-picker-btn ${day.icon === iconName ? 'active' : ''}`}
                                          onClick={() => updateDayIcon(day.id, iconName)}
                                        >
                                          {ICON_MAP[iconName]}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {expandedDay === day.id && showIconPickerFor !== day.id && (
                                    <div className="wt-day-details-panel">
                                        <div className="wt-exercise-shelf">
                                            {day.exercises.map(ex => (
                                                <div key={ex.id} className="wt-exercise-item">
                                                    <div className="wt-ex-main-info">
                                                        <div className="wt-ex-marker"></div>
                                                        <div>
                                                            <p className="wt-ex-label">{ex.name}</p>
                                                            <p className="wt-ex-summary">{ex.defaultSets} Sets × {ex.defaultReps} Reps · {ex.defaultWeight}kg</p>
                                                        </div>
                                                    </div>
                                                    <button className="wt-mini-delete" onClick={() => deleteExercise(day.id, ex.id)} title="Remove Exercise">
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>

                                        {addingExerciseTo === day.id ? (
                                            <div className="wt-exercise-builder">
                                                <div className="wt-builder-header">
                                                    <span>Add New Exercise</span>
                                                </div>
                                                <input className="wt-input wt-builder-input" placeholder="Exercise Name*" value={exForm.name} onChange={e => setExForm({ ...exForm, name: e.target.value })} />
                                                <div className="wt-builder-metrics-row">
                                                    <div className="wt-builder-field">
                                                        <label>Sets</label>
                                                        <input type="number" value={exForm.defaultSets} min="1" onChange={e => setExForm({ ...exForm, defaultSets: parseInt(e.target.value) || 1 })} />
                                                    </div>
                                                    <div className="wt-builder-field">
                                                        <label>Reps</label>
                                                        <input type="number" value={exForm.defaultReps} min="1" onChange={e => setExForm({ ...exForm, defaultReps: parseInt(e.target.value) || 1 })} />
                                                    </div>
                                                    <div className="wt-builder-field">
                                                        <label>Weight (kg)</label>
                                                        <input type="number" value={exForm.defaultWeight} min="0" step="0.5" onChange={e => setExForm({ ...exForm, defaultWeight: parseFloat(e.target.value) || 0 })} />
                                                    </div>
                                                </div>
                                                <div className="wt-builder-actions">
                                                    <button className="wt-primary-btn" onClick={() => addExercise(day.id)}>Confirm Add</button>
                                                    <button className="wt-ghost-btn" onClick={() => setAddingExerciseTo(null)}>Cancel</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button className="wt-add-exercise-trigger" onClick={() => { setAddingExerciseTo(day.id); setExForm({ name: '', defaultSets: 3, defaultReps: 10, defaultWeight: 0, notes: '' }); }}>
                                                <Plus size={16} /> Add Exercise Template
                                            </button>
                                        )}
                                    </div>
                                )}
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* ── TAB 1: Log Workout ── */}
            {tab === 1 && (
                <div className="wt-section animate-fade-in">
                    <Card className="wt-card wt-log-header-card">
                        <h3 className="wt-section-title"><Edit2 size={18} /> Daily Session Log</h3>
                        <div className="wt-log-meta-grid">
                            <div className="wt-meta-item">
                                <label className="wt-meta-label">Session Date</label>
                                <div className="wt-date-input-wrapper">
                                    <Calendar size={16} className="wt-input-icon" />
                                    <input type="date" className="wt-meta-input" value={logDate} onChange={e => { setLogDate(e.target.value); setLogSaved(false); }} />
                                </div>
                            </div>
                            <div className="wt-meta-item">
                                <label className="wt-meta-label">Target Routine</label>
                                <div className="wt-select-wrapper">
                                    <Dumbbell size={16} className="wt-input-icon" />
                                    <select className="wt-meta-input" value={selectedDayId} onChange={e => selectDay(e.target.value)}>
                                        <option value="">Choose Routine Template</option>
                                        {workoutDays.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {logExercises.length > 0 && (
                        <div className="wt-active-log-list">
                            {logExercises.map((ex, exIdx) => (
                                <Card key={ex.exerciseId || exIdx} className="wt-active-ex-card">
                                    <div className="wt-active-ex-header">
                                        <h4 className="wt-active-ex-title">{ex.name}</h4>
                                        <div className="wt-active-ex-decoration"></div>
                                    </div>
                                    <div className="wt-log-table">
                                        <div className="wt-log-table-header">
                                            <span>SET</span><span>REPS</span><span>WEIGHT (KG)</span><span>ACTION</span>
                                        </div>
                                        <div className="wt-log-sets-body">
                                            {ex.sets.map((set, setIdx) => (
                                                <div key={setIdx} className="wt-log-set-row">
                                                    <div className="wt-set-mark">{setIdx + 1}</div>
                                                    <input type="number" className="wt-table-input" value={set.reps} min="1" onChange={e => updateSet(exIdx, setIdx, 'reps', e.target.value)} />
                                                    <input type="number" className="wt-table-input" value={set.weight} min="0" step="0.5" onChange={e => updateSet(exIdx, setIdx, 'weight', e.target.value)} />
                                                    <button className="wt-table-delete" onClick={() => removeSet(exIdx, setIdx)} disabled={ex.sets.length <= 1}>
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <button className="wt-add-set-trigger" onClick={() => addSet(exIdx)}>
                                        <Plus size={14} /> NEW SET
                                    </button>
                                </Card>
                            ))}

                            <div className="wt-final-action">
                                <button className={`wt-persist-btn ${logSaved ? 'is-complete' : ''}`} onClick={saveLog}>
                                    {logSaved ? (
                                        <div className="wt-btn-success-flow">
                                            <Check size={22} strokeWidth={3} />
                                            <span>SESSION VERIFIED</span>
                                        </div>
                                    ) : (
                                        <>
                                            <Zap size={20} className="wt-zap-icon" />
                                            <span>FINALIZE WORKOUT</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {selectedDayId && logExercises.length === 0 && (
                        <div className="wt-system-empty">
                            <AlertCircle size={48} className="wt-empty-icon" />
                            <p className="wt-empty-text">No instructions found for this routine.<br />Configure exercises in Routine Templates.</p>
                        </div>
                    )}
                </div>
            )}

            {/* ── TAB 2: History ── */}
            {tab === 2 && (
                <div className="wt-section animate-fade-in">
                    <div className="wt-filter-tabs">
                        {['week', 'month', 'year'].map(f => (
                            <button key={f} className={`wt-filter-chip ${historyFilter === f ? 'active' : ''}`} onClick={() => setHistoryFilter(f)}>
                                {f.toUpperCase()}
                            </button>
                        ))}
                    </div>

                    {filteredLogs.length === 0 ? (
                        <div className="wt-system-empty">
                            <Calendar size={48} className="wt-empty-icon" />
                            <p className="wt-empty-text">Zero session history detected for this period.</p>
                        </div>
                    ) : (
                        <div className="wt-history-timeline">
                            {filteredLogs.map(log => (
                                <div key={log.id} className="wt-timeline-item">
                                    <div className="wt-timeline-date-mark">
                                        <span className="wt-date-day">{new Date(log.date).getDate()}</span>
                                        <span className="wt-date-month">{new Date(log.date).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</span>
                                    </div>
                                    <Card className="wt-history-log-card">
                                        <div className="wt-hist-card-header">
                                            <div className="wt-hist-type-pill">{log.dayName}</div>
                                            <span className="wt-hist-timestamp">{new Date(log.date).toLocaleDateString('en-US', { weekday: 'long' })}</span>
                                        </div>
                                        <div className="wt-hist-content">
                                            {log.exercises.map((ex, i) => {
                                                const totalReps = ex.sets.reduce((a, s) => a + (parseFloat(s.reps) || 0), 0);
                                                const maxW = Math.max(...ex.sets.map(s => parseFloat(s.weight) || 0));
                                                const isPR = prs[ex.name]?.weight === maxW && prs[ex.name]?.date === log.date;
                                                
                                                const intensityScore = maxW > 0 ? (maxW * totalReps) / ex.sets.length : totalReps * 5;
                                                let effortLabel = 'LOW', effortColor = '#38bdf8';
                                                if (intensityScore > 300) { effortLabel = 'HIGH'; effortColor = '#ef4444'; }
                                                else if (intensityScore > 150) { effortLabel = 'MED'; effortColor = '#fb923c'; }

                                                return (
                                                    <div key={i} className="wt-hist-exercise-row">
                                                        <div className="wt-hist-ex-name-group">
                                                            {isPR && <Trophy size={14} className="wt-pr-icon-inline" />}
                                                            <span className="wt-hist-ex-title">{ex.name}</span>
                                                        </div>
                                                        <div className="wt-hist-ex-metrics">
                                                            <span className="wt-metrics-pill">{ex.sets.length}S</span>
                                                            <span className="wt-metrics-pill">Peak: {maxW}kg</span>
                                                            <span className="wt-vol-pill" style={{ color: effortColor, background: `${effortColor}15` }}>Int: {effortLabel}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </Card>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── TAB 3: Analytics ── */}
            {tab === 3 && (
                <div className="wt-section animate-fade-in">
                    {logs.length === 0 ? (
                        <div className="wt-system-empty">
                            <BarChart3 size={48} className="wt-empty-icon" />
                            <p className="wt-empty-text">Intelligence requires data.<br />Log more sessions to unlock analytics.</p>
                        </div>
                    ) : (
                        <>
                            {/* Strength Analytics */}
                            <Card className="wt-analytics-card">
                                <div className="wt-analytics-header">
                                    <div className="wt-analytics-title-group">
                                        <TrendingUp size={18} className="wt-accent-navy" />
                                        <h3 className="wt-analytics-title">Power Progression</h3>
                                    </div>
                                    <div className="wt-analytics-selector">
                                        <select className="wt-data-select" value={analyticsExercise} onChange={e => setAnalyticsExercise(e.target.value)}>
                                            {allExerciseNames.map(n => <option key={n} value={n}>{n}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="wt-chart-viewport">
                                    {progressionData.length > 1 ? (
                                        <ResponsiveContainer width="100%" height={240}>
                                            <AreaChart data={progressionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="progressionGradient" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} hide />
                                                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} unit="kg" />
                                                <Tooltip content={<ChartTooltip unit=" kg" />} cursor={{ stroke: 'rgba(56, 189, 248, 0.2)', strokeWidth: 1 }} />
                                                <Area type="monotone" dataKey="weight" stroke="#38bdf8" strokeWidth={3} fill="url(#progressionGradient)" activeDot={{ r: 6, fill: '#fff' }} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    ) : <div className="wt-chart-placeholder">Insufficient data for delta analysis</div>}
                                </div>
                            </Card>

                            <div className="wt-analytics-grid-secondary">
                                {/* Frequency Analysis */}
                                <Card className="wt-analytics-card-sm">
                                    <div className="wt-analytics-title-group mb-6">
                                        <Calendar size={18} className="wt-accent-navy" />
                                        <h3 className="wt-analytics-title">Weekly Volume Load</h3>
                                    </div>
                                    <div className="wt-chart-viewport-sm">
                                        <ResponsiveContainer width="100%" height={140}>
                                            <BarChart data={weeklyVolume}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                                <XAxis dataKey="date" hide />
                                                <YAxis hide />
                                                <Tooltip content={<ChartTooltip unit=" kg" />} />
                                                <Bar dataKey="volume" fill="#38bdf8" radius={[4, 4, 0, 0]} barSize={20} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </Card>

                                {/* Volume Dynamics */}
                                <Card className="wt-analytics-card-sm">
                                    <div className="wt-analytics-title-group mb-6">
                                        <Activity size={18} className="wt-accent-navy" />
                                        <h3 className="wt-analytics-title">Volume Flux</h3>
                                    </div>
                                    <div className="wt-chart-viewport-sm">
                                        <ResponsiveContainer width="100%" height={140}>
                                            <LineChart data={volumeData}>
                                                <Tooltip content={<ChartTooltip unit="kg" />} />
                                                <Line type="step" dataKey="volume" stroke="#1e40af" strokeWidth={2} dot={false} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </Card>
                            </div>

                            {/* Morphology Analysis */}
                            <Card className="wt-analytics-card">
                                <div className="wt-analytics-title-group mb-4">
                                    <Target size={18} className="wt-accent-navy" />
                                    <h3 className="wt-analytics-title">Muscle Topology Distribution</h3>
                                </div>
                                <div className="wt-topology-stack">
                                    <ResponsiveContainer width="100%" height={240}>
                                        <PieChart>
                                            <Pie 
                                                data={muscleGroupData} 
                                                dataKey="count" 
                                                nameKey="muscle" 
                                                cx="50%" cy="50%" 
                                                innerRadius={60} 
                                                outerRadius={80} 
                                                paddingAngle={5}
                                                stroke="none"
                                            >
                                                {muscleGroupData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={['#38bdf8', '#1e40af', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe'][index % 6]} />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<ChartTooltip unit=" sets" />} wrapperStyle={{ background: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px', color: 'white' }} />
                                            <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', color: '#94a3b8', marginTop: '10px' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </Card>

                            {/* Accomplishments */}
                            <Card className="wt-analytics-card">
                                <div className="wt-analytics-title-group mb-6">
                                    <Award size={18} className="wt-accent-navy" />
                                    <h3 className="wt-analytics-title">Peak System Records</h3>
                                </div>
                                <div className="wt-records-shelf">
                                    {Object.entries(prs).map(([name, pr]) => {
                                        const diff = pr.prev > 0 ? (((pr.weight - pr.prev) / pr.prev) * 100).toFixed(1) : 0;
                                        return (
                                        <div key={name} className="wt-record-tag">
                                            <div className="wt-record-main">
                                                <span className="wt-record-ex">{name}</span>
                                                <span className="wt-record-peak">{pr.weight}<span className="wt-record-unit">KG</span></span>
                                            </div>
                                            <div className="wt-record-footer">
                                                <div className="wt-pr-glow-label">NEW PR {diff > 0 && `(+${diff}%)`}</div>
                                                <span className="wt-record-date">{pr.date}</span>
                                            </div>
                                        </div>
                                        );
                                    })}
                                </div>
                            </Card>
                        </>
                    )}
                </div>
            )}

            {/* ── TAB 4: Recommendations ── */}
            {tab === 4 && (
                <div className="wt-section animate-fade-in">
                    <div className="wt-rec-intelligence-grid">
                        <div className="wt-rec-hero">
                            <Zap size={40} className="wt-rec-hero-icon" />
                            <h2 className="wt-rec-hero-title">Core Intelligence Engine</h2>
                            <p className="wt-rec-hero-subtitle">Analyzing session vectors for optimal performance</p>
                        </div>
                        <div className="wt-rec-feed">
                            {recommendations.map((r, i) => (
                                <div key={i} className={`wt-rec-pulse-card type-${r.type}`}>
                                    <div className="wt-rec-side-marker"></div>
                                    <div className="wt-rec-body">
                                        <div className="wt-rec-header-row">
                                            <div className="wt-rec-icon-wrapper">{r.icon}</div>
                                            <div className="wt-rec-type-badge">{r.type.toUpperCase()}</div>
                                        </div>
                                        <p className="wt-rec-content-text">{r.text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ── TAB 5: BMI ── */}
            {tab === 5 && (
                <div className="wt-section animate-fade-in">
                    <Card className="wt-card wt-bmi-calculator-shell">
                        <div className="wt-bmi-hero-section">
                            <div className="wt-section-title">
                                <Scale size={18} className="wt-accent-navy" />
                                <h3 className="wt-bmi-main-title">Biometric Index Analysis</h3>
                            </div>
                            <div className="wt-bmi-input-cluster">
                                <div className="wt-biometric-field">
                                    <label>HEIGHT (CM)</label>
                                    <input type="number" placeholder="175" value={bmiHeight} onChange={e => setBmiHeight(e.target.value)} />
                                </div>
                                <div className="wt-biometric-field">
                                    <label>WEIGHT (KG)</label>
                                    <input type="number" placeholder="75" value={bmiWeight} onChange={e => setBmiWeight(e.target.value)} />
                                </div>
                                <button className="wt-compute-btn" onClick={calculateBMI}>
                                    ANALYZE STATS
                                </button>
                            </div>
                        </div>

                        {bmiResult && (
                            <div className="wt-bmi-report-card">
                                <div className="wt-bmi-display">
                                    <div className="wt-bmi-gauge">
                                        <svg viewBox="0 0 100 10" className="wt-gauge-svg">
                                            <rect x="0" y="0" width="100" height="4" rx="2" fill="rgba(255,255,255,0.05)" />
                                            <rect x="0" y="0" width={Math.min(100, (bmiResult.bmi / 40) * 100)} height="4" rx="2" fill={bmiCategory(bmiResult.bmi).color} />
                                        </svg>
                                        <div className="wt-bmi-score-group">
                                            <span className="wt-bmi-digit" style={{ color: bmiCategory(bmiResult.bmi).color }}>{bmiResult.bmi}</span>
                                            <span className="wt-bmi-verdict" style={{ background: `${bmiCategory(bmiResult.bmi).color}15`, color: bmiCategory(bmiResult.bmi).color }}>
                                                {bmiResult.bmi >= 30 ? <AlertCircle size={14} /> : <Check size={14} />}
                                                {bmiResult.category.toUpperCase()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="wt-bmi-legend-bar">
                                    <div className="wt-legend-tick"><div className="wt-tick-color" style={{ background: '#60a5fa' }}></div><span>UND</span></div>
                                    <div className="wt-legend-tick"><div className="wt-tick-color" style={{ background: '#4ade80' }}></div><span>NORM</span></div>
                                    <div className="wt-legend-tick"><div className="wt-tick-color" style={{ background: '#fb923c' }}></div><span>OVER</span></div>
                                    <div className="wt-legend-tick"><div className="wt-tick-color" style={{ background: '#f87171' }}></div><span>OBESE</span></div>
                                </div>
                            </div>
                        )}
                    </Card>

                    {bmiRecords.length > 0 && (
                        <Card className="wt-card wt-bmi-history-log">
                            <div className="wt-analytics-header mb-6">
                                <div className="wt-analytics-title-group">
                                    <TrendingUp size={18} className="wt-accent-navy" />
                                    <h3 className="wt-analytics-title">Morphology Timeline</h3>
                                </div>
                            </div>
                            <div className="wt-bmi-history-list">
                                {[...bmiRecords].reverse().map(r => (
                                    <div key={r.month} className="wt-bmi-history-entry">
                                        <div className="wt-bmi-entry-date">
                                            <span className="wt-entry-month">{r.month}</span>
                                        </div>
                                        <div className="wt-bmi-entry-metrics">
                                            <span className="wt-entry-weight">{r.weight}kg</span>
                                            <span className="wt-entry-bmi" style={{ color: bmiCategory(r.bmi).color }}>{r.bmi} BMI</span>
                                        </div>
                                        <div className="wt-bmi-entry-badge" style={{ background: `${bmiCategory(r.bmi).color}15`, color: bmiCategory(r.bmi).color }}>
                                            {bmiCategory(r.bmi).label.toUpperCase()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}
