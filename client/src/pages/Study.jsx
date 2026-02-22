import { useEffect, useState, useRef, useCallback } from 'react';
import { Plus, Trash2, BookOpen, ChevronRight, ChevronDown, CheckCircle2, Circle } from 'lucide-react';
import GravityContainer from '../components/GravityContainer';
import Card from '../components/Card';
import { studyAPI } from '../utils/api';
import './Study.css';

export default function Study() {
    const [items, setItems] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [expandedItems, setExpandedItems] = useState(new Set());
    const [savingItems, setSavingItems] = useState(new Set()); // Track items being saved
    const saveTimeoutRef = useRef({}); // Debounce refs for each item
    const [formData, setFormData] = useState({
        title: '',
        type: 'subject',
        parentId: null,
        notes: '',
        progress: 0
    });

    useEffect(() => {
        loadItems();
    }, []);

    const loadItems = async () => {
        try {
            const response = await studyAPI.getAll();
            setItems(response.data);
        } catch (error) {
            console.error('Error loading study items:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await studyAPI.create(formData);
            setShowForm(false);
            setFormData({
                title: '',
                type: 'subject',
                parentId: null,
                notes: '',
                progress: 0
            });
            // Update local state without refetching
            setItems(prev => [...prev, response.data]);
        } catch (error) {
            console.error('Error creating study item:', error);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this item?')) return;
        try {
            await studyAPI.delete(id);
            // Update local state without refetching
            setItems(prev => prev.filter(i => i._id !== id));
        } catch (error) {
            console.error('Error deleting study item:', error);
        }
    };

    const toggleComplete = async (item) => {
        try {
            // Optimistic update
            const updatedItem = { ...item, completed: !item.completed, progress: !item.completed ? 100 : 0 };
            setItems(prev => prev.map(i => i._id === item._id ? updatedItem : i));

            await studyAPI.update(item._id, {
                completed: !item.completed,
                progress: !item.completed ? 100 : 0
            });
        } catch (error) {
            console.error('Error updating item:', error);
            loadItems(); // Revert
        }
    };

    const toggleExpand = (id) => {
        setExpandedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const getChildren = (parentId) => {
        return items.filter(item => item.parentId === parentId);
    };

    const handleProgressChange = (id, newProgress) => {
        setItems(prev => prev.map(item =>
            item._id === id ? { ...item, progress: parseInt(newProgress) } : item
        ));
    };

    // Save progress - gets current value from state to avoid stale closure
    const saveProgress = useCallback(async (itemId, progress) => {
        // Optimistic update handles the UI. We just send the request.
        // Removed the locking mechanism (savingItems) to allow rapid updates.
        // Ideally we would use a debounce or request cancellation here, but for now 
        // allowing the latest action to trigger a save is better than blocking it.

        try {
            await studyAPI.update(itemId, { progress });
        } catch (error) {
            console.error('Error saving progress:', error);
            loadItems(); // Revert on error
        }
    }, []);


    // ... existing helpers ...

    const CircularSlider = ({ size, value, color, onCommit }) => {
        const [isDragging, setIsDragging] = useState(false);
        const [localValue, setLocalValue] = useState(value);
        const valueRef = useRef(value); // Track current value for closure

        useEffect(() => {
            if (!isDragging) {
                setLocalValue(value);
                valueRef.current = value;
            }
        }, [value, isDragging]);

        const radius = size / 2 - 4; // 4px stroke width
        const center = size / 2;

        const displayValue = isDragging ? localValue : value;

        const angleInRadians = (displayValue / 100) * 360 * (Math.PI / 180);
        const thumbX = center + radius * Math.cos(angleInRadians);
        const thumbY = center + radius * Math.sin(angleInRadians);

        const handleInteraction = (clientX, clientY, rect) => {
            const x = clientX - rect.left - center;
            const y = clientY - rect.top - center;

            let angle = Math.atan2(y, x) * (180 / Math.PI);
            angle = angle + 90;
            if (angle < 0) angle += 360;

            let percentage = Math.round((angle / 360) * 100);
            setLocalValue(percentage);
            valueRef.current = percentage;
            // Removed onChange call here to prevent global re-render loop
        };

        const handleMouseDown = (e) => {
            e.preventDefault();
            setIsDragging(true);
            const element = e.currentTarget;
            const rect = element.getBoundingClientRect();

            const handleMouseMove = (e) => {
                handleInteraction(e.clientX, e.clientY, rect);
            };

            const handleMouseUp = () => {
                setIsDragging(false);
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                onCommit(valueRef.current);
            };

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            handleInteraction(e.clientX, e.clientY, rect);
        };

        const handleTouchStart = (e) => {
            // Important: preventDefault prevents scrolling, and ensures touchmove fires continuously
            if (e.cancelable) e.preventDefault();
            setIsDragging(true);
            const element = e.currentTarget;
            const rect = element.getBoundingClientRect();

            const handleTouchMove = (e) => {
                if (e.cancelable) e.preventDefault();
                handleInteraction(e.touches[0].clientX, e.touches[0].clientY, rect);
            };

            const handleTouchEnd = () => {
                setIsDragging(false);
                document.removeEventListener('touchmove', handleTouchMove);
                document.removeEventListener('touchend', handleTouchEnd);
                onCommit(valueRef.current);
            };

            document.addEventListener('touchmove', handleTouchMove, { passive: false });
            document.addEventListener('touchend', handleTouchEnd);
            // Initial move
            handleInteraction(e.touches[0].clientX, e.touches[0].clientY, rect);
        };

        return (
            <div
                className="circular-slider"
                style={{ width: size, height: size, cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none' }}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
            >
                <svg width={size} height={size}>
                    <g transform={`rotate(-90 ${center} ${center})`}>
                        {/* Track */}
                        <circle
                            stroke="rgba(255, 255, 255, 0.1)"
                            strokeWidth="4"
                            fill="transparent"
                            r={radius}
                            cx={center}
                            cy={center}
                        />
                        {/* Progress */}
                        <circle
                            stroke={color}
                            strokeWidth="5"
                            fill="transparent"
                            r={radius}
                            cx={center}
                            cy={center}
                            pathLength="100"
                            strokeDasharray="100"
                            strokeDashoffset={100 - displayValue}
                            strokeLinecap="round"
                            style={{
                                transition: isDragging ? 'none' : 'stroke-dashoffset 0.3s ease',
                                filter: `drop-shadow(0 0 2px ${color})`
                            }}
                        />
                        {/* Invisible Hit Area (Larger) */}
                        <circle
                            cx={thumbX}
                            cy={thumbY}
                            r="20"
                            fill="transparent"
                            stroke="none"
                            style={{ cursor: 'pointer' }}
                        />
                        {/* Visible Thumb Knob */}
                        <circle
                            cx={thumbX}
                            cy={thumbY}
                            r="6"
                            fill="#fff"
                            stroke={color}
                            strokeWidth="2"
                            style={{
                                filter: `drop-shadow(0 0 3px ${color})`,
                                transition: isDragging ? 'none' : 'cx 0.1s ease, cy 0.1s ease',
                                pointerEvents: 'none' // Let events hit the large transparent circle or svg
                            }}
                        />
                    </g>
                </svg>
                <div className="circular-content">
                    <span className="value" style={{ fontSize: '0.9rem', fontWeight: '600' }}>{displayValue}%</span>
                </div>
            </div>
        );
    };

    const renderItem = (item, level = 0) => {
        const children = getChildren(item._id);
        const hasChildren = children.length > 0;
        const isExpanded = expandedItems.has(item._id);

        const typeColors = {
            subject: '#2563eb',
            chapter: '#3b82f6',
            topic: '#f472b6'
        };

        return (
            <div key={item._id} className="study-item" style={{ marginLeft: `${level * 20}px` }}>
                <div className="study-item-content">
                    <div className="study-item-left">
                        {hasChildren && (
                            <button
                                className="expand-btn"
                                onClick={() => toggleExpand(item._id)}
                            >
                                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </button>
                        )}
                        <button
                            className="complete-btn"
                            onClick={() => toggleComplete(item)}
                        >
                            {item.completed ? (
                                <CheckCircle2 size={20} style={{ color: typeColors[item.type] }} />
                            ) : (
                                <Circle size={20} style={{ color: '#6b7280' }} />
                            )}
                        </button>
                        <div className="study-item-info">
                            <h4 className={item.completed ? 'completed' : ''}>{item.title}</h4>
                            <span className="study-type" style={{ color: typeColors[item.type] }}>
                                {item.type}
                            </span>
                        </div>
                    </div>
                    <div className="study-item-right">
                        <div className="slider-container">
                            <CircularSlider
                                size={70}
                                value={Math.min(100, Math.max(0, item.progress || 0))}
                                color={typeColors[item.type]}
                                // Removed onChange to avoid re-rendering entire list on drag
                                onCommit={(val) => {
                                    handleProgressChange(item._id, val); // Update local state
                                    saveProgress(item._id, val);         // Save to DB
                                }}
                            />
                        </div>
                        <button
                            className="delete-btn"
                            onClick={() => handleDelete(item._id)}
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>
                {isExpanded && children.map(child => renderItem(child, level + 1))}
            </div>
        );
    };

    const subjects = items.filter(item => !item.parentId);

    return (
        <div className="study-page">
            <div className="page-header">
                <h1 className="module-title text-gradient">Study Tracker</h1>
            </div>

            <button className="btn btn-primary add-button" onClick={() => setShowForm(!showForm)}>
                <Plus size={20} />
                Add {formData.parentId ? (formData.type === 'chapter' ? 'Chapter' : 'Topic') : 'Subject'}
            </button>

            {showForm && (
                <Card className="study-form">
                    <h3>New Study Item</h3>
                    <form onSubmit={handleSubmit}>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Title</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="e.g., Thermodynamics, Data Structures, Circuits"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Type</label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                >
                                    <option value="subject">Subject</option>
                                    <option value="chapter">Chapter</option>
                                    <option value="topic">Topic</option>
                                </select>
                            </div>
                        </div>

                        {formData.type !== 'subject' && (
                            <div className="form-group">
                                <label>Parent {formData.type === 'chapter' ? 'Subject' : 'Chapter'}</label>
                                <select
                                    value={formData.parentId || ''}
                                    onChange={(e) => setFormData({ ...formData, parentId: e.target.value || null })}
                                >
                                    <option value="">Select parent...</option>
                                    {items
                                        .filter(item =>
                                            formData.type === 'chapter'
                                                ? item.type === 'subject'
                                                : item.type === 'chapter'
                                        )
                                        .map(item => (
                                            <option key={item._id} value={item._id}>{item.title}</option>
                                        ))}
                                </select>
                            </div>
                        )}

                        <div className="form-group">
                            <label>Progress (%)</label>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={formData.progress}
                                onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value) })}
                            />
                            <span className="progress-value">{formData.progress}%</span>
                        </div>

                        <div className="form-group">
                            <label>Notes</label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                rows="3"
                                placeholder="Add any notes or details..."
                            />
                        </div>

                        <div className="form-actions">
                            <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-primary">
                                Create Item
                            </button>
                        </div>
                    </form>
                </Card>
            )}

            <Card className="study-tree">
                {subjects.map(subject => renderItem(subject))}
            </Card>

            {items.length === 0 && !showForm && (
                <div className="empty-state">
                    <BookOpen size={64} className="text-gradient" />
                    <h3>No study items yet</h3>
                    <p>Create your first subject to start tracking your studies</p>
                </div>
            )}
        </div>
    );
}
