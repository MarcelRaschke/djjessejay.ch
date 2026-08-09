/**
 * DJ Jesse Jay - Blue Dimension Hero Animation (Simplified Version)
 * 
 * A lightweight 2D/3D hybrid animation that works without WebGL for broader compatibility
 * Falls back gracefully to CSS animations if Three.js is not available
 * 
 * @author Vibe Code (Mistral AI)
 * @license MIT
 */

class BlueDimensionHeroSimple {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            duration: 30000,
            autoPlay: true,
            loop: false,
            ...options
        };
        
        this.state = {
            isPlaying: false,
            isPaused: false,
            startTime: 0,
            elapsedTime: 0,
            currentPhase: 0
        };
        
        this.elements = {};
        this.init();
    }
    
    init() {
        // Create HTML structure
        this.createStructure();
        
        // Create CSS animations
        this.createAnimations();
        
        // Setup event listeners
        this.setupEvents();
        
        // Start if autoPlay
        if (this.options.autoPlay) {
            this.play();
        }
    }
    
    createStructure() {
        // Clear container
        this.container.innerHTML = '';
        
        // Create main wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'blue-dimension-hero';
        
        // Artwork container
        const artwork = document.createElement('div');
        artwork.className = 'hero-artwork';
        artwork.innerHTML = `
            <div class="artwork-image"></div>
            <div class="artwork-frame"></div>
            <div class="artwork-glass"></div>
        `;
        
        // DJ Figure (2D representation)
        const djFigure = document.createElement('div');
        djFigure.className = 'hero-dj-figure';
        djFigure.innerHTML = `
            <div class="dj-body"></div>
            <div class="dj-head">
                <div class="dj-eye left"></div>
                <div class="dj-eye right"></div>
                <div class="dj-helmet"></div>
            </div>
            <div class="dj-arm left"></div>
            <div class="dj-arm right"></div>
            <div class="dj-hand left"></div>
            <div class="dj-hand right"></div>
        `;
        
        // Equipment (turntable, mixer)
        const equipment = document.createElement('div');
        equipment.className = 'hero-equipment';
        equipment.innerHTML = `
            <div class="turntable">
                <div class="platter"></div>
                <div class="tonearm"></div>
                <div class="needle"></div>
                <div class="vinyl"></div>
            </div>
            <div class="mixer">
                <div class="fader fader-1"></div>
                <div class="fader fader-2"></div>
                <div class="fader fader-3"></div>
                <div class="fader fader-4"></div>
                <div class="knob knob-1"></div>
                <div class="knob knob-2"></div>
                <div class="knob knob-3"></div>
            </div>
        `;
        
        // Floor
        const floor = document.createElement('div');
        floor.className = 'hero-floor';
        
        // Broadcast field
        const broadcastField = document.createElement('div');
        broadcastField.className = 'hero-broadcast-field';
        
        // LoRa pulse effect
        const loraPulse = document.createElement('div');
        loraPulse.className = 'hero-lora-pulse';
        
        // RF membrane effect
        const membrane = document.createElement('div');
        membrane.className = 'hero-membrane';
        
        // Graphics spread
        const graphics = document.createElement('div');
        graphics.className = 'hero-graphics';
        for (let i = 0; i < 30; i++) {
            const graphic = document.createElement('div');
            graphic.className = 'graphic-particle';
            graphic.style.setProperty('--delay', `${i * 0.05}s`);
            graphic.style.setProperty('--angle', `${i * 12}deg`);
            graphics.appendChild(graphic);
        }
        
        // Add all elements
        wrapper.appendChild(artwork);
        wrapper.appendChild(djFigure);
        wrapper.appendChild(equipment);
        wrapper.appendChild(floor);
        wrapper.appendChild(broadcastField);
        wrapper.appendChild(loraPulse);
        wrapper.appendChild(membrane);
        wrapper.appendChild(graphics);
        
        this.container.appendChild(wrapper);
        
        // Store references
        this.elements = {
            wrapper,
            artwork,
            djFigure,
            equipment,
            floor,
            broadcastField,
            loraPulse,
            membrane,
            graphics
        };
    }
    
    createAnimations() {
        // Create style element with keyframe animations
        const style = document.createElement('style');
        style.textContent = `
            .blue-dimension-hero {
                position: relative;
                width: 100%;
                height: 100%;
                overflow: hidden;
                background: linear-gradient(135deg, #0f172a 0%, #1e3c72 100%);
                perspective: 1000px;
            }
            
            /* Artwork */
            .hero-artwork {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) scale(1);
                width: 60%;
                height: 40%;
                min-width: 400px;
                min-height: 260px;
                transition: transform 0.5s ease;
            }
            
            .artwork-image {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(135deg, #003366 0%, #0066cc 50%, #0099ff 100%);
                border-radius: 4px;
                box-shadow: 0 0 30px rgba(0, 100, 255, 0.3);
            }
            
            .artwork-image::before {
                content: '97.5 MHz';
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 2rem;
                font-weight: 700;
                color: #00ffff;
                text-shadow: 0 0 20px rgba(0, 255, 255, 0.8);
                font-family: 'Inter', sans-serif;
            }
            
            .artwork-image::after {
                content: 'BLUE DIMENSION';
                position: absolute;
                bottom: 10%;
                left: 50%;
                transform: translateX(-50%);
                font-size: 1rem;
                color: #00b7ff;
                letter-spacing: 0.3em;
                font-family: 'Inter', sans-serif;
            }
            
            .artwork-frame {
                position: absolute;
                top: -6px;
                left: -6px;
                right: -6px;
                bottom: -6px;
                border: 2px solid #222;
                border-radius: 8px;
                background: linear-gradient(135deg, rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.1));
                z-index: -1;
            }
            
            .artwork-glass {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(2px);
                border-radius: 4px;
                pointer-events: none;
            }
            
            /* DJ Figure */
            .hero-dj-figure {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 200px;
                height: 300px;
                transition: all 0.5s ease;
                z-index: 10;
            }
            
            .dj-body {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 60px;
                height: 100px;
                background: #222;
                border-radius: 10px;
            }
            
            .dj-head {
                position: absolute;
                top: 20%;
                left: 50%;
                transform: translateX(-50%);
                width: 50px;
                height: 50px;
                background: #333;
                border-radius: 25px;
            }
            
            .dj-eye {
                position: absolute;
                width: 8px;
                height: 8px;
                background: #00ffff;
                border-radius: 50%;
                top: 20px;
            }
            
            .dj-eye.left {
                left: 10px;
            }
            
            .dj-eye.right {
                right: 10px;
            }
            
            .dj-helmet {
                position: absolute;
                top: -10px;
                left: 50%;
                transform: translateX(-50%);
                width: 60px;
                height: 30px;
                background: #111;
                border-radius: 15px;
            }
            
            .dj-arm {
                position: absolute;
                width: 15px;
                height: 80px;
                background: #222;
                border-radius: 7px;
                top: 60px;
            }
            
            .dj-arm.left {
                left: 10px;
            }
            
            .dj-arm.right {
                right: 10px;
            }
            
            .dj-hand {
                position: absolute;
                width: 20px;
                height: 15px;
                background: #333;
                border-radius: 5px;
                bottom: -15px;
                left: 50%;
                transform: translateX(-50%);
            }
            
            /* Equipment */
            .hero-equipment {
                position: absolute;
                bottom: -200px;
                left: 50%;
                transform: translateX(-50%);
                display: flex;
                gap: 100px;
                opacity: 0;
                transition: all 1s ease;
                z-index: 5;
            }
            
            .turntable {
                position: relative;
                width: 150px;
                height: 50px;
            }
            
            .platter {
                position: absolute;
                top: 10px;
                left: 50%;
                transform: translateX(-50%);
                width: 100px;
                height: 100px;
                background: #222;
                border-radius: 50%;
                border: 2px solid #444;
            }
            
            .vinyl {
                position: absolute;
                top: 15px;
                left: 50%;
                transform: translateX(-50%);
                width: 90px;
                height: 90px;
                background: #000;
                border-radius: 50%;
            }
            
            .tonearm {
                position: absolute;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                width: 80px;
                height: 2px;
                background: #444;
                transform-origin: left center;
                transition: transform 0.5s ease;
            }
            
            .needle {
                position: absolute;
                top: 20px;
                right: -2px;
                width: 2px;
                height: 10px;
                background: #666;
                transform-origin: top right;
                transition: transform 0.3s ease;
            }
            
            .mixer {
                position: relative;
                width: 120px;
                height: 40px;
                background: #111;
                border-radius: 5px;
            }
            
            .fader {
                position: absolute;
                top: 5px;
                width: 4px;
                height: 30px;
                background: #444;
                border-radius: 2px;
                transition: height 0.2s ease;
            }
            
            .fader-1 { left: 10px; }
            .fader-2 { left: 30px; }
            .fader-3 { left: 50px; }
            .fader-4 { left: 70px; }
            
            .knob {
                position: absolute;
                top: -5px;
                width: 12px;
                height: 12px;
                background: #444;
                border-radius: 50%;
                transition: transform 0.2s ease;
            }
            
            .knob-1 { left: 20px; }
            .knob-2 { left: 40px; }
            .knob-3 { left: 60px; }
            
            /* Floor */
            .hero-floor {
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                height: 200px;
                background: linear-gradient(to top, #1a1a2e, transparent);
                border-top: 1px solid rgba(0, 183, 255, 0.2);
            }
            
            /* Broadcast Field */
            .hero-broadcast-field {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: radial-gradient(circle at center, transparent 0%, rgba(0, 51, 102, 0.3) 100%);
                opacity: 0;
                transition: opacity 2s ease;
                z-index: -1;
            }
            
            .hero-broadcast-field::before {
                content: '';
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 200%;
                height: 200%;
                background: 
                    radial-gradient(circle at center, transparent 40%, rgba(0, 100, 255, 0.1) 41%, rgba(0, 100, 255, 0.1) 42%, transparent 43%),
                    repeating-conic-gradient(from 0deg, transparent 0deg, rgba(0, 255, 255, 0.1) 1deg, transparent 2deg);
                animation: broadcastRotate 20s linear infinite;
            }
            
            /* LoRa Pulse */
            .hero-lora-pulse {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 0;
                height: 0;
                background: radial-gradient(circle, #00ffff 0%, transparent 70%);
                border-radius: 50%;
                opacity: 0;
                transition: all 0.5s ease;
                z-index: 20;
                pointer-events: none;
            }
            
            /* RF Membrane */
            .hero-membrane {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 0;
                height: 0;
                background: radial-gradient(circle, rgba(0, 183, 255, 0.3) 0%, transparent 70%);
                border-radius: 50%;
                opacity: 0;
                transition: all 0.5s ease;
                z-index: 15;
                pointer-events: none;
            }
            
            /* Graphics Spread */
            .hero-graphics {
                position: absolute;
                bottom: 0;
                left: 50%;
                transform: translateX(-50%);
                width: 100%;
                height: 200px;
                pointer-events: none;
            }
            
            .graphic-particle {
                position: absolute;
                bottom: 0;
                left: 50%;
                width: 20px;
                height: 20px;
                background: linear-gradient(135deg, #00b7ff, #00ffff);
                border-radius: 2px;
                opacity: 0;
                transform: translate(-50%, 0) scale(0);
                transition: all 0.5s ease;
            }
            
            /* Keyframe Animations */
            @keyframes broadcastRotate {
                from { transform: translate(-50%, -50%) rotate(0deg); }
                to { transform: translate(-50%, -50%) rotate(360deg); }
            }
            
            @keyframes eyeBlink {
                0%, 45%, 55%, 100% { transform: scaleY(1); opacity: 1; }
                50% { transform: scaleY(0.1); opacity: 0.5; }
            }
            
            @keyframes fingerTap {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-5px); }
            }
            
            @keyframes faderMove {
                0%, 100% { height: 15px; }
                50% { height: 30px; }
            }
            
            @keyframes knobRotate {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            
            /* Phase-specific styles */
            .blue-dimension-hero.phase-0 .hero-artwork { transform: translate(-50%, -50%) scale(1); }
            .blue-dimension-hero.phase-1 .hero-lora-pulse { 
                width: 400px; 
                height: 400px; 
                opacity: 0.5;
            }
            .blue-dimension-hero.phase-2 .dj-eye { animation: eyeBlink 4s ease-in-out infinite; }
            .blue-dimension-hero.phase-2 .dj-hand { animation: fingerTap 2s ease-in-out infinite; }
            .blue-dimension-hero.phase-3 .dj-arm.right { transform: rotate(-45deg); }
            .blue-dimension-hero.phase-3 .dj-hand.right { transform: translateX(-50%) rotate(45deg); }
            .blue-dimension-hero.phase-4 .hero-membrane { 
                width: 500px; 
                height: 500px; 
                opacity: 0.5;
            }
            .blue-dimension-hero.phase-5 .dj-arm.right { transform: translateX(50px) rotate(-90deg); }
            .blue-dimension-hero.phase-5 .dj-hand.right { transform: translateX(50px) rotate(90deg); }
            .blue-dimension-hero.phase-6 .hero-artwork { transform: translate(-50%, -50%) scale(1.1); }
            .blue-dimension-hero.phase-7 .hero-equipment { 
                bottom: 50px; 
                opacity: 1;
            }
            .blue-dimension-hero.phase-8 .needle { transform: rotate(-45deg) translateY(5px); }
            .blue-dimension-hero.phase-9 .graphic-particle { 
                opacity: 1; 
                transform: translate(-50%, -100px) scale(1);
            }
            .blue-dimension-hero.phase-10 .fader { animation: faderMove 1s ease-in-out infinite; }
            .blue-dimension-hero.phase-10 .knob { animation: knobRotate 2s linear infinite; }
            .blue-dimension-hero.phase-11 .hero-broadcast-field { opacity: 1; }
            .blue-dimension-hero.phase-11 .hero-artwork { opacity: 0; }
            .blue-dimension-hero.phase-11 .hero-dj-figure { opacity: 0; }
        `;
        
        document.head.appendChild(style);
    }
    
    setupEvents() {
        // Handle window resize
        window.addEventListener('resize', this.onResize.bind(this));
    }
    
    onResize() {
        // Adjust based on container size
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        // Scale elements proportionally
        const scale = Math.min(width / 800, height / 600);
        
        if (this.elements.wrapper) {
            this.elements.wrapper.style.transform = `scale(${scale})`;
        }
    }
    
    play() {
        this.state.isPlaying = true;
        this.state.isPaused = false;
        this.state.startTime = Date.now() - this.state.elapsedTime;
        this.animate();
    }
    
    pause() {
        this.state.isPaused = true;
        this.state.isPlaying = false;
        this.state.elapsedTime = Date.now() - this.state.startTime;
    }
    
    resume() {
        if (this.state.isPaused) {
            this.state.isPaused = false;
            this.state.isPlaying = true;
            this.state.startTime = Date.now() - this.state.elapsedTime;
            this.animate();
        }
    }
    
    stop() {
        this.state.isPlaying = false;
        this.state.isPaused = false;
        this.state.elapsedTime = 0;
        this.state.currentPhase = 0;
        this.updatePhase(0);
    }
    
    reset() {
        this.stop();
        this.play();
    }
    
    animate() {
        if (!this.state.isPlaying) return;
        
        const now = Date.now();
        this.state.elapsedTime = now - this.state.startTime;
        
        // Calculate current phase
        const totalDuration = this.options.duration;
        const progress = Math.min(1, this.state.elapsedTime / totalDuration);
        const phaseDuration = totalDuration / 12;
        const currentPhase = Math.min(11, Math.floor(this.state.elapsedTime / phaseDuration));
        
        // Update phase if changed
        if (currentPhase !== this.state.currentPhase) {
            this.state.currentPhase = currentPhase;
            this.updatePhase(currentPhase);
        }
        
        // Continue animation loop
        if (this.state.isPlaying && this.state.elapsedTime < totalDuration) {
            requestAnimationFrame(this.animate.bind(this));
        } else if (this.options.loop) {
            this.reset();
        }
    }
    
    updatePhase(phase) {
        // Remove all phase classes
        const phases = ['phase-0', 'phase-1', 'phase-2', 'phase-3', 'phase-4', 'phase-5', 
                       'phase-6', 'phase-7', 'phase-8', 'phase-9', 'phase-10', 'phase-11'];
        
        phases.forEach(p => {
            this.elements.wrapper.classList.remove(p);
        });
        
        // Add current phase class
        this.elements.wrapper.classList.add(`phase-${phase}`);
        
        // Phase-specific animations
        switch (phase) {
            case 1:
                this.animateLoRaPulse();
                break;
            case 4:
                this.animateMembrane();
                break;
            case 9:
                this.animateGraphicsSpread();
                break;
        }
    }
    
    animateLoRaPulse() {
        const pulse = this.elements.loraPulse;
        pulse.style.width = '400px';
        pulse.style.height = '400px';
        pulse.style.opacity = '0.5';
        
        setTimeout(() => {
            pulse.style.width = '0';
            pulse.style.height = '0';
            pulse.style.opacity = '0';
        }, 500);
    }
    
    animateMembrane() {
        const membrane = this.elements.membrane;
        membrane.style.width = '500px';
        membrane.style.height = '500px';
        membrane.style.opacity = '0.5';
        
        // Pulsing effect
        let scale = 1;
        let growing = true;
        
        const pulseInterval = setInterval(() => {
            if (this.state.currentPhase !== 4) {
                clearInterval(pulseInterval);
                membrane.style.width = '0';
                membrane.style.height = '0';
                membrane.style.opacity = '0';
                return;
            }
            
            scale += growing ? 0.02 : -0.02;
            if (scale > 1.1) growing = false;
            if (scale < 0.9) growing = true;
            
            membrane.style.transform = `translate(-50%, -50%) scale(${scale})`;
        }, 50);
    }
    
    animateGraphicsSpread() {
        const particles = this.elements.graphics.querySelectorAll('.graphic-particle');
        
        particles.forEach((particle, i) => {
            setTimeout(() => {
                const angle = (i / particles.length) * Math.PI * 2;
                const distance = 200 + Math.random() * 100;
                
                particle.style.left = `calc(50% + ${Math.cos(angle) * distance}px)`;
                particle.style.bottom = `${Math.sin(angle) * distance}px`;
                particle.style.opacity = '1';
                particle.style.transform = 'translate(-50%, 0) scale(1)';
            }, i * 50);
        });
    }
    
    getCurrentPhase() {
        return this.state.currentPhase;
    }
    
    getProgress() {
        return Math.min(1, this.state.elapsedTime / this.options.duration);
    }
    
    destroy() {
        this.stop();
        this.container.innerHTML = '';
    }
}

// Auto-initialize
function initHeroAnimation(containerId = 'hero-animation', options = {}) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.warn(`Hero animation container '${containerId}' not found.`);
        return null;
    }
    
    return new BlueDimensionHeroSimple(container, options);
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BlueDimensionHeroSimple, initHeroAnimation };
}

// Auto-initialize on DOM ready
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        const heroContainer = document.getElementById('hero-animation');
        if (heroContainer) {
            window.heroAnimation = initHeroAnimation('hero-animation', {
                duration: 30000,
                autoPlay: true,
                loop: false
            });
        }
    });
}
