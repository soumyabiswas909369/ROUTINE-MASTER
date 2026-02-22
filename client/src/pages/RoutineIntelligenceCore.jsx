import React, { useEffect, useState, useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { Brain, Cpu, ArrowLeft, Target, Timer, Flame, Clock, BookOpen, FileText, DollarSign, CheckSquare, TriangleAlert, Bell, CalendarIcon, Loader2, Sparkles, Search, ChevronRight, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { intelligenceAPI } from '../utils/api';
import './RoutineIntelligenceCore.css';

const ModuleIcons = {
    'Time': { icon: Clock, color: '#3b82f6', route: '/time-analytics' },
    'Goals': { icon: Target, color: '#a855f7', route: '/goals' },
    'Focus': { icon: Timer, color: '#0ea5e9', route: '/focus' },
    'Habits': { icon: Flame, color: '#3b82f6', route: '/habits' },
    'Attendance': { icon: CheckSquare, color: '#10b981', route: '/attendance' },
    'Routines': { icon: CalendarIcon, color: '#f59e0b', route: '/routines' },
    'Study': { icon: BookOpen, color: '#f97316', route: '/study' }
};

// Extracted AI components mapper for recommendations
const IconDictionary = {
    Brain, Cpu, Target, Timer, Flame, Clock, BookOpen, CheckSquare, Sparkles
};

// AISummary is now a pure presentational component that receives dynamicAI
const AISummary = ({ currentMetrics, initialLayer, dynamicAI, loadingAI, initialModel }) => {
    const [showInsights, setShowInsights] = useState(false);
    const [chatMessages, setChatMessages] = useState([]);
    const [userMessage, setUserMessage] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [currentModel, setCurrentModel] = useState(initialModel || 'Master AI');
    const chatEndRef = useRef(null);
    const scrollContainerRef = useRef(null);

    const synthesisText = dynamicAI ? dynamicAI.AISynthesis : initialLayer.humanReadableSummary;
    const causalText = dynamicAI ? dynamicAI.CausalChain : (initialLayer.causeEffectChains && initialLayer.causeEffectChains[0]);

    useEffect(() => {
        if (initialModel) setCurrentModel(initialModel);
    }, [initialModel]);

    const scrollToBottom = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
    };

    useEffect(() => {
        if (showInsights) scrollToBottom();
    }, [chatMessages, showInsights]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!userMessage.trim() || isThinking) return;

        const newMessage = { role: 'user', text: userMessage };
        setChatMessages(prev => [...prev, newMessage]);
        setUserMessage('');
        setIsThinking(true);

        try {
            const res = await intelligenceAPI.chat(userMessage, currentMetrics);
            const { reply, modelInfo } = res.data;
            setChatMessages(prev => [...prev, { role: 'ai', text: reply }]);
            if (modelInfo) setCurrentModel(modelInfo);
        } catch (error) {
            setChatMessages(prev => [...prev, { role: 'ai', text: "I'm having a little brain fog right now, friend. Could you try asking again?" }]);
        } finally {
            setIsThinking(false);
        }
    };

    return (
        <div className="ai-summary-content friendly-mentor">
            <div className="summary-item positive" style={{ border: '1px solid rgba(168, 85, 247, 0.2)', background: 'rgba(168, 85, 247, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Cpu size={16} className="text-purple-400" /> System Mastery Engaged
                </div>
                <span style={{ fontSize: '0.65rem', opacity: 0.6, fontWeight: 500 }}>{currentModel.split('/').pop()}</span>
            </div>

            <div className="bullet-insights-container" style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {dynamicAI && dynamicAI.BulletInsights ? dynamicAI.BulletInsights.map((bullet, i) => (
                    <div key={i} className="summary-item animate-fade-in" style={{ fontSize: '0.8rem', padding: '0.6rem 0.8rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <Sparkles size={12} className="text-blue-400" /> {bullet}
                    </div>
                )) : (
                    <>
                        {currentMetrics.consistency > 75 ? (
                            <div className="summary-item positive"><span className="dot bg-blue-500"></span> Your habits are looking super strong!</div>
                        ) : (
                            <div className="summary-item warning"><TriangleAlert size={16} /> Habits are slightly slipping, friend.</div>
                        )}
                        {currentMetrics.studyLoad > 80 ? (
                            <div className="summary-item warning"><TriangleAlert size={16} /> Careful, you're loading up a bit much.</div>
                        ) : (
                            <div className="summary-item positive"><span className="dot bg-green-500"></span> Your workload is in the sweet spot.</div>
                        )}
                    </>
                )}
            </div>

            <div className="brain-graphic-small" style={{ margin: '1.5rem 0' }}>
                <Cpu size={80} className="text-purple-400 mentor-brain-icon" style={{ filter: 'drop-shadow(0 0 20px rgba(168, 85, 247, 0.4))' }} />
            </div>

            {showInsights && (
                <div className="insights-expansion animate-fade-in chat-bubble" style={{ maxHeight: '400px', display: 'flex', flexDirection: 'column' }}>
                    <div ref={scrollContainerRef} style={{ flexGrow: 1, overflowY: 'auto', paddingRight: '5px', marginBottom: '10px', scrollBehavior: 'smooth' }} className="custom-scrollbar">
                        {loadingAI ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#a855f7', padding: '10px' }}>
                                <Loader2 className="animate-spin" size={18} /> Just thinking for a second...
                            </div>
                        ) : (
                            <div className="mentor-narrative">
                                <div className="narrative-section">
                                    <label>Master Synthesis</label>
                                    <p>{synthesisText}</p>
                                </div>
                                <div className="narrative-section" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px', marginBottom: '1rem' }}>
                                    <label style={{ color: '#fca5a5' }}>Quick Logic Check</label>
                                    <p style={{ color: '#fca5a5' }}>{causalText}</p>
                                </div>
                            </div>
                        )}

                        {chatMessages.map((msg, idx) => (
                            <div key={idx} className={`chat-msg ${msg.role}`} style={{
                                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                background: msg.role === 'user' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(168, 85, 247, 0.1)',
                                border: msg.role === 'user' ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid rgba(168, 85, 247, 0.2)',
                                borderRadius: '12px',
                                padding: '10px 14px',
                                marginBottom: '10px',
                                fontSize: '0.85rem',
                                color: msg.role === 'user' ? '#fff' : '#e2e8f0',
                                maxWidth: '90%',
                                marginLeft: msg.role === 'user' ? 'auto' : '0'
                            }}>
                                {msg.text}
                            </div>
                        ))}
                        {isThinking && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#a855f7', fontSize: '0.85rem', padding: '5px' }}>
                                <Loader2 className="animate-spin" size={14} /> Consultant is typing...
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    <form onSubmit={handleSendMessage} style={{ position: 'relative', marginTop: 'auto' }}>
                        <input
                            type="text"
                            placeholder="Ask me anything..."
                            value={userMessage}
                            onChange={(e) => setUserMessage(e.target.value)}
                            style={{
                                width: '100%',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '12px',
                                padding: '10px 40px 10px 12px',
                                color: '#fff',
                                outline: 'none',
                                fontSize: '0.85rem'
                            }}
                        />
                        <button type="submit" disabled={isThinking} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#a855f7', cursor: 'pointer', padding: '5px' }}>
                            <Send size={18} />
                        </button>
                    </form>
                </div>
            )}

            <button className="insights-btn friendly-btn" onClick={() => setShowInsights(!showInsights)} style={{ marginTop: '1rem' }}>
                {showInsights ? 'Close Consultant' : 'Consult with AI >'}
            </button>
        </div>
    );
};

export default function RoutineIntelligenceCore() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [timeframe, setTimeframe] = useState('This Week');
    const [expandedRec, setExpandedRec] = useState(null);
    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Manage dynamic LLM data globally for the dashboard
    const [dynamicAI, setDynamicAI] = useState(null);
    const [loadingAI, setLoadingAI] = useState(false);
    const [activeModel, setActiveModel] = useState('N/A');
    const [narrativeTab, setNarrativeTab] = useState('weekly');

    const navigate = useNavigate();

    useEffect(() => {
        const loadCoreData = async () => {
            try {
                // 1. Fetch the static dashboard baseline numbers first
                const res = await intelligenceAPI.getCore();
                setData(res.data);
                if (res.data.modelInfo) setActiveModel(res.data.modelInfo);

                // 2. Fetch the dynamic LLM content immediately after
                setLoadingAI(true);
                const aiMetrics = { ...res.data.metrics };
                delete aiMetrics.financial;

                intelligenceAPI.generateAI(aiMetrics)
                    .then(aiRes => {
                        setDynamicAI(aiRes.data);
                        if (aiRes.data.modelInfo) setActiveModel(aiRes.data.modelInfo);
                    })
                    .catch(err => {
                        console.error("Failed to generate AI:", err);
                    })
                    .finally(() => {
                        setLoadingAI(false);
                    });

            } catch (error) {
                console.error("Error loading intelligence core:", error);
            } finally {
                setLoading(false);
            }
        };
        loadCoreData();
    }, []);

    if (loading) {
        return (
            <div className="ric-core-loader">
                <Loader2 className="animate-spin" size={48} color="#a855f7" />
                <p>Initializing Master Analytics...</p>
            </div>
        );
    }

    if (!data) {
        return <div className="ric-core-loader">System Offline. Failed to connect to Master Brain.</div>;
    }

    // Prepare Sparkline data for Flanks
    const consistencyData = [{ v: 40 }, { v: 60 }, { v: data.metrics.consistency }];
    const focusData = [{ v: 50 }, { v: 70 }, { v: data.metrics.focus }];

    // Determine which recommendations to use: Real LLM data vs rule-based fallback
    const activeRecommendations = dynamicAI && dynamicAI.Recommendations && dynamicAI.Recommendations.length > 0
        ? dynamicAI.Recommendations
        : data.aiLayer.recommendations;

    return (
        <div className="ric-core-page animate-fade-in">

            {/* Header */}
            <header className="ric-core-topbar">
                <button onClick={() => navigate(-1)} className="back-btn"><ArrowLeft size={24} /></button>
                <div className="core-title-container animate-fade-in" style={{ flexWrap: 'nowrap', minWidth: 0 }}>
                    <h1 className="module-title text-gradient" style={{ margin: 0, fontSize: '28px', fontWeight: 800, lineHeight: 1.1, whiteSpace: 'normal', wordBreak: 'break-word' }}>Routine Intelligence</h1>
                    <span className="badge" style={{ fontSize: '0.85rem', padding: '4px 10px', whiteSpace: 'nowrap', flexShrink: 0 }}>Core</span>
                </div>
                <div className="top-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {isSearching ? (
                        <div className="search-bar animate-fade-in" style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.1)', borderRadius: '20px', padding: '6px 14px', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
                            <Search size={16} className="text-gray-400" />
                            <input
                                autoFocus
                                type="text"
                                placeholder="Search queries..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onBlur={() => !searchQuery && setIsSearching(false)}
                                style={{ background: 'transparent', border: 'none', color: '#fff', outline: 'none', marginLeft: '8px', fontSize: '0.9rem', width: '130px', padding: 0 }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        setIsSearching(false);
                                        setSearchQuery('');
                                    }
                                }}
                            />
                        </div>
                    ) : (
                        <button className="icon-btn" onClick={() => setIsSearching(true)}>
                            <Search size={20} />
                        </button>
                    )}
                </div>
            </header>

            <div className="ric-core-grid">

                {/* LEFT COLUMN - Main Analytics */}
                <div className="left-column">

                    {/* Master Health Widget */}
                    <div className="ric-panel health-panel cinematic-neon">
                        <div className="health-header" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                            <div className="dynamic-branding-tag" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', padding: '4px 12px', borderRadius: '30px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', display: 'inline-block', marginBottom: '0.5rem', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                                {dynamicAI ? dynamicAI.PriorityLabel : "SYSTEM SCAN"}
                            </div>
                            <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#fff', textShadow: '0 0 15px rgba(255,255,255,0.3)', marginBottom: '0.25rem' }}>
                                {dynamicAI ? dynamicAI.DynamicTitle : "Steady Engine"}
                            </h2>
                            <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Routine Vital Correlation</p>
                        </div>

                        <div className="health-dial-container">
                            <div className="health-dial-glow" style={{ background: data.globalScore > 70 ? 'radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, transparent 70%)' }}></div>
                            <div className="health-dial">
                                <svg viewBox="0 0 100 100">
                                    <defs>
                                        <linearGradient id="score-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stopColor={data.globalScore > 70 ? "#10b981" : "#3b82f6"} />
                                            <stop offset="50%" stopColor="#8b5cf6" />
                                            <stop offset="100%" stopColor={data.globalScore > 70 ? "#3b82f6" : "#f59e0b"} />
                                        </linearGradient>
                                    </defs>
                                    <circle className="dial-bg" cx="50" cy="50" r="45" stroke="rgba(255,255,255,0.05)" strokeWidth="4" fill="none" />
                                    <circle className="dial-fg" cx="50" cy="50" r="45" stroke="url(#score-grad)" strokeWidth="6" fill="none" strokeDasharray="283" strokeDashoffset={`${283 - (data.globalScore / 100) * 283}`} strokeLinecap="round" transform="rotate(-90 50 50)" />
                                </svg>
                                <div className="dial-content">
                                    <div className="score-num">{data.globalScore}</div>
                                    <div className="score-label" style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Health%</div>
                                </div>
                            </div>
                        </div>

                        {/* Flanking Metrics */}
                        <div className="health-flanks">
                            <div className="flank">
                                <span className="title">Consistency</span>
                                <span className="value" style={{ color: '#60a5fa' }}>{data.metrics.consistency}%</span>
                                <div style={{ height: '30px', width: '100%', marginTop: '5px' }}>
                                    <ResponsiveContainer>
                                        <AreaChart data={consistencyData}>
                                            <defs><linearGradient id="gf1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#60a5fa" stopOpacity={0.5} /><stop offset="100%" stopColor="#60a5fa" stopOpacity={0} /></linearGradient></defs>
                                            <Area type="monotone" dataKey="v" stroke="#60a5fa" fill="url(#gf1)" strokeWidth={2} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="flank">
                                <span className="title right">Focus Energy</span>
                                <span className="value right" style={{ color: '#a78bfa' }}>{data.metrics.focus}%</span>
                                <div style={{ height: '30px', width: '100%', marginTop: '5px' }}>
                                    <ResponsiveContainer>
                                        <AreaChart data={focusData}>
                                            <defs><linearGradient id="gf2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a78bfa" stopOpacity={0.5} /><stop offset="100%" stopColor="#a78bfa" stopOpacity={0} /></linearGradient></defs>
                                            <Area type="monotone" dataKey="v" stroke="#a78bfa" fill="url(#gf2)" strokeWidth={2} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Module Status Grid */}
                    <div className="ric-panel module-grid-panel">
                        <div className="panel-header">
                            <div className="panel-title" style={{ marginBottom: 0 }}>Module Status</div>
                            <span className="dropdown" onClick={() => setTimeframe(t => t === 'This Week' ? 'This Month' : (t === 'This Month' ? 'All Time' : 'This Week'))} style={{ cursor: 'pointer', transition: 'all 0.2s' }}>
                                {timeframe} <ChevronRight size={14} style={{ transform: timeframe !== 'This Week' ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                            </span>
                        </div>
                        <div className="modules-grid-container">
                            {data.charts.modulePerformance.map((mod, i) => {
                                const Meta = ModuleIcons[mod.name] || ModuleIcons['Focus'];
                                const Icon = Meta.icon;
                                return (
                                    <div key={i} className="module-micro-card" onClick={() => navigate(Meta.route || '/')} style={{ cursor: 'pointer' }}>
                                        <div className="mod-head">
                                            <Icon size={20} className="mod-icon" style={{ color: Meta.color, filter: `drop-shadow(0 0 5px ${Meta.color})` }} />
                                            <span>{mod.name}</span>
                                        </div>
                                        <div className="mod-score">{mod.score}%</div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Performance & Failure Row */}
                    <div className="perf-failure-row">
                        {/* Performance Overview (Line Chart) */}
                        <div className="ric-panel perf-panel">
                            <div className="panel-title">Performance Overview</div>
                            <div className="chart-legends">
                                <span className="leg focus"><span className="b dot"></span> Focus</span>
                                <span className="leg load"><span className="c dot"></span> Load</span>
                                <span className="leg study"><span className="o dot"></span> Study</span>
                            </div>
                            <div className="chart-container" style={{ height: '220px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={data.charts.performanceData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="gFocus" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} /><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} /></linearGradient>
                                            <linearGradient id="gLoad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4} /><stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} /></linearGradient>
                                            <linearGradient id="gStudy" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} width={45} />

                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'rgba(10, 5, 20, 0.9)', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: '12px', color: '#f8fafc' }}
                                            itemStyle={{ color: '#e2e8f0', fontSize: '0.85rem' }}
                                            labelStyle={{ color: '#94a3b8', marginBottom: '4px', fontSize: '0.9rem', fontWeight: 600 }}
                                        />

                                        <Area type="monotone" dataKey="focus" stroke="#8b5cf6" fill="url(#gFocus)" strokeWidth={3} activeDot={{ r: 6, fill: '#fff', stroke: '#8b5cf6', strokeWidth: 2 }} dot={false} />
                                        <Area type="monotone" dataKey="load" stroke="#0ea5e9" fill="url(#gLoad)" strokeWidth={3} activeDot={{ r: 6, fill: '#fff', stroke: '#0ea5e9', strokeWidth: 2 }} dot={false} />
                                        <Area type="monotone" dataKey="study" stroke="#3b82f6" fill="url(#gStudy)" strokeWidth={3} activeDot={{ r: 6, fill: '#fff', stroke: '#3b82f6', strokeWidth: 2 }} dot={false} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Domain Strengths (Pie Chart) */}
                        <div className="ric-panel failure-panel">
                            <div className="panel-title">Domain Strengths</div>
                            <div className="pie-container flex-col-center">
                                <div style={{ width: '100%', height: '160px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Tooltip
                                                contentStyle={{ backgroundColor: 'rgba(10, 5, 20, 0.9)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', color: '#f8fafc' }}
                                                itemStyle={{ color: '#fff', fontSize: '0.85rem' }}
                                            />
                                            <Pie data={data.charts.performanceDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value" stroke="none">
                                                {data.charts.performanceDistribution.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                                ))}
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="pie-center-text">This<br />Week</div>
                                </div>
                                <div className="pie-legends">
                                    {data.charts.performanceDistribution.map((entry, i) => (
                                        <div key={i} className="pie-leg">
                                            <span className="dot" style={{ backgroundColor: entry.fill, boxShadow: `0 0 8px ${entry.fill}` }}></span>
                                            <span className="name">{entry.name}</span>
                                            <span className="val">{entry.value}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN - Sidebar */}
                <div className="right-column">

                    {/* AI Periodic Narrative */}
                    <div className="ric-panel narrative-panel glass-panel">
                        <div className="panel-header" style={{ marginBottom: '1rem' }}>
                            <div className="panel-title" style={{ marginBottom: 0, fontSize: '1rem' }}>The Periodic Recap</div>
                        </div>
                        <div className="narrative-content">
                            <div className="narrative-tab-container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '1.25rem' }}>
                                <div
                                    className={`narrative-tab ${narrativeTab === 'weekly' ? 'active' : ''}`}
                                    onClick={() => setNarrativeTab('weekly')}
                                    style={{
                                        padding: '8px',
                                        textAlign: 'center',
                                        borderRadius: '8px',
                                        background: narrativeTab === 'weekly' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                                        border: narrativeTab === 'weekly' ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(255, 255, 255, 0.05)',
                                        fontSize: '0.8rem',
                                        fontWeight: 600,
                                        color: narrativeTab === 'weekly' ? '#60a5fa' : '#94a3b8',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Weekly Recap
                                </div>
                                <div
                                    className={`narrative-tab ${narrativeTab === 'monthly' ? 'active' : ''}`}
                                    onClick={() => setNarrativeTab('monthly')}
                                    style={{
                                        padding: '8px',
                                        textAlign: 'center',
                                        borderRadius: '8px',
                                        background: narrativeTab === 'monthly' ? 'rgba(168, 85, 247, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                                        border: narrativeTab === 'monthly' ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid rgba(255, 255, 255, 0.05)',
                                        fontSize: '0.8rem',
                                        fontWeight: 600,
                                        color: narrativeTab === 'monthly' ? '#a855f7' : '#94a3b8',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Monthly Outlook
                                </div>
                            </div>
                            <div className="narrative-text animate-fade-in" style={{ padding: '15px', borderRadius: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', lineHeight: 1.6, fontSize: '0.9rem', color: '#cbd5e1', minHeight: '80px' }}>
                                {loadingAI ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#a855f7' }}>
                                        <Loader2 className="animate-spin" size={16} /> Reading your patterns...
                                    </div>
                                ) : (
                                    dynamicAI ? (narrativeTab === 'weekly' ? dynamicAI.WeeklySummary : dynamicAI.MonthlyOutlook) : "You've been sticking to the plan well! Keep that momentum high."
                                )}
                            </div>
                        </div>
                    </div>

                    {/* AI Summary Sidebar */}
                    <div className="ric-panel ai-summary-panel">
                        <div className="panel-title">AI Summary</div>
                        <AISummary currentMetrics={data.metrics} initialLayer={data.aiLayer} dynamicAI={dynamicAI} loadingAI={loadingAI} initialModel={activeModel} />
                    </div>

                </div>

                {/* AI Recommendations */}
                <div className="ric-panel ai-recs-panel">
                    <div className="panel-title" style={{ display: 'flex', alignItems: 'center' }}>
                        AI Recommendations
                        {loadingAI && <Loader2 className="animate-spin" size={16} style={{ marginLeft: '10px', color: '#a855f7' }} />}
                    </div>
                    <div className="recs-list">
                        {activeRecommendations.map((rec, i) => {
                            const RecIcon = IconDictionary[rec.icon] || Sparkles;

                            return (
                                <div key={i} className="rec-item" style={{ flexDirection: 'column', alignItems: 'stretch', cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setExpandedRec(expandedRec === i ? null : i)}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', width: '100%' }}>
                                        <div className="rec-icon"><RecIcon size={20} className="text-purple-400" /></div>
                                        <div className="rec-info">
                                            <div className="title">{rec.title}</div>
                                            <div className="impact-bar-container">
                                                <div className="impact-text">Expected Impact +{rec.impact}%</div>
                                                <div className="impact-bar">
                                                    <div className="fill" style={{ width: `${Math.min(rec.impact * 4, 100)}%`, background: i === 0 ? '#10b981' : (i === 1 ? '#8b5cf6' : '#f59e0b') }}></div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="rec-arrow"><ChevronRight size={20} style={{ transform: expandedRec === i ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} /></div>
                                    </div>

                                    {expandedRec === i && (
                                        <div className="animate-fade-in" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem', color: '#94a3b8' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                                <span>Source:</span>
                                                <span style={{ fontWeight: 600, color: (rec.source === 'Gemini AI' ? '#a855f7' : '#3b82f6') }}>{rec.source || "Static Model"}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                <span>Risk Level:</span>
                                                <span style={{ fontWeight: 600, color: rec.risk === 'Low' ? '#10b981' : (rec.risk === 'Medium' ? '#f59e0b' : '#ef4444') }}>{rec.risk}</span>
                                            </div>
                                            <p style={{ lineHeight: 1.5 }}>{rec.action || "Action: Execute this adjustment carefully over the next 48 hours to secure the projected impact."}</p>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Predictions */}
                <div className="ric-panel predictions-panel cinematic-panel">
                    <div className="panel-title">Master Projections</div>
                    <div className="pred-stats">
                        {dynamicAI && dynamicAI.AIPredictions && dynamicAI.AIPredictions.length > 0 ? (
                            dynamicAI.AIPredictions.map((pred, idx) => (
                                <div key={idx} className={`p-stat ${pred.type.toLowerCase()}`}>
                                    <span className="label">{pred.label}</span>
                                    <span className="val">{pred.value}</span>
                                </div>
                            ))
                        ) : (
                            <>
                                <div className="p-stat warning">
                                    <span className="label">Risk Day</span>
                                    <span className="val">{data.predictions.nextRiskDay}</span>
                                </div>
                                <div className="p-stat alert">
                                    <span className="label">Burnout</span>
                                    <span className="val">{data.predictions.burnoutProbability}%</span>
                                </div>
                                <div className="p-stat safe">
                                    <span className="label">Stability</span>
                                    <span className="val">High</span>
                                </div>
                            </>
                        )}
                    </div>
                    {/* Smooth prediction curve line */}
                    <div className="pred-chart" style={{ height: '90px', marginTop: '15px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={[{ n: 1, v: 10 }, { n: 2, v: 25 }, { n: 3, v: 60 }, { n: 4, v: 85 }, { n: 5, v: 45 }, { n: 6, v: 20 }]}>
                                <defs>
                                    <linearGradient id="gPred" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f59e0b" stopOpacity={0.6} /><stop offset="100%" stopColor="#f59e0b" stopOpacity={0} /></linearGradient>
                                </defs>
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'rgba(10, 5, 20, 0.9)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '12px', color: '#f8fafc' }}
                                    itemStyle={{ color: '#f59e0b', fontSize: '0.85rem' }}
                                    labelStyle={{ display: 'none' }}
                                    formatter={(value) => [`${value}% Loss Risk`, '']}
                                />
                                <Area type="monotone" dataKey="v" stroke="#f59e0b" fill="url(#gPred)" strokeWidth={3} activeDot={{ r: 4, fill: '#fff' }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>
        </div>
    );
}