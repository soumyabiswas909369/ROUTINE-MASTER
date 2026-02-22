import { Link, useLocation } from 'react-router-dom';
import { Home, Bell, Calendar, BookOpen, FileText, DollarSign, Menu, X, CheckSquare } from 'lucide-react';
import { useState } from 'react';
import './Navbar.css';

export default function Navbar() {
    const location = useLocation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const navItems = [
        { path: '/', icon: Home, label: 'Dashboard' },
        { path: '/attendance', icon: CheckSquare, label: 'Attendance' },
        { path: '/routines', icon: Calendar, label: 'Routines' },
        { path: '/study', icon: BookOpen, label: 'Study' },
        { path: '/documents', icon: FileText, label: 'Documents' },
        { path: '/expenses', icon: DollarSign, label: 'Expenses' }
    ];

    return (
        <nav className="navbar">
            <div className="navbar-container">
                <div className="navbar-brand">
                    <h1 className="text-gradient-crimson">RoutineMaster</h1>
                </div>

                <div className="navbar-links desktop-nav">
                    {navItems.map(({ path, icon: Icon, label }) => (
                        <Link
                            key={path}
                            to={path}
                            className={`nav-link ${location.pathname === path ? 'active' : ''}`}
                        >
                            <Icon size={20} />
                            <span>{label}</span>
                        </Link>
                    ))}
                </div>

                <div className="navbar-actions desktop-only">
                    {/* Global Bell Icon (Desktop Only) */}
                    <Link to="/reminders" className={`nav-link ${location.pathname === '/reminders' ? 'active' : ''}`} style={{ padding: '8px' }}>
                        <Bell size={20} />
                    </Link>

                </div>
            </div>
        </nav>
    );
}
