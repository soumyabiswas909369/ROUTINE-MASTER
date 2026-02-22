import React, { useEffect, useRef } from 'react';
import './ParticleBackground.css';

const ParticleBackground = () => {
    const canvasRef = useRef(null);
    // Use a ref to track mobile state without triggering re-renders
    const isMobileRef = useRef(window.innerWidth < 768);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animationFrameId;
        let time = 0;

        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            // Update mobile check on resize
            isMobileRef.current = window.innerWidth < 768;
        };

        const project3D = (x, y, z, vars) => {
            const perspective = 800;
            const scale = perspective / (perspective + z);
            return {
                x: (x * scale) + vars.cx,
                y: (y * scale) + vars.cy,
                scale: scale
            };
        };

        const renderRibbon = (cx, cy, sizeScaler, rotationAngle) => {
            const vars = { cx, cy };
            const particleCountX = isMobileRef.current ? 45 : 65;
            const particleCountY = isMobileRef.current ? 18 : 25;
            const spacing = isMobileRef.current ? 15 : 18;

            for (let i = 0; i < particleCountX; i++) {
                for (let j = 0; j < particleCountY; j++) {
                    const wavePhase = i * 0.1 + time;

                    // VELOCITY CALCULATION: Glow only when in motion
                    // Derivative of sin(x) is cos(x). Max velocity is at the midpoints of the wave.
                    const velocity = Math.abs(Math.cos(wavePhase));
                    const motionGlow = Math.pow(velocity, 3); // Sharpness of the motion-glow transition

                    let x = (i - particleCountX / 2) * spacing * 1.5;
                    let y = (j - particleCountY / 2) * spacing;
                    const twist = Math.sin(wavePhase) * 120;
                    y += twist;

                    let z = Math.cos(wavePhase) * 200 + (j * 10);
                    const rx = x * Math.cos(rotationAngle) - y * Math.sin(rotationAngle);
                    const ry = x * Math.sin(rotationAngle) + y * Math.cos(rotationAngle);
                    const p = project3D(rx, ry, z, vars);

                    // Multiplier for "Noticeable" factor
                    const baseSize = isMobileRef.current ? 2.0 : 2.5;
                    let size = Math.max(0.2, p.scale * baseSize * sizeScaler);

                    // Color and base transparency
                    const lightness = 50 + (motionGlow * 30);
                    const alpha = Math.min(0.95, p.scale * (0.3 + motionGlow * 0.6));

                    ctx.beginPath();
                    ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
                    ctx.fillStyle = `hsla(217, 100%, ${lightness}%, ${alpha})`;

                    // MOTION GLOW: Ultra-intensified and strictly tied to speed
                    if (motionGlow > 0.1) {
                        ctx.shadowBlur = (motionGlow * 80) * sizeScaler * p.scale;
                        ctx.shadowColor = `hsla(217, 100%, 75%, ${alpha * motionGlow})`;
                    }

                    ctx.fill();
                    ctx.shadowBlur = 0;
                }
            }
        };

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (isMobileRef.current) {
                // --- MOBILE VIEW CONFIGURATION ---
                // Symmetric "Twin Waves" for mobile
                // Positioned at diagonal corners (10% and 90%)
                // Rotation 0.75 (~45deg) creates a diagonal flow
                renderRibbon(canvas.width * 0.9, canvas.height * 0.1, 0.5, 0.75); // Top Right
                renderRibbon(canvas.width * 0.1, canvas.height * 0.9, 0.5, 0.75); // Bottom Left

            } else {
                // --- DESKTOP VIEW CONFIGURATION ---
                // Better padding from edges
                renderRibbon(canvas.width * 0.85, canvas.height * 0.15, 1.0, 0.6);
                renderRibbon(canvas.width * 0.15, canvas.height * 0.85, 0.65, 0.6);
            }

            // Speed Control (1.3x faster: 0.004 * 1.3 = 0.0052)
            time += 0.0052;

            animationFrameId = requestAnimationFrame(animate);
        };

        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();
        animate();

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return <canvas ref={canvasRef} className="particle-background" />;
};

export default ParticleBackground;