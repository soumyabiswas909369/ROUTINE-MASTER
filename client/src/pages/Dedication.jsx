import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Eye, EyeOff, X } from 'lucide-react';
import './Dedication.css';

export default function Dedication() {
    const navigate = useNavigate();
    const [memoryMode, setMemoryMode] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    // Simulate mounting animation delay
    useEffect(() => {
        setTimeout(() => setIsVisible(true), 100);

        // Check local storage for preferences if needed
        const savedMode = localStorage.getItem('dedication_memory_mode');
        if (savedMode === 'true') {
            setMemoryMode(true);
        }
    }, []);

    const toggleMemoryMode = () => {
        const newMode = !memoryMode;
        setMemoryMode(newMode);
        localStorage.setItem('dedication_memory_mode', newMode);
    };

    return (
        <div className="dedication-page">
            {/* Ambient Background Particles */}
            <div className="particles">
                {[...Array(50)].map((_, i) => (
                    <div
                        key={i}
                        className="particle"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            width: '6px', // Fixed size as requested
                            height: '6px',
                            // Use negative delay so particles are already "moving" when page loads
                            // and don't sit waiting for the delay to expire.
                            animationDelay: `-${Math.random() * 20}s`,
                            opacity: Math.random() * 0.5 + 0.5 // Minimum 0.5 opacity
                        }}
                    />
                ))}
            </div>

            <button className="close-btn" onClick={() => navigate('/')} title="Close Dedication">
                <X size={24} />
            </button>

            <div className={`dedication-content ${isVisible ? 'visible' : ''}`}>

                {/* Photo Frame */}
                <div className="photo-frame">
                    <img src="/new dp 3.jpeg" alt="Soumya" className="dedication-photo" />
                </div>

                <div className="dedication-text-container">
                    <h1 className="module-title text-gradient">Dedication</h1>

                    <div className="dedication-body">
                        <p>This project exists because some people make chaos feel lighter.</p>

                        <p>Through irregular days, shifting routines, and long stretches of uncertainty,
                            your patience, care, and quiet support became my constant.</p>

                        <p>This space is a small acknowledgment of that—
                            for standing beside me when structure was missing,
                            and for believing in me before the system ever did.</p>

                        <p>Built with gratitude. <br />
                            Built with <span className="highlight-name">you</span> in mind.</p>
                    </div>
                </div>

                {/* Optional Memory Mode Footer */}
                {memoryMode && (
                    <div className="memory-footer">
                        <div className="memory-date">
                            <Heart size={14} className="heart-icon icon-fill" fill="#e11d48" />
                            <span>Project started with her inspiration</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Subtle Controls */}
            <div className="controls">
                <button
                    className="control-btn"
                    onClick={toggleMemoryMode}
                    title={memoryMode ? "Hide Memory" : "Show Memory"}
                >
                    {memoryMode ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
            </div>
        </div>
    );
}
