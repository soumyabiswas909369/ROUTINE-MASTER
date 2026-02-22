import { useEffect, useState } from 'react';
import { Plus, Trash2, Calendar, Clock, Edit2 } from 'lucide-react';
import GravityContainer from '../components/GravityContainer';
import Card from '../components/Card';
import { routineAPI } from '../utils/api';
import './Routines.css';

export default function Routines() {
    const [routines, setRoutines] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        type: 'morning',
        tasks: [{ title: '', time: '', completed: false }],
        daysOfWeek: [],
        isTemplate: true
    });

    useEffect(() => {
        loadRoutines();
    }, []);

    const loadRoutines = async () => {
        try {
            const response = await routineAPI.getAll();
            const data = response.data.data || response.data;
            setRoutines(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error loading routines:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (formData._id) {
                const response = await routineAPI.update(formData._id, formData);
                // Update local state without refetching
                setRoutines(prev => prev.map(r => r._id === formData._id ? response.data : r));
            } else {
                const response = await routineAPI.create(formData);
                // Update local state without refetching
                setRoutines(prev => [...prev, response.data]);
            }
            setShowForm(false);
            setFormData({
                name: '',
                type: 'morning',
                tasks: [{ title: '', time: '', completed: false }],
                daysOfWeek: [],
                isTemplate: true
            });
        } catch (error) {
            console.error('Error saving routine:', error);
        }
    };

    const handleEdit = (routine) => {
        setFormData(routine);
        setShowForm(true);
    };

    const handleTaskToggle = async (routine, taskIndex) => {
        try {
            const updatedTasks = routine.tasks.map((task, index) =>
                index === taskIndex ? { ...task, completed: !task.completed } : task
            );

            // Optimistic update
            const updatedRoutine = { ...routine, tasks: updatedTasks };
            setRoutines(prev => prev.map(r => r._id === routine._id ? updatedRoutine : r));

            await routineAPI.update(routine._id, { tasks: updatedTasks });
        } catch (error) {
            console.error('Error updating task:', error);
            loadRoutines(); // Revert on error
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this routine?')) return;
        try {
            await routineAPI.delete(id);
            // Update local state without refetching
            setRoutines(prev => prev.filter(r => r._id !== id));
        } catch (error) {
            console.error('Error deleting routine:', error);
        }
    };

    const toggleDay = (day) => {
        setFormData(prev => ({
            ...prev,
            daysOfWeek: prev.daysOfWeek.includes(day)
                ? prev.daysOfWeek.filter(d => d !== day)
                : [...prev.daysOfWeek, day]
        }));
    };

    const addTask = () => {
        setFormData(prev => ({
            ...prev,
            tasks: [...prev.tasks, { title: '', time: '', completed: false }]
        }));
    };

    const removeTask = (index) => {
        setFormData(prev => ({
            ...prev,
            tasks: prev.tasks.filter((_, i) => i !== index)
        }));
    };

    const updateTask = (index, field, value) => {
        setFormData(prev => ({
            ...prev,
            tasks: prev.tasks.map((task, i) =>
                i === index ? { ...task, [field]: value } : task
            )
        }));
    };

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const routineTypes = [
        { value: 'morning', label: 'Morning Shift', color: '#2563eb' },
        { value: 'night', label: 'Night Shift', color: '#3b82f6' },
        { value: 'off-day', label: 'Off Day', color: '#38bdf8' },
        { value: 'custom', label: 'Custom', color: '#10b981' }
    ];

    return (
        <div className="routines-page">
            <div className="page-header">
                <h1 className="module-title text-gradient">Daily Routines</h1>
            </div>

            <button className="btn btn-primary add-button" onClick={() => {
                setFormData({
                    name: '',
                    type: 'morning',
                    tasks: [{ title: '', time: '', completed: false }],
                    daysOfWeek: [],
                    isTemplate: true
                });
                setShowForm(!showForm);
            }}>
                <Plus size={20} />
                Add Routine
            </button>

            {showForm && (
                <Card className="routine-form">
                    <h3>{formData._id ? 'Edit Routine' : 'New Routine Template'}</h3>
                    <form onSubmit={handleSubmit}>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Routine Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g., Morning Shift Routine"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Type</label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                >
                                    {routineTypes.map(type => (
                                        <option key={type.value} value={type.value}>{type.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Days of Week</label>
                            <div className="days-selector">
                                {days.map((day, index) => (
                                    <button
                                        key={day}
                                        type="button"
                                        className={`day-btn ${formData.daysOfWeek.includes(index) ? 'active' : ''}`}
                                        onClick={() => toggleDay(index)}
                                    >
                                        {day}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Tasks</label>
                            <div className="tasks-list">
                                {formData.tasks.map((task, index) => (
                                    <div key={index} className="task-input-row">
                                        <input
                                            type="text"
                                            placeholder="Task name"
                                            value={task.title}
                                            onChange={(e) => updateTask(index, 'title', e.target.value)}
                                            required
                                        />
                                        <div className="time-input-wrapper">
                                            <Clock size={18} className="time-icon" />
                                            <input
                                                type="time"
                                                value={task.time}
                                                onChange={(e) => updateTask(index, 'time', e.target.value)}
                                                required
                                            />
                                        </div>
                                        {formData.tasks.length > 1 && (
                                            <button
                                                type="button"
                                                className="remove-task-btn"
                                                onClick={() => removeTask(index)}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button type="button" className="btn btn-secondary" onClick={addTask}>
                                    <Plus size={16} />
                                    Add Task
                                </button>
                            </div>
                        </div>

                        <div className="form-actions">
                            <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-primary">
                                {formData._id ? 'Update Routine' : 'Create Routine'}
                            </button>
                        </div>
                    </form>
                </Card>
            )}

            <GravityContainer className="routines-grid">
                {routines.map((routine) => {
                    const typeInfo = routineTypes.find(t => t.value === routine.type) || routineTypes[0];
                    return (
                        <Card key={routine._id} className="routine-card">
                            <div className="routine-header">
                                <div className="routine-icon" style={{ color: typeInfo.color }}>
                                    <Calendar size={24} />
                                </div>
                                <div className="routine-actions">
                                    <button
                                        className="edit-btn"
                                        onClick={() => handleEdit(routine)}
                                    >
                                        <Edit2 size={18} />
                                    </button>
                                    <button
                                        className="delete-btn"
                                        onClick={() => handleDelete(routine._id)}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                            <h3>{routine.name}</h3>
                            <span className="routine-type" style={{ background: `${typeInfo.color}20`, color: typeInfo.color }}>
                                {typeInfo.label}
                            </span>

                            <div className="routine-tasks">
                                {routine.tasks.map((task, index) => (
                                    <div key={index} className={`task-item ${task.completed ? 'completed' : ''}`}>
                                        <label className="checkbox-container">
                                            <input
                                                type="checkbox"
                                                checked={task.completed || false}
                                                onChange={() => handleTaskToggle(routine, index)}
                                            />
                                            <span className="checkmark" style={{ borderColor: typeInfo.color }}></span>
                                        </label>
                                        <span className="task-time" style={{ color: typeInfo.color }}>{task.time}</span>
                                        <span className="task-title">{task.title}</span>
                                    </div>
                                ))}
                            </div>

                            {routine.daysOfWeek.length > 0 && (
                                <div className="routine-days">
                                    {routine.daysOfWeek.map(day => (
                                        <span key={day} className="day-badge">{days[day]}</span>
                                    ))}
                                </div>
                            )}
                        </Card>
                    );
                })}
            </GravityContainer>

            {routines.length === 0 && !showForm && (
                <div className="empty-state">
                    <Calendar size={64} className="text-gradient" />
                    <h3>No routines yet</h3>
                    <p>Create your first routine template to get started</p>
                </div>
            )}
        </div>
    );
}
