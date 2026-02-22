import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Target, Plus, Trash2, ChevronDown, ChevronUp, Link2 } from 'lucide-react';
import Card from '../components/Card';
import { goalAPI, routineAPI, studyAPI } from '../utils/api';
import './Goals.css';

export default function Goals() {
    const navigate = useNavigate();
    const [goals, setGoals] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        title: '',
        type: 'short-term',
        deadline: '',
        linkedItems: []
    });
    const [routines, setRoutines] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [expandedGoal, setExpandedGoal] = useState(null);
    const [localProgress, setLocalProgress] = useState({}); // Buffer for smooth slider dragging

    useEffect(() => {
        loadGoals();
        loadLinkableItems();
    }, []);

    const loadGoals = async () => {
        try {
            const res = await goalAPI.getAll();
            setGoals(res.data);
        } catch (err) {
            console.error('Error loading goals:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadLinkableItems = async () => {
        try {
            const [rRes, sRes] = await Promise.all([
                routineAPI.getAll(1, 1000),
                studyAPI.getAll()
            ]);
            // Handle paginated response structure { data: [], ... }
            const routinesData = rRes.data.data || rRes.data.items || (Array.isArray(rRes.data) ? rRes.data : []);
            setRoutines(routinesData);

            const studyData = sRes.data.items || sRes.data || []; // Study API might return array directly or items
            setSubjects(Array.isArray(studyData) ? studyData : (studyData.data || []));
        } catch (err) {
            console.error(err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.title.trim()) return;

        // Sanitize payload
        const payload = {
            ...formData,
            deadline: formData.deadline ? formData.deadline : null
        };

        try {
            await goalAPI.create(payload);
            setFormData({ title: '', type: 'short-term', deadline: '', linkedItems: [] });
            setShowForm(false);
            loadGoals();
            // Optional: User feedback could be better here, but focusing on functional fix first
        } catch (err) {
            console.error(err);
            alert('Failed to create goal. Please try again.');
        }
    };

    const deleteGoal = async (id) => {
        try {
            await goalAPI.delete(id);
            loadGoals();
        } catch (err) {
            console.error(err);
        }
    };

    const updateStatus = async (id, status) => {
        try {
            await goalAPI.update(id, { status });
            loadGoals();
        } catch (err) {
            console.error(err);
        }
    };

    const updateProgress = async (id, progress) => {
        try {
            await goalAPI.update(id, { progress: parseInt(progress) });
            loadGoals();
        } catch (err) {
            console.error(err);
        }
    };

    const toggleLinkedItem = (itemType, itemId, label) => {
        setFormData(prev => {
            const exists = prev.linkedItems.find(l => l.itemId === itemId);
            if (exists) {
                return { ...prev, linkedItems: prev.linkedItems.filter(l => l.itemId !== itemId) };
            }
            return { ...prev, linkedItems: [...prev.linkedItems, { itemType, itemId, label }] };
        });
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'on-track': return '#10b981';
            case 'behind': return '#ef4444';
            case 'completed': return '#3b82f6';
            default: return '#64748b';
        }
    };

    return (
        <div className="goals-page">
            <button className="back-btn" onClick={() => navigate('/')}>
                <ArrowLeft size={20} />
                <span>Back</span>
            </button>

            <h1 className="module-title text-gradient">Goal Tracker</h1>

            <button className="add-button" onClick={() => setShowForm(!showForm)}>
                <Plus size={18} />
                {showForm ? 'Cancel' : 'Add Goal'}
            </button>

            {showForm && (
                <Card className="goal-form-card">
                    <form onSubmit={handleSubmit}>
                        <input
                            type="text"
                            placeholder="Goal title..."
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="goal-input"
                        />
                        <div className="form-row">
                            <select
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                className="goal-select"
                            >
                                <option value="short-term">Short-term</option>
                                <option value="long-term">Long-term</option>
                            </select>
                            <input
                                type="date"
                                value={formData.deadline}
                                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                                className="goal-date"
                                placeholder="Deadline (optional)"
                            />
                        </div>

                        {(routines.length > 0 || subjects.length > 0) && (
                            <div className="link-section">
                                <p className="link-label"><Link2 size={14} /> Link to:</p>
                                <div className="linkable-chips">
                                    {routines.map(r => (
                                        <button
                                            key={r._id}
                                            type="button"
                                            className={`link-chip ${formData.linkedItems.find(l => l.itemId === r._id) ? 'active' : ''}`}
                                            onClick={() => toggleLinkedItem('routine', r._id, r.title || r.name)}
                                        >
                                            {r.title || r.name}
                                        </button>
                                    ))}
                                    {subjects.filter(s => !s.parentId).map(s => (
                                        <button
                                            key={s._id}
                                            type="button"
                                            className={`link-chip ${formData.linkedItems.find(l => l.itemId === s._id) ? 'active' : ''}`}
                                            onClick={() => toggleLinkedItem('study', s._id, s.title || s.name)}
                                        >
                                            {s.title || s.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <button type="submit" className="submit-btn">Create Goal</button>
                    </form>
                </Card>
            )}

            {loading ? (
                <div className="loading-state">Loading goals...</div>
            ) : goals.length === 0 ? (
                <div className="empty-state">
                    <Target size={48} />
                    <p>No goals yet. Create one to start tracking!</p>
                </div>
            ) : (
                <div className="goals-list">
                    {goals.map(goal => (
                        <Card key={goal._id} className="goal-card" onClick={() => setExpandedGoal(expandedGoal === goal._id ? null : goal._id)}>
                            <div className="goal-header-row">
                                <div className="goal-info">
                                    <h3>{goal.title}</h3>
                                    <div className="goal-meta">
                                        <span className="goal-type-badge">{goal.type}</span>
                                        <span className="goal-status-badge" style={{ color: getStatusColor(goal.status) }}>
                                            {goal.status.replace('-', ' ')}
                                        </span>
                                    </div>
                                </div>
                                <div className="goal-right">
                                    <span className="goal-progress-text">{goal.progress}%</span>
                                    {expandedGoal === goal._id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                </div>
                            </div>

                            <button
                                className="delete-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    deleteGoal(goal._id);
                                }}
                            >
                                <Trash2 size={18} />
                            </button>

                            <div className="progress-bar-track">
                                <div
                                    className="progress-bar-fill"
                                    style={{ width: `${Math.min(100, Math.max(0, goal.progress))}%`, background: getStatusColor(goal.status) }}
                                />
                            </div>

                            {expandedGoal === goal._id && (
                                <div className="goal-expanded" onClick={(e) => e.stopPropagation()}>
                                    {goal.deadline && (
                                        <p className="goal-deadline">Deadline: {new Date(goal.deadline).toLocaleDateString()}</p>
                                    )}
                                    {goal.linkedItems?.length > 0 && (
                                        <div className="goal-links">
                                            <span className="link-label-small">Linked:</span>
                                            {goal.linkedItems.map((l, i) => (
                                                <span key={i} className="linked-badge">{l.label || l.itemType}</span>
                                            ))}
                                        </div>
                                    )}
                                    <div className="goal-actions">
                                        <label className="progress-label">
                                            Progress:
                                            {(() => {
                                                const currentVal = localProgress[goal._id] !== undefined ? localProgress[goal._id] : Math.min(100, Math.max(0, goal.progress));
                                                return (
                                                    <div className="slider-wrapper">
                                                        <input
                                                            type="range"
                                                            min="0"
                                                            max="100"
                                                            value={currentVal}
                                                            onChange={(e) => setLocalProgress({ ...localProgress, [goal._id]: e.target.value })}
                                                            onMouseUp={() => {
                                                                if (localProgress[goal._id] !== undefined) {
                                                                    updateProgress(goal._id, localProgress[goal._id]);
                                                                    const newLocal = { ...localProgress };
                                                                    delete newLocal[goal._id];
                                                                    setLocalProgress(newLocal);
                                                                }
                                                            }}
                                                            onTouchEnd={() => {
                                                                if (localProgress[goal._id] !== undefined) {
                                                                    updateProgress(goal._id, localProgress[goal._id]);
                                                                    const newLocal = { ...localProgress };
                                                                    delete newLocal[goal._id];
                                                                    setLocalProgress(newLocal);
                                                                }
                                                            }}
                                                            className="progress-slider"
                                                            style={{
                                                                backgroundSize: currentVal <= 0 ? '0% 100%' : `calc(${currentVal}% + ${10 - currentVal * 0.2}px) 100%`,
                                                                backgroundImage: `linear-gradient(#3b82f6, #3b82f6)`,
                                                                backgroundRepeat: 'no-repeat'
                                                            }}
                                                        />
                                                    </div>
                                                );
                                            })()}
                                        </label>
                                        <div className="status-buttons">
                                            {['on-track', 'behind', 'completed'].map(s => (
                                                <button
                                                    key={s}
                                                    className={`status-btn ${goal.status === s ? 'active' : ''}`}
                                                    style={{ borderColor: getStatusColor(s) }}
                                                    onClick={() => updateStatus(goal._id, s)}
                                                >
                                                    {s.replace('-', ' ')}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
