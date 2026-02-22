import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Timer, Play, Pause, RotateCcw, Flame, Coffee } from 'lucide-react';
import Card from '../components/Card';
import { focusAPI, routineAPI, studyAPI } from '../utils/api';
import './FocusMode.css';

export default function FocusMode() {
    const navigate = useNavigate();
    const [mode, setMode] = useState('idle'); // idle, running, paused, break, done
    const [sessionType, setSessionType] = useState('custom'); // custom, pomodoro
    const [duration, setDuration] = useState(25); // minutes
    const [timeLeft, setTimeLeft] = useState(25 * 60); // seconds
    const [sessions, setSessions] = useState([]);
    const [streak, setStreak] = useState(0);
    const [weeklyMinutes, setWeeklyMinutes] = useState(0);
    const [linkedTo, setLinkedTo] = useState(null);
    const [routines, setRoutines] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [pomodoroCount, setPomodoroCount] = useState(0);
    const intervalRef = useRef(null);

    useEffect(() => {
        loadData();
        return () => clearInterval(intervalRef.current);
    }, []);

    const loadData = async () => {
        try {
            const [focusRes, rRes, sRes] = await Promise.all([
                focusAPI.getAll(),
                routineAPI.getAll(1, 1000),
                studyAPI.getAll()
            ]);
            setSessions(focusRes.data);
            setStreak(focusRes.data.streak || 0);
            setWeeklyMinutes(focusRes.data.weeklyMinutes || 0);

            // Handle paginated response { data: [], ... }
            const routinesData = rRes.data.data || rRes.data.items || (Array.isArray(rRes.data) ? rRes.data : []);
            setRoutines(routinesData);

            // Study API might return array directly or items
            const studyData = sRes.data.items || sRes.data || [];
            setSubjects(Array.isArray(studyData) ? studyData : (studyData.data || []));
        } catch (err) {
            console.error(err);
        }
    };

    const startTimer = () => {
        setMode('running');
        intervalRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(intervalRef.current);
                    handleSessionComplete();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const pauseTimer = () => {
        clearInterval(intervalRef.current);
        setMode('paused');
    };

    const resumeTimer = () => {
        setMode('running');
        intervalRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(intervalRef.current);
                    handleSessionComplete();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const resetTimer = () => {
        clearInterval(intervalRef.current);
        setMode('idle');
        setTimeLeft(duration * 60);
        setPomodoroCount(0);
    };

    const handleSessionComplete = useCallback(async () => {
        try {
            await focusAPI.create({
                linkedTo: linkedTo || { itemType: 'custom', label: 'Free Focus' },
                duration,
                sessionType
            });

            if (sessionType === 'pomodoro') {
                const newCount = pomodoroCount + 1;
                setPomodoroCount(newCount);
                // After work, take a break
                if (newCount % 4 === 0) {
                    setTimeLeft(15 * 60); // Long break
                } else {
                    setTimeLeft(5 * 60); // Short break
                }
                setMode('break');
            } else {
                setMode('done');
            }

            loadData();
        } catch (err) {
            console.error(err);
            setMode('done');
        }
    }, [duration, linkedTo, pomodoroCount, sessionType]);

    const startBreakEnd = () => {
        setTimeLeft(25 * 60);
        setMode('idle');
    };

    const formatTime = (secs) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const progress = mode !== 'idle' ? ((duration * 60 - timeLeft) / (duration * 60)) * 100 : 0;

    return (
        <div className="focus-page">
            <button className="back-btn" onClick={() => navigate('/')}>
                <ArrowLeft size={20} />
                <span>Back</span>
            </button>

            <h1 className="module-title text-gradient">Focus Mode</h1>

            <div className="focus-stats-row">
                <Card className="focus-stat">
                    <Flame size={20} className="stat-icon" />
                    <span className="stat-num">{streak}</span>
                    <span className="stat-lbl">Day Streak</span>
                </Card>
                <Card className="focus-stat">
                    <Timer size={20} className="stat-icon" />
                    <span className="stat-num">{Math.round(weeklyMinutes / 60)}h {weeklyMinutes % 60}m</span>
                    <span className="stat-lbl">This Week</span>
                </Card>
            </div>

            <Card className="timer-card">
                {mode === 'idle' && (
                    <div className="timer-setup">
                        <div className="session-type-toggle">
                            <button
                                className={`type-btn ${sessionType === 'custom' ? 'active' : ''}`}
                                onClick={() => { setSessionType('custom'); setDuration(25); setTimeLeft(25 * 60); }}
                            >
                                Custom
                            </button>
                            <button
                                className={`type-btn ${sessionType === 'pomodoro' ? 'active' : ''}`}
                                onClick={() => { setSessionType('pomodoro'); setDuration(25); setTimeLeft(25 * 60); }}
                            >
                                🍅 Pomodoro
                            </button>
                        </div>

                        {sessionType === 'custom' && (
                            <div className="duration-picker">
                                {[15, 25, 30, 45, 60].map(m => (
                                    <button
                                        key={m}
                                        className={`dur-btn ${duration === m ? 'active' : ''}`}
                                        onClick={() => { setDuration(m); setTimeLeft(m * 60); }}
                                    >
                                        {m}m
                                    </button>
                                ))}
                            </div>
                        )}

                        {(routines.length > 0 || subjects.length > 0) && (
                            <div className="link-section">
                                <p className="link-hint">Link to (optional):</p>
                                <div className="linkable-items">
                                    {routines.slice(0, 5).map(r => (
                                        <button
                                            key={r._id}
                                            className={`link-pill ${linkedTo?.itemId === r._id ? 'active' : ''}`}
                                            onClick={() => setLinkedTo(linkedTo?.itemId === r._id ? null : { itemType: 'routine', itemId: r._id, label: r.title || r.name })}
                                        >
                                            {r.title || r.name}
                                        </button>
                                    ))}
                                    {subjects.filter(s => !s.parentId).slice(0, 5).map(s => (
                                        <button
                                            key={s._id}
                                            className={`link-pill ${linkedTo?.itemId === s._id ? 'active' : ''}`}
                                            onClick={() => setLinkedTo(linkedTo?.itemId === s._id ? null : { itemType: 'study', itemId: s._id, label: s.title || s.name })}
                                        >
                                            {s.title || s.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="timer-display">
                    <svg className="timer-ring" viewBox="0 0 200 200">
                        <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                        <circle
                            cx="100" cy="100" r="90" fill="none"
                            stroke="url(#timerGradient)"
                            strokeWidth="6"
                            strokeLinecap="round"
                            strokeDasharray={`${2 * Math.PI * 90}`}
                            strokeDashoffset={`${2 * Math.PI * 90 * (1 - progress / 100)}`}
                            transform="rotate(-90 100 100)"
                            style={{ transition: 'stroke-dashoffset 0.5s' }}
                        />
                        <defs>
                            <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#3b82f6" />
                                <stop offset="100%" stopColor="#2563eb" />
                            </linearGradient>
                        </defs>
                    </svg>
                    <div className="timer-text">
                        <span className="time">{formatTime(timeLeft)}</span>
                        {mode === 'break' && <span className="break-label"><Coffee size={16} /> Break</span>}
                        {sessionType === 'pomodoro' && pomodoroCount > 0 && (
                            <span className="pomo-count">🍅 ×{pomodoroCount}</span>
                        )}
                    </div>
                </div>

                <div className="timer-controls">
                    {mode === 'idle' && (
                        <button className="control-btn start" onClick={startTimer}>
                            <Play size={24} /> Start
                        </button>
                    )}
                    {mode === 'running' && (
                        <button className="control-btn pause" onClick={pauseTimer}>
                            <Pause size={24} /> Pause
                        </button>
                    )}
                    {mode === 'paused' && (
                        <>
                            <button className="control-btn start" onClick={resumeTimer}>
                                <Play size={24} /> Resume
                            </button>
                            <button className="control-btn reset" onClick={resetTimer}>
                                <RotateCcw size={20} />
                            </button>
                        </>
                    )}
                    {mode === 'break' && (
                        <button className="control-btn start" onClick={startBreakEnd}>
                            <Play size={24} /> Next Session
                        </button>
                    )}
                    {mode === 'done' && (
                        <button className="control-btn start" onClick={resetTimer}>
                            <RotateCcw size={20} /> New Session
                        </button>
                    )}
                </div>

                {mode === 'done' && (
                    <div className="done-message">
                        ✨ Session complete! Great focus.
                    </div>
                )}
            </Card>

            {sessions.length > 0 && (
                <div className="session-history">
                    <h2>Recent Sessions</h2>
                    {sessions.slice(0, 8).map((s, i) => (
                        <Card key={i} className="session-item">
                            <div className="session-info">
                                <span className="session-label">{s.linkedTo?.label || 'Free Focus'}</span>
                                <span className="session-type">{s.sessionType}</span>
                            </div>
                            <div className="session-meta">
                                <span>{s.duration}m</span>
                                <span className="session-date">{new Date(s.completedAt).toLocaleDateString()}</span>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
