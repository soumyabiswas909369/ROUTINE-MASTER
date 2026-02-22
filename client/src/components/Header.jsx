import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { reminderAPI } from '../utils/api';
import './Header.css';

export default function Header() {
    const [remindersCount, setRemindersCount] = useState(0);
    const location = useLocation();

    useEffect(() => {
        loadStats();
    }, [location.pathname]);

    const loadStats = async () => {
        try {
            const remindersRes = await reminderAPI.getAll(1, 1, { isActive: true });
            setRemindersCount(remindersRes.data.totalItems || 0);
        } catch (error) {
            console.error('Error loading header stats:', error);
        }
    };

    if (location.pathname !== '/') return null;

    return (
        <header className="mobile-header">
            <div className="user-profile">
                <div className="avatar">
                    <img src={`/new dp 3.jpeg?v=${new Date().getTime()}`} alt="Avatar" />
                </div>
                <div className="greeting">
                    <span>Welcome Back!</span>
                    <h3>Soumya Biswas</h3>
                </div>
            </div>
            <div className="header-actions">
                <Link to="/reminders" className="mobile-bell-btn" style={{ textDecoration: 'none' }}>
                    <Bell size={20} color="#3b82f6" />
                    {remindersCount > 0 && <span className="dot"></span>}
                </Link>
            </div>
        </header>
    );
}
