import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Skull, Flame, BookOpen, BarChart3,
    Heart, Star, Zap, CheckCircle, XCircle, AlertTriangle,
    Crown, Coins, Eye, Utensils, Moon, ShieldCheck, Sun, 
    Leaf, HandHeart, Scale, Hourglass, Sword, Cloud, Wind, 
    Target, Award, Info, Activity, Clock, Calendar, TrendingUp, Bell
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Cell, AreaChart, Area
} from 'recharts';
import { reminderAPI } from '../utils/api';
import Card from '../components/Card';
import './SinsReflection.css';

/* ─── localStorage helpers ─── */
const load = (key, fallback) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; } };
const save = (key, val) => localStorage.setItem(key, JSON.stringify(val));
const KEY = 'rm_sin_reflections';
const today = () => new Date().toISOString().slice(0, 10);

const SINS = ['Pride', 'Greed', 'Lust', 'Envy', 'Gluttony', 'Wrath', 'Sloth'];

const SIN_ICONS = {
    Pride: <Crown size={18} />,
    Greed: <Coins size={18} />,
    Lust: <Flame size={18} />,
    Envy: <Eye size={18} />,
    Gluttony: <Utensils size={18} />,
    Wrath: <Zap size={18} />,
    Sloth: <Moon size={18} />
};

const VIRTUE_MAP = {
    Pride: 'Humility', Greed: 'Generosity', Lust: 'Self-control',
    Envy: 'Gratitude', Gluttony: 'Moderation', Wrath: 'Patience', Sloth: 'Discipline'
};

const VIRTUE_ICONS = {
    Humility: <Leaf size={18} />,
    Generosity: <HandHeart size={18} />,
    'Self-control': <ShieldCheck size={18} />,
    Gratitude: <Sun size={18} />,
    Moderation: <Scale size={18} />,
    Patience: <Hourglass size={18} />,
    Discipline: <Sword size={18} />
};

const EMOTIONS = [
    { label: 'Calm', icon: <Wind size={18} />, color: '#60a5fa' },
    { label: 'Focused', icon: <Target size={18} />, color: '#4ade80' },
    { label: 'Angry', icon: <Zap size={18} />, color: '#f87171' },
    { label: 'Tempted', icon: <Flame size={18} />, color: '#fb923c' },
    { label: 'Tired', icon: <Cloud size={18} />, color: '#94a3b8' },
    { label: 'Motivated', icon: <Activity size={18} />, color: '#a855f7' }
];

const TABS = [
    { label: 'Today', icon: Clock },
    { label: 'Virtue Tracker', icon: Award },
    { label: 'Analytics', icon: BarChart3 },
    { label: 'Intelligence Feed', icon: Activity }
];

const blankEntry = () => ({
    date: today(),
    defeated: [],
    mistakes: [],
    positiveActions: '',
    notes: '',
    emotion: ''
});

const migrateEntry = (r) => ({
    ...blankEntry(),
    ...r,
    defeated: r.defeated || r.sins || [],
    mistakes: r.mistakes || []
});

const disciplineScore = (entry) => {
    if (!entry) return 0;
    // Handle both 'defeated' and 'sins' for backward compatibility
    const defeated = entry.defeated || entry.sins || [];
    const mistakes = entry.mistakes || [];
    const d = defeated.length;
    const m = mistakes.length;
    
    const raw = ((d / 7) * 60) + (m === 0 ? 20 : Math.max(0, 20 - m * 5)) + ((entry.positiveActions || '').trim() ? 15 : 0) + ((entry.notes || '').trim() ? 5 : 0);
    return Math.min(100, Math.round(raw));
};

const getScoreColor = (score) => {
    if (score >= 80) return '#4ade80';
    if (score >= 55) return '#fb923c';
    return '#f87171';
};

export default function SinsReflection() {
    const navigate = useNavigate();
    const [tab, setTab] = useState(0);
    const [reflections, setReflections] = useState(() => {
        const raw = load(KEY, []);
        return Array.isArray(raw) ? raw.map(migrateEntry) : [];
    });

    const todayStr = today();
    const todayEntry = reflections.find(r => r.date === todayStr);
    const [form, setForm] = useState(todayEntry || blankEntry());
    const [saved, setSaved] = useState(!!todayEntry);
    
    // Notifications State
    const [reminders, setReminders] = useState([]);
    const [isReminderLoading, setIsReminderLoading] = useState(false);

    useEffect(() => save(KEY, reflections), [reflections]);

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

    const sinReminder = useMemo(() => 
        reminders.find(r => r.type === 'sin-reflection' && r.isActive),
    [reminders]);

    const toggleReminder = async () => {
        setIsReminderLoading(true);
        try {
            if (sinReminder) {
                await reminderAPI.delete(sinReminder._id);
                setReminders(prev => prev.filter(r => r._id !== sinReminder._id));
            } else {
                const newReminder = {
                    title: 'Nightly Reflection',
                    description: 'Time to record your sins and virtues for today.',
                    type: 'sin-reflection',
                    time: '21:00',
                    daysOfWeek: [0,1,2,3,4,5,6],
                    isActive: true
                };
                const resp = await reminderAPI.create(newReminder);
                setReminders(prev => [...prev, resp.data]);
            }
            // Trigger background sync for Capacitor
            window.dispatchEvent(new CustomEvent('sync-reminders'));
        } catch (e) { console.error("Toggle reminder failed", e); }
        finally { setIsReminderLoading(false); }
    };

    const toggle = (field, value) => {
        setSaved(false);
        setForm(prev => {
            const arr = prev[field];
            return { ...prev, [field]: arr.includes(value) ? arr.filter(x => x !== value) : [...arr, value] };
        });
    };

    const saveEntry = () => {
        setReflections(prev => {
            const idx = prev.findIndex(r => r.date === todayStr);
            if (idx >= 0) { const c = [...prev]; c[idx] = form; return c; }
            return [...prev, form];
        });
        setSaved(true);
    };

    /* ─── Analytics computations ─── */
    const last30 = useMemo(() => {
        const result = [];
        for (let i = 29; i >= 0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().slice(0, 10);
            const entry = reflections.find(r => r.date === dateStr);
            result.push({ date: dateStr.slice(5), score: entry ? disciplineScore(entry) : null, hasData: !!entry });
        }
        return result;
    }, [reflections]);

    const sinFrequency = useMemo(() => {
        const counts = {};
        SINS.forEach(s => counts[s] = 0);
        reflections.forEach(r => (r.mistakes || []).forEach(s => counts[s] = (counts[s] || 0) + 1));
        return SINS.map(s => ({ sin: s, count: counts[s] })).sort((a, b) => b.count - a.count);
    }, [reflections]);

    const virtueProgress = useMemo(() => {
        const recent = reflections.slice(-30);
        return SINS.map(sin => {
            const virtue = VIRTUE_MAP[sin];
            const defeatedSlots = recent.filter(r => (r.defeated || r.sins || []).includes(sin)).length;
            const total = recent.length;
            const pct = total > 0 ? Math.round((defeatedSlots / total) * 100) : 0;
            return { sin, virtue, pct };
        });
    }, [reflections]);

    const recommendations = useMemo(() => {
        const recs = [];
        if (reflections.length === 0) {
            recs.push({ type: 'info', icon: <Info />, text: 'Begin your first daily reflection to initialize the discipline heuristic engine.' });
            return recs;
        }

        const recent = reflections.slice(-7);
        const avgScore = Math.round(recent.reduce((a, r) => a + disciplineScore(r), 0) / (recent.length || 1));

        if (avgScore >= 80) recs.push({ type: 'success', icon: <Award />, text: `Exceptional consistency. Your 7-day resonance is ${avgScore}/100. Character integrity is hardening.` });
        else if (avgScore >= 50) recs.push({ type: 'info', icon: <Activity />, text: `Steady progression. Your 7-day average of ${avgScore}/100 shows active moral engagement.` });
        else recs.push({ type: 'warning', icon: <AlertTriangle />, text: `Discipline oscillation detected (${avgScore}/100). Re-focus on a single virtue tomorrow to reset momentum.` });

        const recentSins = recent.flatMap(r => r.mistakes || []);
        if (recentSins.length > 0) {
            const mostFrequent = [...new Set(recentSins)].sort((a,b) => recentSins.filter(s=>s===b).length - recentSins.filter(s=>s===a).length)[0];
            recs.push({ type: 'warning', icon: SIN_ICONS[mostFrequent], text: `Constraint identified: ${mostFrequent} is your most frequent entropy source this week. Neutralize through active practice of ${VIRTUE_MAP[mostFrequent]}.` });
        }

        const totalDefeated = recent.reduce((a, r) => a + (r.defeated?.length || 0), 0);
        if (totalDefeated > 0) {
            recs.push({ type: 'success', icon: <ShieldCheck />, text: `You showed strong discipline by resisting ${totalDefeated} temptations over the last 7 days. Consistency builds character.`});
        }

        const bestVirtueData = [...virtueProgress].sort((a, b) => b.pct - a.pct)[0];
        if (bestVirtueData && bestVirtueData.pct > 0) {
            recs.push({ type: 'success', icon: VIRTUE_ICONS[bestVirtueData.virtue], text: `Primary Virtue: ${bestVirtueData.virtue} is currently your strongest deterrent against vice (${bestVirtueData.pct}%).` });
        }

        return recs;
    }, [reflections, sinFrequency, virtueProgress]);

    const { userLevel, totalVirtuePoints } = useMemo(() => {
        const pts = virtueProgress.reduce((a, v) => a + Math.round(v.pct / 10), 0);
        const lvl = Math.max(1, Math.round(virtueProgress.reduce((a, v) => a + (v.pct / 100), 0) * 10 / SINS.length));
        return { userLevel: lvl, totalVirtuePoints: pts };
    }, [virtueProgress]);

    const streak = useMemo(() => {
        let count = 0;
        const sorted = [...reflections].sort((a, b) => b.date.localeCompare(a.date));
        for (let i = 0; i < sorted.length; i++) {
            const expected = new Date(); expected.setDate(expected.getDate() - i);
            if (sorted[i]?.date === expected.toISOString().slice(0, 10)) count++;
            else break;
        }
        return count;
    }, [reflections]);

    const todayScore = disciplineScore(todayEntry || form);

    /* ─── Tooltip ─── */
    const CustomTooltip = ({ active, payload }) => {
        if (active && payload?.length) return (
            <div className="sr-tooltip">
                <p className="sr-tooltip-label">{payload[0].payload.sin || payload[0].payload.date}</p>
                <p className="sr-tooltip-value">{payload[0].value}</p>
            </div>
        );
        return null;
    };

    /* ════════ RENDER ════════ */
    return (
        <div className="sr-page">
            {/* Header */}
            <div className="sr-header">
                <div className="sr-header-controls">
                    <button 
                        className={`sr-reminder-toggle ${sinReminder ? 'active' : ''}`}
                        onClick={toggleReminder}
                        disabled={isReminderLoading}
                        title={sinReminder ? "Disable Nightly Reminder" : "Enable Nightly Reminder (9:00 PM)"}
                    >
                        <Bell size={20} />
                    </button>
                    <button className="back-btn" onClick={() => navigate('/')}>
                        <ArrowLeft size={20} /><span>Dashboard</span>
                    </button>
                </div>
                <div className="sr-title-block">
                    <h1 className="module-title sr-title-gradient">Sins Reflection</h1>
                    <p className="sr-subtitle">Moral Heuristic Monitor</p>
                </div>
            </div>

            {/* Matrix Stats */}
            <div className="sr-matrix-stats">
                <div className="sr-matrix-item">
                    <span className="sr-matrix-label">Current Score</span>
                    <span className="sr-matrix-value" style={{ color: getScoreColor(todayScore) }}>{todayScore}<small>/100</small></span>
                </div>
                <div className="sr-matrix-item">
                    <span className="sr-matrix-label">Active Streak</span>
                    <span className="sr-matrix-value" style={{ color: '#fb923c' }}>{streak}<small>DAYS</small></span>
                </div>
                <div className="sr-matrix-item">
                    <span className="sr-matrix-label">Moral Logs</span>
                    <span className="sr-matrix-value">{reflections.length}</span>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="sr-tabs">
                {TABS.map((t, i) => (
                    <button key={t.label} className={`sr-tab ${tab === i ? 'active' : ''}`} onClick={() => setTab(i)}>
                        <t.icon size={16} />
                        <span>{t.label}</span>
                    </button>
                ))}
            </div>

            {/* ── TAB 0: Entry ── */}
            {tab === 0 && (
                <div className="sr-section animate-fade-in">
                    <div className="sr-today-meta">
                        <Calendar size={18} className="sr-accent-crimson" />
                        <span className="sr-date-display">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
                    </div>

                    <Card className="sr-card sr-mood-matrix">
                        <h3 className="sr-section-title"><Activity size={18} /> Internal Resonance</h3>
                        <div className="sr-mood-grid">
                            {EMOTIONS.map(e => (
                                <button
                                    key={e.label}
                                    className={`sr-mood-chip ${form.emotion === e.label ? 'active' : ''}`}
                                    onClick={() => { setSaved(false); setForm(prev => ({ ...prev, emotion: prev.emotion === e.label ? '' : e.label })); }}
                                >
                                    <span className="sr-mood-icon" style={{ color: e.color }}>{e.icon}</span>
                                    <span>{e.label}</span>
                                </button>
                            ))}
                        </div>
                    </Card>

                    <Card className="sr-card sr-binary-grid">
                        <h3 className="sr-section-title"><CheckCircle size={18} className="sr-accent-success" /> Temptations Suppressed</h3>
                        <div className="sr-sins-matrix">
                            {SINS.map(sin => (
                                <button
                                    key={sin}
                                    className={`sr-sin-chip positive ${form.defeated.includes(sin) ? 'active' : ''}`}
                                    onClick={() => toggle('defeated', sin)}
                                >
                                    <span className="sr-chip-icon">{SIN_ICONS[sin]}</span>
                                    <span>{sin}</span>
                                    {form.defeated.includes(sin) && <div className="sr-chip-dot" />}
                                </button>
                            ))}
                        </div>
                    </Card>

                    <Card className="sr-card sr-binary-grid">
                        <h3 className="sr-section-title"><XCircle size={18} className="sr-accent-error" /> Entropy Instances</h3>
                        <div className="sr-sins-matrix">
                            {SINS.map(sin => (
                                <button
                                    key={sin}
                                    className={`sr-sin-chip negative ${form.mistakes.includes(sin) ? 'active' : ''}`}
                                    onClick={() => toggle('mistakes', sin)}
                                >
                                    <span className="sr-chip-icon">{SIN_ICONS[sin]}</span>
                                    <span>{sin}</span>
                                    {form.mistakes.includes(sin) && <div className="sr-chip-dot-error" />}
                                </button>
                            ))}
                        </div>
                    </Card>

                    <Card className="sr-card">
                        <h3 className="sr-section-title"><Sword size={18} className="sr-accent-gold" /> Virtuous Artifacts</h3>
                        <textarea
                            className="sr-premium-textarea"
                            placeholder="Document specific instances of discipline today..."
                            value={form.positiveActions}
                            onChange={e => { setSaved(false); setForm(prev => ({ ...prev, positiveActions: e.target.value })); }}
                            rows={3}
                        />
                    </Card>

                    <Card className="sr-card">
                        <h3 className="sr-section-title"><BookOpen size={18} /> Consciousness Refinement</h3>
                        <textarea
                            className="sr-premium-textarea"
                            placeholder="Synthesize today's lessons into a core realization..."
                            value={form.notes}
                            onChange={e => { setSaved(false); setForm(prev => ({ ...prev, notes: e.target.value })); }}
                            rows={4}
                        />
                    </Card>

                    <button className={`sr-persist-btn ${saved ? 'is-verified' : ''}`} onClick={saveEntry}>
                        {saved ? <><CheckCircle size={20} /> SYNCHRONIZED</> : <><Target size={20} /> UPLOAD LOG</>}
                    </button>
                </div>
            )}

            {/* ── TAB 1: Virtues ── */}
            {tab === 1 && (
                <div className="sr-section animate-fade-in">
                    {reflections.length === 0 ? (
                        <div className="sr-void"><Activity size={48} /><p>Insufficient logs to map virtue progress.</p></div>
                    ) : (
                        <div className="sr-virtue-scaffold">
                            <div className="sr-growth-score-card sr-card">
                                <div className="sr-growth-info">
                                    <span className="sr-growth-title">Personal Growth Quotient</span>
                                    <span className="sr-growth-value">{totalVirtuePoints}<small>PTS</small></span>
                                </div>
                                <div className="sr-level-badge">
                                    <Flame size={14} className="sr-accent-crimson" />
                                    LEVEL {userLevel} ASCENDANT
                                </div>
                            </div>
                            
                            <Card className="sr-card" style={{ marginBottom: '24px' }}>
                                <h3 className="sr-section-title"><Target size={18} /> Discipline Milestones</h3>
                                <div className="sr-milestone-track">
                                    <div className="sr-milestone-line" />
                                    {[3, 7, 14, 30].map(m => (
                                        <div key={m} className={`sr-milestone-marker ${streak >= m ? 'achieved' : ''}`}>
                                            <div className="sr-milestone-circle">{m}</div>
                                            <span className="sr-milestone-label">{m} Days</span>
                                        </div>
                                    ))}
                                </div>
                            </Card>

                            {virtueProgress.map(({ sin, virtue, pct }) => (
                                <Card key={sin} className="sr-card sr-virtue-scaffold-item">
                                    <div className="sr-scaffold-header">
                                        <div className="sr-scaffold-title">
                                            <span className="sr-scaffold-sin-icon">{SIN_ICONS[sin]}</span>
                                            <span className="sr-scaffold-divider">→</span>
                                            <span className="sr-scaffold-virtue-icon" style={{ color: getScoreColor(pct) }}>{VIRTUE_ICONS[virtue]}</span>
                                            <span className="sr-scaffold-virtue-name">{virtue}</span>
                                        </div>
                                        <span className="sr-scaffold-pct" style={{ color: getScoreColor(pct) }}>{pct}%</span>
                                    </div>
                                    <div className="sr-scaffold-bar-track">
                                        <div className="sr-scaffold-bar-fill" style={{ width: `${pct}%`, background: getScoreColor(pct) }} />
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── TAB 2: Analytics ── */}
            {tab === 2 && (
                <div className="sr-section animate-fade-in">
                    {reflections.length === 0 ? (
                        <div className="sr-void"><BarChart3 size={48} /><p>Intelligence requires data inputs.</p></div>
                    ) : (
                        <>
                            <Card className="sr-card">
                                <h3 className="sr-section-title"><TrendingUp size={18} className="sr-accent-crimson" /> Discipline Trend (30D)</h3>
                                <ResponsiveContainer width="100%" height={200}>
                                    <AreaChart data={last30.filter(d=>d.hasData)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                        <XAxis dataKey="date" hide />
                                        <YAxis domain={[0, 100]} hide />
                                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(239, 68, 68, 0.05)' }} />
                                        <Area type="monotone" dataKey="score" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorScore)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </Card>

                            <Card className="sr-card sr-heatmap-card">
                                <h3 className="sr-section-title"><Activity size={18} /> Daily Resonance Heatmap</h3>
                                <div className="sr-spectrum-grid">
                                    {last30.map((d, i) => (
                                        <div
                                            key={i}
                                            className="sr-spectrum-cell"
                                            title={d.hasData ? `${d.date}: ${d.score}/100` : `${d.date}: Offline`}
                                            style={{
                                                background: d.hasData
                                                    ? getScoreColor(d.score)
                                                    : 'rgba(255,255,255,0.03)',
                                                opacity: d.hasData ? 0.6 : 1
                                            }}
                                        />
                                    ))}
                                </div>
                            </Card>

                            <Card className="sr-card">
                                <h3 className="sr-section-title"><AlertTriangle size={18} /> Entropy Vector Analysis</h3>
                                <ResponsiveContainer width="100%" height={240}>
                                    <BarChart data={sinFrequency} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" horizontal={false} />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="sin" type="category" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
                                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(248, 113, 113, 0.05)' }} />
                                        <Bar dataKey="count" fill="#f87171" radius={[0, 100, 100, 0]} barSize={20} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </Card>

                            <Card className="sr-card">
                                <h3 className="sr-section-title"><Star size={18} className="sr-accent-gold" /> Virtue Accumulation</h3>
                                <div className="sr-mini-virtue-box">
                                    {virtueProgress.map(v => (
                                        <div key={v.sin} className="sr-mini-virtue-row">
                                            <span className="sr-mini-virtue-label">{v.virtue}</span>
                                            <div className="sr-mini-virtue-track">
                                                <div className="sr-mini-virtue-fill" style={{ width: `${v.pct}%`, background: getScoreColor(v.pct) }} />
                                            </div>
                                            <span className="sr-mini-virtue-val">{v.pct}%</span>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        </>
                    )}
                </div>
            )}

            {/* ── TAB 3: Intelligence Feed ── */}
            {tab === 3 && (
                <div className="sr-section animate-fade-in">
                    <div className="sr-intelligence-hero">
                        <div className="sr-intel-ring shadow-glow">
                            <Activity size={40} className="sr-intel-icon" />
                        </div>
                        <h2 className="sr-intel-title">Moral Interface Engine</h2>
                        <p className="sr-intel-subtitle">Synthesizing behavioral vectors into character insights</p>
                    </div>

                    <div className="sr-intel-feed">
                        {recommendations.map((r, i) => (
                            <div key={i} className={`sr-intel-card type-${r.type}`}>
                                <div className="sr-intel-marker"></div>
                                <div className="sr-intel-body">
                                    <div className="sr-intel-header">
                                        <div className="sr-intel-icon-box">{r.icon}</div>
                                        <div className="sr-intel-badge">{r.type.toUpperCase()}</div>
                                    </div>
                                    <p className="sr-intel-text">{r.text}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
