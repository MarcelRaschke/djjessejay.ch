/**
 * DJ Jesse Jay - Blue Dimension Hero Animation
 * 
 * A cinematic 3D WebGL experience that transforms 2D artwork into a live performance
 * 
 * Sequence:
 * 1. Static Blue Dimension 97.5 MHz artwork (flat, motionless)
 * 2. Cyan LoRa pulse travels through printed artwork
 * 3. DJ action figure subtly moves eyes and fingers while artwork remains frozen
 * 4. Character presses palm against image surface
 * 5. Artwork behaves like flexible radio-frequency membrane
 * 6. Hand emerges physically into real space
 * 7. Bass drop - complete DJ Jesse Jay action figure steps out
 * 8. Reaches back through flat image and pulls out turntable, mixer, vinyl
 * 9. Needle drop
 * 10. Printed Blue Dimension graphics spread across reflective floor
 * 11. Controlled 120fps DJ and TechDancer performance
 * 12. Artwork frame dissolves into 360-degree 97.5 MHz broadcast field
 * 
 * @author Vibe Code (Mistral AI)
 * @license MIT
 */

import * as THREE from '../vendor/three/build/three.module.js';
import { OrbitControls } from '../vendor/three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from '../vendor/three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from '../vendor/three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from '../vendor/three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from '../vendor/three/examples/jsm/postprocessing/ShaderPass.js';
import { GammaCorrectionShader } from '../vendor/three/examples/jsm/shaders/GammaCorrectionShader.js';
import { RGBShiftShader } from '../vendor/three/examples/jsm/shaders/RGBShiftShader.js';
import { FilmPass } from '../vendor/three/examples/jsm/postprocessing/FilmPass.js';

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
    // Animation timing (in milliseconds)
    timings: {
        initialDelay: 1000,
        phase1_static: 2000,           // Static artwork display
        phase2_pulse: 3000,            // Cyan LoRa pulse through artwork
        phase3_subtleAnimation: 4000, // Subtle eye/finger movement
        phase4_palmPress: 2000,        // Palm press against surface
        phase5_membrane: 3000,         // RF membrane distortion
        phase6_handEmerge: 2500,      // Hand emerges into real space
        phase7_bassDrop: 1500,         // Bass drop moment
        phase8_equipmentPull: 3000,    // Pull equipment from image
        phase9_needleDrop: 1000,       // Needle drop
        phase10_floorSpread: 2000,     // Graphics spread on floor
        phase11_performance: 5000,     // DJ performance
        phase12_dissolve: 2000,        // Dissolve to broadcast field
        totalDuration: 30000          // Total sequence duration
    },
    
    // Visual parameters
    colors: {
        primaryCyan: 0x00b7ff,
        loraPulse: 0x00ffff,
        radioFrequency: 0x00aaff,
        bassDrop: 0xff4444,
        broadcastField: 0x003366,
        floorReflection: 0x1a1a2e,
        ambient: 0x16213e,
        spotlight: 0xffffff
    },
    
    // Camera settings
    camera: {
        fov: 75,
        near: 0.1,
        far: 1000,
        initialPosition: { x: 0, y: 0, z: 8 },
        performancePosition: { x: 0, y: 2, z: 6 }
    },
    
    // Performance settings
    targetFPS: 120,
    quality: 'high' // 'low', 'medium', 'high'
};

// ============================================
// ANIMATION STATE MANAGER
// ============================================

class AnimationState {
    constructor() {
        this.currentPhase = 0;
        this.phaseStartTime = 0;
        this.isPlaying = false;
        this.isPaused = false;
        this.hasStarted = false;
    }
    
    start() {
        this.hasStarted = true;
        this.isPlaying = true;
        this.isPaused = false;
        this.currentPhase = 0;
        this.phaseStartTime = Date.now();
    }
    
    pause() {
        this.isPaused = true;
        this.isPlaying = false;
    }
    
    resume() {
        if (this.isPaused) {
            this.isPaused = false;
            this.isPlaying = true;
            this.phaseStartTime = Date.now() - this.getElapsedTime();
        }
    }
    
    stop() {
        this.isPlaying = false;
        this.isPaused = false;
        this.currentPhase = 0;
    }
    
    getElapsedTime() {
        return Date.now() - this.phaseStartTime;
    }
    
    getCurrentPhase() {
        if (!this.isPlaying) return this.currentPhase;
        
        const elapsed = this.getElapsedTime();
        let cumulativeTime = 0;
        
        for (let i = 0; i < 12; i++) {
            const phaseName = `phase${i + 1}`;
            if (CONFIG.timings[phaseName]) {
                cumulativeTime += CONFIG.timings[phaseName];
                if (elapsed < cumulativeTime) {
                    this.currentPhase = i;
                    return i;
                }
            }
        }
        
        this.currentPhase = 12;
        return 12;
    }
    
    getPhaseProgress() {
        const phase = this.getCurrentPhase();
        const phaseName = `phase${phase + 1}`;
        const phaseDuration = CONFIG.timings[phaseName] || 1000;
        const phaseStart = this.getPhaseStartTime(phase);
        const elapsed = this.getElapsedTime();
        
        return Math.min(1, (elapsed - phaseStart) / phaseDuration);
    }
    
    getPhaseStartTime(phase) {
        let cumulativeTime = 0;
        for (let i = 0; i < phase; i++) {
            cumulativeTime += CONFIG.timings[`phase${i + 1}`] || 0;
        }
        return cumulativeTime;
    }
}

// ============================================
// CUSTOM SHADERS
// ============================================

const LoRaPulseShader = {
    uniforms: {
        tDiffuse: { value: null },
        time: { value: 0 },
        pulsePosition: { value: new THREE.Vector2(0.5, 0.5) },
        pulseRadius: { value: 0 },
        pulseColor: { value: new THREE.Color(CONFIG.colors.loraPulse) },
        pulseIntensity: { value: 0 }
    },
    
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float time;
        uniform vec2 pulsePosition;
        uniform float pulseRadius;
        uniform vec3 pulseColor;
        uniform float pulseIntensity;
        varying vec2 vUv;
        
        void main() {
            vec4 original = texture2D(tDiffuse, vUv);
            
            // Calculate distance from pulse center
            float dist = distance(vUv, pulsePosition);
            
            // Pulse wave effect
            float pulseWave = smoothstep(pulseRadius, pulseRadius + 0.1, dist);
            pulseWave *= pulseIntensity;
            
            // Glow effect
            float glow = pulseIntensity * exp(-dist * 10.0);
            
            // Combine effects
            vec3 pulseEffect = mix(original.rgb, pulseColor, pulseWave + glow);
            
            // Additive blending for glow
            gl_FragColor = vec4(mix(original.rgb, pulseEffect, pulseIntensity), original.a);
        }
    `
};

const RFMembraneShader = {
    uniforms: {
        tDiffuse: { value: null },
        time: { value: 0 },
        distortionCenter: { value: new THREE.Vector2(0.5, 0.5) },
        distortionRadius: { value: 0 },
        distortionStrength: { value: 0 },
        waveFrequency: { value: 10.0 },
        waveSpeed: { value: 1.0 }
    },
    
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float time;
        uniform vec2 distortionCenter;
        uniform float distortionRadius;
        uniform float distortionStrength;
        uniform float waveFrequency;
        uniform float waveSpeed;
        varying vec2 vUv;
        
        void main() {
            // Calculate distance from distortion center
            float dist = distance(vUv, distortionCenter);
            
            if (dist < distortionRadius) {
                // Create wave-like distortion
                float wave = sin(dist * waveFrequency + time * waveSpeed) * distortionStrength * (1.0 - dist / distortionRadius);
                
                // Apply distortion to UV coordinates
                vec2 distortedUv = vUv;
                distortedUv += (vUv - distortionCenter) * wave * 0.1;
                
                vec4 color = texture2D(tDiffuse, distortedUv);
                
                // Add some edge glow
                float edge = 1.0 - smoothstep(distortionRadius - 0.1, distortionRadius, dist);
                vec3 glow = vec3(0.0, 0.5, 1.0) * edge * distortionStrength * 0.5;
                
                gl_FragColor = vec4(color.rgb + glow, color.a);
            } else {
                gl_FragColor = texture2D(tDiffuse, vUv);
            }
        }
    `
};

const BroadcastFieldShader = {
    uniforms: {
        time: { value: 0 },
        resolution: { value: new THREE.Vector2(1, 1) },
        frequency: { value: 97.5 },
        color: { value: new THREE.Color(CONFIG.colors.broadcastField) }
    },
    
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    
    fragmentShader: `
        uniform float time;
        uniform vec2 resolution;
        uniform float frequency;
        uniform vec3 color;
        varying vec2 vUv;
        
        void main() {
            // Normalize pixel coordinates
            vec2 uv = vUv;
            
            // Create concentric circles representing radio waves
            float dist = distance(uv, vec2(0.5));
            
            // Animate waves outward
            float wave1 = abs(sin(dist * 50.0 - time * 2.0)) * 0.1;
            float wave2 = abs(sin(dist * 30.0 - time * 1.5)) * 0.05;
            float wave3 = abs(sin(dist * 20.0 - time * 1.0)) * 0.02;
            
            float waves = wave1 + wave2 + wave3;
            
            // Create scan lines for broadcast effect
            float scanLine = sin(uv.y * resolution.y * 2.0 + time * 5.0) * 0.1 + 0.9;
            
            // Combine effects
            vec3 baseColor = color * (0.5 + waves);
            vec3 finalColor = baseColor * scanLine;
            
            // Add frequency display
            if (dist < 0.1) {
                float freqPulse = sin(time * 10.0) * 0.5 + 0.5;
                finalColor = mix(finalColor, vec3(0.0, 1.0, 1.0), freqPulse * 0.5);
            }
            
            gl_FragColor = vec4(finalColor, 1.0);
        }
    `
};

// ============================================
// 3D MODELS (Procedural)
// ============================================

class DJActionFigure {
    constructor() {
        this.group = new THREE.Group();
        this.body = this.createBody();
        this.head = this.createHead();
        this.arms = [this.createArm(), this.createArm()];
        this.legs = [this.createLeg(), this.createLeg()];
        this.hands = [this.createHand(), this.createHand()];
        
        // Position parts
        this.head.position.y = 1.8;
        this.arms[0].position.set(-0.3, 1.5, 0);
        this.arms[1].position.set(0.3, 1.5, 0);
        this.legs[0].position.set(-0.2, 0.5, 0);
        this.legs[1].position.set(0.2, 0.5, 0);
        this.hands[0].position.set(0, -0.5, 0);
        this.hands[1].position.set(0, -0.5, 0);
        
        // Add to group
        this.group.add(this.body);
        this.group.add(this.head);
        this.arms.forEach(arm => this.group.add(arm));
        this.legs.forEach(leg => this.group.add(leg));
        this.arms[0].add(this.hands[0]);
        this.arms[1].add(this.hands[1]);
        
        // Animation state
        this.eyeBlink = 0;
        this.fingerTap = 0;
        this.armRaise = 0;
        this.handEmerge = 0;
    }
    
    createBody() {
        const body = new THREE.Group();
        
        // Torso
        const torso = new THREE.Mesh(
            new THREE.BoxGeometry(0.4, 0.6, 0.2),
            new THREE.MeshStandardMaterial({ 
                color: 0x222222,
                roughness: 0.7,
                metalness: 0.1
            })
        );
        
        // Chest logo/design
        const chestDesign = new THREE.Mesh(
            new THREE.PlaneGeometry(0.3, 0.2),
            new THREE.MeshBasicMaterial({ 
                color: CONFIG.colors.primaryCyan,
                side: THREE.DoubleSide
            })
        );
        chestDesign.position.z = 0.11;
        chestDesign.position.y = 0.2;
        
        body.add(torso);
        body.add(chestDesign);
        
        return body;
    }
    
    createHead() {
        const head = new THREE.Group();
        
        // Head base
        const headBase = new THREE.Mesh(
            new THREE.BoxGeometry(0.3, 0.3, 0.25),
            new THREE.MeshStandardMaterial({ 
                color: 0x333333,
                roughness: 0.8
            })
        );
        
        // Helmet/headphones
        const helmet = new THREE.Mesh(
            new THREE.CylinderGeometry(0.15, 0.15, 0.3, 16),
            new THREE.MeshStandardMaterial({ 
                color: 0x111111,
                roughness: 0.3,
                metalness: 0.6
            })
        );
        helmet.position.y = 0.2;
        helmet.rotation.x = Math.PI / 2;
        
        // Eyes (will be animated)
        this.leftEye = new THREE.Mesh(
            new THREE.SphereGeometry(0.03, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0x00ffff })
        );
        this.leftEye.position.set(-0.08, 0.05, 0.13);
        
        this.rightEye = new THREE.Mesh(
            new THREE.SphereGeometry(0.03, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0x00ffff })
        );
        this.rightEye.position.set(0.08, 0.05, 0.13);
        
        // Eye lids
        this.leftEyelid = new THREE.Mesh(
            new THREE.PlaneGeometry(0.06, 0.04),
            new THREE.MeshBasicMaterial({ color: 0x222222, side: THREE.DoubleSide })
        );
        this.leftEyelid.position.set(-0.08, 0.08, 0.14);
        this.leftEyelid.rotation.x = -0.3;
        
        this.rightEyelid = new THREE.Mesh(
            new THREE.PlaneGeometry(0.06, 0.04),
            new THREE.MeshBasicMaterial({ color: 0x222222, side: THREE.DoubleSide })
        );
        this.rightEyelid.position.set(0.08, 0.08, 0.14);
        this.rightEyelid.rotation.x = -0.3;
        
        head.add(headBase);
        head.add(helmet);
        head.add(this.leftEye);
        head.add(this.rightEye);
        head.add(this.leftEyelid);
        head.add(this.rightEyelid);
        
        return head;
    }
    
    createArm() {
        return new THREE.Mesh(
            new THREE.CylinderGeometry(0.04, 0.04, 0.6, 8),
            new THREE.MeshStandardMaterial({ 
                color: 0x222222,
                roughness: 0.7
            })
        );
    }
    
    createLeg() {
        return new THREE.Mesh(
            new THREE.CylinderGeometry(0.05, 0.05, 0.7, 8),
            new THREE.MeshStandardMaterial({ 
                color: 0x111111,
                roughness: 0.8
            })
        );
    }
    
    createHand() {
        const hand = new THREE.Group();
        
        // Hand base
        const handBase = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.04, 0.06),
            new THREE.MeshStandardMaterial({ color: 0x222222 })
        );
        
        // Fingers (5 fingers)
        this.fingers = [];
        for (let i = 0; i < 5; i++) {
            const finger = new THREE.Mesh(
                new THREE.CylinderGeometry(0.01, 0.005, 0.08, 4),
                new THREE.MeshStandardMaterial({ color: 0x333333 })
            );
            finger.position.x = (i - 2) * 0.02;
            finger.position.y = -0.02;
            finger.rotation.x = -0.3;
            this.fingers.push(finger);
            hand.add(finger);
        }
        
        hand.add(handBase);
        return hand;
    }
    
    update(deltaTime, phase, progress) {
        // Phase 3: Subtle eye and finger animation
        if (phase === 2) {
            // Eye blinking
            this.eyeBlink = Math.sin(Date.now() * 0.003) * 0.5 + 0.5;
            this.leftEyelid.position.y = 0.08 + (1 - this.eyeBlink) * 0.03;
            this.rightEyelid.position.y = 0.08 + (1 - this.eyeBlink) * 0.03;
            
            // Finger tapping
            this.fingerTap = Math.sin(Date.now() * 0.002) * 0.3 + 0.7;
            this.fingers.forEach((finger, i) => {
                finger.rotation.x = -0.3 + Math.sin(Date.now() * 0.002 + i * 0.5) * 0.1;
            });
        }
        
        // Phase 4: Palm press
        if (phase === 3) {
            const pressProgress = progress;
            this.arms[1].rotation.x = -0.5 + pressProgress * 1.0;
            this.arms[1].rotation.z = pressProgress * 0.5;
            this.hands[1].rotation.x = pressProgress * 0.8;
        }
        
        // Phase 5-6: Hand emergence
        if (phase >= 4) {
            const emergeProgress = Math.min(1, (phase - 4) + progress);
            this.handEmerge = emergeProgress;
            
            // Move right arm forward
            this.arms[1].position.z = -0.3 * emergeProgress;
            this.hands[1].position.z = -0.2 * emergeProgress;
        }
        
        // Phase 7-8: Full emergence and equipment pull
        if (phase >= 6) {
            const pullProgress = Math.min(1, (phase - 6) + progress);
            
            // Step out of the frame
            this.group.position.z = -2 * pullProgress;
            this.group.position.y = 0.5 * pullProgress;
            
            // Raise arms for pulling
            this.arms[0].rotation.x = -0.5 + pullProgress * 1.5;
            this.arms[1].rotation.x = -0.5 + pullProgress * 1.5;
        }
        
        // Phase 11: Performance animation
        if (phase === 10) {
            // DJ performance movements
            this.body.rotation.y = Math.sin(Date.now() * 0.002) * 0.1;
            this.arms[0].rotation.x = -0.5 + Math.sin(Date.now() * 0.003) * 0.3;
            this.arms[1].rotation.x = -0.5 + Math.sin(Date.now() * 0.003 + Math.PI) * 0.3;
        }
    }
}

class Turntable {
    constructor() {
        this.group = new THREE.Group();
        
        // Base
        const base = new THREE.Mesh(
            new THREE.BoxGeometry(0.8, 0.1, 0.6),
            new THREE.MeshStandardMaterial({ 
                color: 0x111111,
                roughness: 0.8,
                metalness: 0.2
            })
        );
        
        // Platter
        const platter = new THREE.Mesh(
            new THREE.CylinderGeometry(0.3, 0.3, 0.05, 32),
            new THREE.MeshStandardMaterial({ 
                color: 0x222222,
                roughness: 0.3,
                metalness: 0.7
            })
        );
        platter.position.y = 0.08;
        platter.rotation.x = Math.PI / 2;
        
        // Tonearm
        this.tonearm = new THREE.Group();
        const armBase = new THREE.Mesh(
            new THREE.CylinderGeometry(0.02, 0.02, 0.2, 8),
            new THREE.MeshStandardMaterial({ color: 0x333333 })
        );
        const arm = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 0.02, 0.02),
            new THREE.MeshStandardMaterial({ color: 0x444444 })
        );
        arm.position.x = 0.1;
        arm.position.y = 0.1;
        
        // Needle
        this.needle = new THREE.Mesh(
            new THREE.ConeGeometry(0.005, 0.03, 4),
            new THREE.MeshStandardMaterial({ color: 0x555555 })
        );
        this.needle.position.set(0.2, 0.15, 0);
        this.needle.rotation.x = -0.5;
        
        this.tonearm.add(armBase);
        this.tonearm.add(arm);
        this.tonearm.add(this.needle);
        this.tonearm.position.set(0.2, 0.1, 0);
        
        // Vinyl
        this.vinyl = new THREE.Mesh(
            new THREE.CylinderGeometry(0.28, 0.28, 0.02, 32),
            new THREE.MeshStandardMaterial({ 
                color: 0x000000,
                roughness: 0.1,
                metalness: 0.9
            })
        );
        this.vinyl.position.y = 0.09;
        this.vinyl.rotation.x = Math.PI / 2;
        
        // Label
        const label = new THREE.Mesh(
            new THREE.CylinderGeometry(0.1, 0.1, 0.01, 32),
            new THREE.MeshBasicMaterial({ color: 0xffffff })
        );
        label.position.y = 0.1;
        label.rotation.x = Math.PI / 2;
        
        this.group.add(base);
        this.group.add(platter);
        this.group.add(this.tonearm);
        this.group.add(this.vinyl);
        this.group.add(label);
        
        // Animation state
        this.isSpinning = false;
        this.spinSpeed = 0;
        this.needleDown = false;
    }
    
    update(deltaTime, phase, progress) {
        if (this.isSpinning) {
            this.vinyl.rotation.z += deltaTime * this.spinSpeed;
            this.group.rotation.z += deltaTime * this.spinSpeed * 0.1;
        }
        
        // Needle drop animation (phase 8-9)
        if (phase >= 7) {
            const needleProgress = Math.min(1, (phase - 7) + progress);
            this.needle.rotation.x = -0.5 + needleProgress * 1.0;
            this.needle.position.y = 0.15 - needleProgress * 0.05;
        }
    }
    
    dropNeedle() {
        this.isSpinning = true;
        this.spinSpeed = 2.0;
    }
}

class Mixer {
    constructor() {
        this.group = new THREE.Group();
        
        // Main body
        const body = new THREE.Mesh(
            new THREE.BoxGeometry(0.6, 0.15, 0.4),
            new THREE.MeshStandardMaterial({ 
                color: 0x111111,
                roughness: 0.7,
                metalness: 0.3
            })
        );
        
        // Faders
        this.faders = [];
        for (let i = 0; i < 4; i++) {
            const fader = new THREE.Group();
            const faderBase = new THREE.Mesh(
                new THREE.BoxGeometry(0.02, 0.08, 0.02),
                new THREE.MeshStandardMaterial({ color: 0x333333 })
            );
            const faderKnob = new THREE.Mesh(
                new THREE.SphereGeometry(0.015, 8, 8),
                new THREE.MeshStandardMaterial({ color: 0x555555 })
            );
            faderKnob.position.y = 0.04;
            
            fader.add(faderBase);
            fader.add(faderKnob);
            fader.position.x = (i - 1.5) * 0.1;
            fader.position.z = 0.1;
            
            this.faders.push(fader);
            this.group.add(fader);
        }
        
        // Knobs
        this.knobs = [];
        for (let i = 0; i < 6; i++) {
            const knob = new THREE.Mesh(
                new THREE.CylinderGeometry(0.02, 0.02, 0.03, 8),
                new THREE.MeshStandardMaterial({ 
                    color: 0x444444,
                    roughness: 0.3,
                    metalness: 0.6
                })
            );
            knob.position.set((i - 2.5) * 0.1, 0.08, -0.1);
            this.knobs.push(knob);
            this.group.add(knob);
        }
        
        this.group.add(body);
        
        // Animation state
        this.faderLevels = [0, 0, 0, 0];
    }
    
    update(deltaTime, phase, progress) {
        // Animate faders during performance
        if (phase >= 10) {
            this.faders.forEach((fader, i) => {
                const faderProgress = Math.sin(Date.now() * 0.002 + i * 0.5) * 0.5 + 0.5;
                fader.children[1].position.y = 0.04 + faderProgress * 0.03;
            });
            
            this.knobs.forEach((knob, i) => {
                knob.rotation.y += deltaTime * (0.5 + Math.sin(Date.now() * 0.001 + i) * 0.5);
            });
        }
    }
}

// ============================================
// ARTWORK PLANE
// ============================================

class ArtworkPlane {
    constructor(texturePath = null) {
        this.group = new THREE.Group();
        
        // Create a plane for the artwork
        const geometry = new THREE.PlaneGeometry(6, 4, 32, 32);
        
        let material;
        if (texturePath) {
            const texture = new THREE.TextureLoader().load(texturePath);
            material = new THREE.MeshBasicMaterial({ 
                map: texture,
                side: THREE.DoubleSide
            });
        } else {
            // Create a procedural Blue Dimension artwork
            material = new THREE.ShaderMaterial({
                uniforms: {
                    time: { value: 0 },
                    resolution: { value: new THREE.Vector2(6, 4) }
                },
                vertexShader: `
                    varying vec2 vUv;
                    void main() {
                        vUv = uv;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform float time;
                    uniform vec2 resolution;
                    varying vec2 vUv;
                    
                    void main() {
                        // Blue Dimension color scheme
                        vec3 blue1 = vec3(0.0, 0.3, 0.6);
                        vec3 blue2 = vec3(0.0, 0.5, 1.0);
                        vec3 cyan = vec3(0.0, 1.0, 1.0);
                        vec3 purple = vec3(0.5, 0.0, 1.0);
                        
                        // Create abstract geometric patterns
                        float pattern1 = sin(vUv.x * 10.0 + time * 0.1) * cos(vUv.y * 8.0 + time * 0.15);
                        float pattern2 = sin(vUv.x * 5.0 + time * 0.1) * cos(vUv.y * 12.0 + time * 0.2);
                        float pattern3 = sin(vUv.x * 15.0 + time * 0.2) * cos(vUv.y * 6.0 + time * 0.1);
                        
                        // Mix patterns
                        float pattern = (pattern1 + pattern2 + pattern3) * 0.33;
                        
                        // Color based on pattern
                        vec3 color = mix(blue1, blue2, pattern * 0.5 + 0.5);
                        color = mix(color, cyan, abs(pattern1) * 0.3);
                        color = mix(color, purple, abs(pattern2) * 0.2);
                        
                        // Add some glow
                        float glow = pow(pattern * 0.5 + 0.5, 2.0);
                        color += vec3(0.0, 0.5, 1.0) * glow * 0.2;
                        
                        // Add 97.5 MHz text overlay
                        if (vUv.x > 0.4 && vUv.x < 0.6 && vUv.y > 0.4 && vUv.y < 0.6) {
                            float textPattern = sin(vUv.x * 50.0) * cos(vUv.y * 30.0);
                            color = mix(color, vec3(0.0, 1.0, 1.0), textPattern * 0.5 + 0.5);
                        }
                        
                        gl_FragColor = vec4(color, 1.0);
                    }
                `,
                side: THREE.DoubleSide
            });
        }
        
        this.plane = new THREE.Mesh(geometry, material);
        this.group.add(this.plane);
        
        // Frame for the artwork
        this.frame = new THREE.Mesh(
            new THREE.BoxGeometry(6.2, 4.2, 0.1),
            new THREE.MeshStandardMaterial({ 
                color: 0x222222,
                roughness: 0.8,
                metalness: 0.3
            })
        );
        this.frame.position.z = -0.06;
        this.group.add(this.frame);
        
        // Glass effect
        this.glass = new THREE.Mesh(
            new THREE.PlaneGeometry(6, 4),
            new THREE.MeshPhysicalMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.2,
                transmission: 0.8,
                roughness: 0.1,
                thickness: 0.1
            })
        );
        this.glass.position.z = 0.01;
        this.group.add(this.glass);
        
        // Animation state
        this.distortion = 0;
        this.pulseActive = false;
        this.pulsePosition = new THREE.Vector2(0.5, 0.5);
    }
    
    update(deltaTime, phase, progress) {
        // Update shader time
        if (this.plane.material.uniforms && this.plane.material.uniforms.time) {
            this.plane.material.uniforms.time.value += deltaTime * 0.001;
        }
        
        // Phase 2: Cyan LoRa pulse
        if (phase === 1) {
            this.pulseActive = true;
            const pulseProgress = progress;
            this.pulsePosition.x = 0.5 + Math.sin(pulseProgress * Math.PI) * 0.3;
            this.pulsePosition.y = 0.5 + Math.cos(pulseProgress * Math.PI * 0.7) * 0.2;
        } else {
            this.pulseActive = false;
        }
        
        // Phase 5: RF membrane distortion
        if (phase === 4) {
            this.distortion = progress * 0.2;
            this.plane.geometry.verticesNeedUpdate = true;
            
            // Apply vertex distortion
            const vertices = this.plane.geometry.attributes.position;
            for (let i = 0; i < vertices.count; i++) {
                const x = vertices.getX(i);
                const y = vertices.getY(i);
                const dist = Math.sqrt(x * x + y * y);
                const distortion = this.distortion * (1 - dist / 3);
                vertices.setZ(i, distortion * Math.sin(dist * 10 + Date.now() * 0.002));
            }
            vertices.needsUpdate = true;
        }
        
        // Phase 12: Dissolve effect
        if (phase === 11) {
            const dissolveProgress = progress;
            this.plane.material.opacity = 1 - dissolveProgress;
            this.frame.material.opacity = 1 - dissolveProgress;
            this.glass.material.opacity = (1 - dissolveProgress) * 0.2;
        }
    }
}

// ============================================
// FLOOR WITH REFLECTIONS
// ============================================

class ReflectiveFloor {
    constructor(size = 20) {
        this.group = new THREE.Group();
        
        // Floor geometry
        const geometry = new THREE.PlaneGeometry(size, size, 64, 64);
        
        // Reflective material
        this.material = new THREE.MeshPhysicalMaterial({
            color: CONFIG.colors.floorReflection,
            roughness: 0.1,
            metalness: 0.9,
            reflectivity: 0.9,
            envMapIntensity: 0.5
        });
        
        this.floor = new THREE.Mesh(geometry, this.material);
        this.floor.rotation.x = -Math.PI / 2;
        this.floor.position.y = -1;
        this.group.add(this.floor);
        
        // Graphics spread effect
        this.graphics = [];
        this.graphicsSpread = 0;
    }
    
    update(deltaTime, phase, progress) {
        // Phase 10: Graphics spread
        if (phase === 9) {
            this.graphicsSpread = progress;
            
            // Create spreading graphics
            if (this.graphics.length === 0) {
                for (let i = 0; i < 50; i++) {
                    const graphic = new THREE.Mesh(
                        new THREE.PlaneGeometry(0.2, 0.2),
                        new THREE.MeshBasicMaterial({
                            color: new THREE.Color(
                                Math.random() * 0.5,
                                0.5 + Math.random() * 0.5,
                                0.8 + Math.random() * 0.2
                            ),
                            side: THREE.DoubleSide,
                            transparent: true,
                            opacity: 0.8
                        })
                    );
                    graphic.position.y = -0.99;
                    graphic.rotation.x = Math.PI / 2;
                    this.graphics.push(graphic);
                    this.group.add(graphic);
                }
            }
            
            // Animate graphics spreading
            this.graphics.forEach((graphic, i) => {
                const angle = (i / this.graphics.length) * Math.PI * 2;
                const radius = this.graphicsSpread * 8;
                graphic.position.x = Math.cos(angle) * radius;
                graphic.position.z = Math.sin(angle) * radius;
                graphic.position.y = -0.99 + Math.sin(Date.now() * 0.002 + i * 0.1) * 0.02;
                graphic.material.opacity = 0.8 * (1 - radius / 8);
            });
        }
    }
}

// ============================================
// BROADCAST FIELD
// ============================================

class BroadcastField {
    constructor() {
        this.group = new THREE.Group();
        
        // Create a large sphere for the broadcast field
        const geometry = new THREE.SphereGeometry(50, 32, 32);
        
        this.material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                frequency: { value: 97.5 },
                color: { value: new THREE.Color(CONFIG.colors.broadcastField) }
            },
            vertexShader: `
                varying vec2 vUv;
                varying vec3 vPosition;
                void main() {
                    vUv = uv;
                    vPosition = position;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform float frequency;
                uniform vec3 color;
                varying vec2 vUv;
                varying vec3 vPosition;
                
                void main() {
                    // Normalize position
                    vec3 normPos = normalize(vPosition);
                    
                    // Create radio wave patterns
                    float wave1 = sin(normPos.x * 10.0 + time * 2.0) * 0.5 + 0.5;
                    float wave2 = sin(normPos.y * 8.0 + time * 1.5) * 0.5 + 0.5;
                    float wave3 = sin(normPos.z * 6.0 + time * 1.0) * 0.5 + 0.5;
                    
                    float intensity = (wave1 + wave2 + wave3) / 3.0;
                    
                    // Base color
                    vec3 baseColor = color * intensity;
                    
                    // Add frequency-specific patterns
                    float freqPattern = sin(normPos.x * frequency * 2.0 + time) * 
                                       cos(normPos.y * frequency * 1.5 + time * 0.5);
                    baseColor += vec3(0.0, 0.5, 1.0) * freqPattern * 0.3;
                    
                    // Add scan lines
                    float scanLine = sin(vUv.y * 100.0 + time * 5.0) * 0.1 + 0.9;
                    
                    gl_FragColor = vec4(baseColor * scanLine, 0.3);
                }
            `,
            side: THREE.BackSide,
            transparent: true
        });
        
        this.sphere = new THREE.Mesh(geometry, this.material);
        this.group.add(this.sphere);
        
        // Animation state
        this.intensity = 0;
    }
    
    update(deltaTime, phase, progress) {
        this.material.uniforms.time.value += deltaTime * 0.001;
        
        // Phase 12: Fade in broadcast field
        if (phase === 11) {
            this.intensity = progress;
            this.material.uniforms.frequency.value = 97.5 * (1 + progress * 0.1);
            this.sphere.material.opacity = progress * 0.3;
        }
    }
}

// ============================================
// MAIN ANIMATION CLASS
// ============================================

class BlueDimensionHeroAnimation {
    constructor(container, options = {}) {
        // Merge options with defaults
        this.options = { ...CONFIG, ...options };
        this.container = container;
        
        // State management
        this.state = new AnimationState();
        
        // Three.js components
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.composer = null;
        this.controls = null;
        
        // Animation objects
        this.artwork = null;
        this.djFigure = null;
        this.turntable = null;
        this.mixer = null;
        this.floor = null;
        this.broadcastField = null;
        
        // Lighting
        this.lights = [];
        
        // Post-processing
        this.postProcessing = true;
        
        // Initialize
        this.init();
    }
    
    init() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(this.options.colors.ambient);
        
        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            this.options.camera.fov,
            this.container.clientWidth / this.container.clientHeight,
            this.options.camera.near,
            this.options.camera.far
        );
        this.camera.position.set(
            this.options.camera.initialPosition.x,
            this.options.camera.initialPosition.y,
            this.options.camera.initialPosition.z
        );
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: this.options.quality === 'high',
            alpha: true,
            powerPreference: "high-performance"
        });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        
        // Set target FPS
        this.renderer.setAnimationLoop(this.animate.bind(this));
        
        // Add renderer to container
        this.container.appendChild(this.renderer.domElement);
        
        // Create lights
        this.createLights();
        
        // Create objects
        this.createObjects();
        
        // Create post-processing
        if (this.postProcessing) {
            this.createPostProcessing();
        }
        
        // Handle window resize
        window.addEventListener('resize', this.onResize.bind(this));
        
        // Start animation
        this.state.start();
    }
    
    createLights() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(
            this.options.colors.ambient,
            0.5
        );
        this.scene.add(ambientLight);
        this.lights.push(ambientLight);
        
        // Main directional light
        const directionalLight = new THREE.DirectionalLight(
            this.options.colors.spotlight,
            1.0
        );
        directionalLight.position.set(5, 10, 7);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.camera.left = -20;
        directionalLight.shadow.camera.right = 20;
        directionalLight.shadow.camera.top = 20;
        directionalLight.shadow.camera.bottom = -20;
        this.scene.add(directionalLight);
        this.lights.push(directionalLight);
        
        // Cyan accent light (for LoRa pulse)
        this.cyanLight = new THREE.PointLight(
            this.options.colors.loraPulse,
            0,
            10
        );
        this.cyanLight.position.set(0, 2, 0);
        this.scene.add(this.cyanLight);
        this.lights.push(this.cyanLight);
        
        // Bass drop light
        this.bassLight = new THREE.PointLight(
            this.options.colors.bassDrop,
            0,
            15
        );
        this.bassLight.position.set(0, 5, 0);
        this.scene.add(this.bassLight);
        this.lights.push(this.bassLight);
    }
    
    createObjects() {
        // Artwork plane (2D image)
        this.artwork = new ArtworkPlane();
        this.artwork.group.position.z = -2;
        this.scene.add(this.artwork.group);
        
        // DJ action figure (initially inside the artwork)
        this.djFigure = new DJActionFigure();
        this.djFigure.group.position.set(0, 0, -1.5);
        this.djFigure.group.scale.set(0.8, 0.8, 0.8);
        this.scene.add(this.djFigure.group);
        
        // Turntable (will be pulled from artwork)
        this.turntable = new Turntable();
        this.turntable.group.position.set(2, -0.5, -1);
        this.turntable.group.visible = false;
        this.scene.add(this.turntable.group);
        
        // Mixer
        this.mixer = new Mixer();
        this.mixer.group.position.set(-2, -0.5, -1);
        this.mixer.group.visible = false;
        this.scene.add(this.mixer.group);
        
        // Reflective floor
        this.floor = new ReflectiveFloor();
        this.scene.add(this.floor.group);
        
        // Broadcast field (initially invisible)
        this.broadcastField = new BroadcastField();
        this.broadcastField.group.visible = false;
        this.scene.add(this.broadcastField.group);
    }
    
    createPostProcessing() {
        // Create composer
        this.composer = new EffectComposer(this.renderer);
        
        // Render pass
        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);
        
        // RGB Shift effect (for distortion)
        const rgbShiftPass = new ShaderPass(RGBShiftShader);
        rgbShiftPass.material.uniforms.amount.value = 0;
        this.composer.addPass(rgbShiftPass);
        
        // Film pass (cinematic look)
        const filmPass = new FilmPass(0.35, 0.75, 648, false);
        this.composer.addPass(filmPass);
        
        // Gamma correction
        const gammaPass = new ShaderPass(GammaCorrectionShader);
        this.composer.addPass(gammaPass);
    }
    
    onResize() {
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        
        if (this.composer) {
            this.composer.setSize(this.container.clientWidth, this.container.clientHeight);
        }
    }
    
    animate(deltaTime) {
        // Convert deltaTime from seconds to milliseconds
        deltaTime *= 1000;
        
        // Update animation state
        const phase = this.state.getCurrentPhase();
        const progress = this.state.getPhaseProgress();
        
        // Update all objects
        this.updateObjects(deltaTime, phase, progress);
        
        // Update lights
        this.updateLights(phase, progress);
        
        // Update camera
        this.updateCamera(phase, progress);
        
        // Render
        if (this.composer) {
            this.composer.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
    }
    
    updateObjects(deltaTime, phase, progress) {
        // Update artwork
        this.artwork.update(deltaTime, phase, progress);
        
        // Update DJ figure
        this.djFigure.update(deltaTime, phase, progress);
        
        // Update turntable
        this.turntable.update(deltaTime, phase, progress);
        
        // Update mixer
        this.mixer.update(deltaTime, phase, progress);
        
        // Update floor
        this.floor.update(deltaTime, phase, progress);
        
        // Update broadcast field
        this.broadcastField.update(deltaTime, phase, progress);
        
        // Phase-specific object visibility
        switch (phase) {
            case 0: // Static display
                this.djFigure.group.visible = false;
                this.turntable.group.visible = false;
                this.mixer.group.visible = false;
                break;
            
            case 1: // Cyan pulse
                this.djFigure.group.visible = true;
                break;
            
            case 2: // Subtle animation
                this.djFigure.group.visible = true;
                break;
            
            case 3: // Palm press
                this.djFigure.group.visible = true;
                break;
            
            case 4: // RF membrane
                this.djFigure.group.visible = true;
                break;
            
            case 5: // Hand emergence
                this.djFigure.group.visible = true;
                break;
            
            case 6: // Bass drop
                this.djFigure.group.visible = true;
                this.turntable.group.visible = true;
                this.mixer.group.visible = true;
                break;
            
            case 7: // Equipment pull
                this.djFigure.group.visible = true;
                this.turntable.group.visible = true;
                this.mixer.group.visible = true;
                break;
            
            case 8: // Needle drop
                this.turntable.dropNeedle();
                break;
            
            case 10: // Performance
                this.broadcastField.group.visible = true;
                break;
            
            case 11: // Dissolve
                this.broadcastField.group.visible = true;
                break;
        }
    }
    
    updateLights(phase, progress) {
        // Cyan light for pulse
        if (phase === 1) {
            this.cyanLight.intensity = progress * 2;
            this.cyanLight.position.x = Math.sin(progress * Math.PI) * 3;
            this.cyanLight.position.z = Math.cos(progress * Math.PI) * 2;
        } else {
            this.cyanLight.intensity = 0;
        }
        
        // Bass drop light
        if (phase === 6) {
            this.bassLight.intensity = progress * 3;
        } else {
            this.bassLight.intensity = 0;
        }
    }
    
    updateCamera(phase, progress) {
        // Smooth camera transitions between phases
        const targetPosition = new THREE.Vector3();
        const targetLookAt = new THREE.Vector3();
        
        switch (phase) {
            case 0: // Static
            case 1: // Pulse
            case 2: // Subtle animation
                targetPosition.copy(this.options.camera.initialPosition);
                targetLookAt.set(0, 0, -2);
                break;
            
            case 3: // Palm press
            case 4: // RF membrane
                targetPosition.set(0, 1, 6);
                targetLookAt.set(0, 0, -1.5);
                break;
            
            case 5: // Hand emergence
            case 6: // Bass drop
                targetPosition.set(0, 2, 5);
                targetLookAt.set(0, 0, -1);
                break;
            
            case 7: // Equipment pull
            case 8: // Needle drop
                targetPosition.set(1, 2, 4);
                targetLookAt.set(0, 0, 0);
                break;
            
            case 9: // Floor spread
            case 10: // Performance
                targetPosition.copy(this.options.camera.performancePosition);
                targetLookAt.set(0, 0, 0);
                break;
            
            case 11: // Dissolve
                targetPosition.set(0, 0, 20);
                targetLookAt.set(0, 0, 0);
                break;
        }
        
        // Smooth interpolation
        this.camera.position.lerp(targetPosition, 0.05);
        this.camera.lookAt(targetLookAt);
    }
    
    play() {
        this.state.start();
    }
    
    pause() {
        this.state.pause();
    }
    
    resume() {
        this.state.resume();
    }
    
    stop() {
        this.state.stop();
    }
    
    reset() {
        this.state.stop();
        this.state.start();
    }
    
    setPhase(phase) {
        this.state.currentPhase = phase;
        this.state.phaseStartTime = Date.now() - this.state.getPhaseStartTime(phase);
    }
    
    destroy() {
        // Clean up
        this.renderer.setAnimationLoop(null);
        this.container.removeChild(this.renderer.domElement);
        
        // Dispose of resources
        this.scene.traverse(object => {
            if (object.isMesh) {
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                    if (object.material instanceof Array) {
                        object.material.forEach(material => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            }
        });
        
        this.renderer.dispose();
        
        if (this.composer) {
            this.composer.passes.forEach(pass => pass.dispose());
            this.composer.dispose();
        }
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function createHeroAnimation(containerId = 'hero-animation', options = {}) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container with id '${containerId}' not found.`);
        return null;
    }
    
    return new BlueDimensionHeroAnimation(container, options);
}

// ============================================
// AUTO-INITIALIZATION
// ============================================

// Auto-initialize if container exists
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        const heroContainer = document.getElementById('hero-animation');
        if (heroContainer) {
            window.heroAnimation = createHeroAnimation();
        }
    });
}

// Export for module usage
export { BlueDimensionHeroAnimation, createHeroAnimation, CONFIG };
