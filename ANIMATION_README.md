# DJ Jesse Jay - Blue Dimension Hero Animation

A cinematic 3D WebGL experience that transforms the original Blue Dimension 97.5 MHz collector artwork from a flat, motionless 2D image into a live DJ performance.

## Concept Overview

The animation follows a **12-phase cinematic sequence** that tells the story of DJ Jesse Jay emerging from his artwork into a full 3D performance:

### Phase Breakdown

1. **Static Display** (2s)
   - Blue Dimension 97.5 MHz artwork displayed completely flat and motionless
   - Clean, gallery-style presentation

2. **Cyan LoRa Pulse** (3s)
   - A cyan-colored radio frequency pulse travels through the printed artwork
   - Represents the 97.5 MHz signal activating the scene
   - Custom shader effect for organic wave propagation

3. **Subtle Animation** (4s)
   - DJ action figure inside the image subtly moves eyes and fingers
   - Surrounding artwork remains frozen
   - Creates tension and anticipation

4. **Palm Press** (2s)
   - Character presses palm against the image surface
   - First physical interaction with the 2D plane
   - Camera focuses on the point of contact

5. **RF Membrane** (3s)
   - Artwork behaves like a flexible radio-frequency membrane
   - Vertex distortion shader creates organic deformation
   - The boundary between 2D and 3D begins to blur

6. **Hand Emergence** (2.5s)
   - Hand emerges physically into real space
   - Breaks the fourth wall
   - First 3D element escaping the 2D plane

7. **Bass Drop** (1.5s)
   - Dramatic moment of transformation
   - Complete identity-preserving DJ Jesse Jay action figure steps out
   - Lighting and camera shake effects

8. **Equipment Pull** (3s)
   - DJ reaches back through the now-flat image
   - Pulls out physical turntable, mixer, and vinyl
   - Sequential emergence of performance tools

9. **Needle Drop** (1s)
   - Vinyl placed on turntable
   - Needle drops onto record
   - Audio visualization begins

10. **Floor Graphics Spread** (2s)
    - Printed Blue Dimension graphics spread across reflective floor
    - Creates immersive environment
    - Graphics animate outward from center

11. **Performance** (5s)
    - Controlled 120fps DJ and TechDancer performance
    - Synchronized lighting and effects
    - Full 3D character animation

12. **Broadcast Field Dissolve** (2s)
    - Artwork frame dissolves into 360-degree 97.5 MHz broadcast field
    - Seamless transition to radio wave visualization
    - Final cinematic reveal

## File Structure

```
js/
├── hero-animation.js      # Full 3D WebGL version (Three.js)
└── hero-simple.js         # Lightweight 2D/3D hybrid fallback

css/
└── hero-animation.css     # Styles for the animation

hero-test.html             # Standalone test page
```

## Implementation Options

### Option 1: Full 3D WebGL (Recommended)

Uses Three.js for hardware-accelerated 3D graphics with custom shaders.

```html
<!-- In your HTML head -->
<script type="module">
    import { BlueDimensionHeroAnimation } from './js/hero-animation.js';
</script>

<!-- In your HTML body -->
<div id="hero-animation"></div>

<script>
    // Initialize after DOM load
    document.addEventListener('DOMContentLoaded', () => {
        const animation = new BlueDimensionHeroAnimation(
            document.getElementById('hero-animation'),
            {
                quality: 'high',
                targetFPS: 120
            }
        );
        
        // Control the animation
        animation.play();
        animation.pause();
        animation.reset();
    });
</script>
```

**Requirements:**
- Modern browser with WebGL 2.0 support
- ES6 module support
- ~5MB download (Three.js + dependencies)

### Option 2: Lightweight Fallback

Uses CSS animations and simple DOM manipulation for broader compatibility.

```html
<!-- In your HTML -->
<div id="hero-animation"></div>

<script src="./js/hero-simple.js"></script>
<script>
    // Auto-initializes on DOM ready
    // Or manually:
    const animation = initHeroAnimation('hero-animation', {
        duration: 30000,
        autoPlay: true,
        loop: false
    });
</script>
```

**Requirements:**
- Any modern browser
- No WebGL required
- ~50KB download

## Configuration Options

### Full 3D Version

```javascript
const options = {
    // Timing (milliseconds)
    timings: {
        initialDelay: 1000,
        phase1_static: 2000,
        phase2_pulse: 3000,
        phase3_subtleAnimation: 4000,
        phase4_palmPress: 2000,
        phase5_membrane: 3000,
        phase6_handEmerge: 2500,
        phase7_bassDrop: 1500,
        phase8_equipmentPull: 3000,
        phase9_needleDrop: 1000,
        phase10_floorSpread: 2000,
        phase11_performance: 5000,
        phase12_dissolve: 2000,
        totalDuration: 30000
    },
    
    // Colors
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
    
    // Camera
    camera: {
        fov: 75,
        near: 0.1,
        far: 1000,
        initialPosition: { x: 0, y: 0, z: 8 },
        performancePosition: { x: 0, y: 2, z: 6 }
    },
    
    // Performance
    targetFPS: 120,
    quality: 'high' // 'low', 'medium', 'high'
};
```

### Simple Version

```javascript
const options = {
    duration: 30000,      // Total animation duration
    autoPlay: true,       // Start automatically
    loop: false          // Loop after completion
};
```

## Customization

### Using Custom Artwork

Replace the procedural artwork with your own image:

```javascript
// In hero-animation.js
const artwork = new ArtworkPlane('path/to/your-artwork.jpg');
```

### Adjusting Colors

Modify the color palette to match your brand:

```javascript
const customColors = {
    ...CONFIG.colors,
    primaryCyan: 0x00ffaa,
    loraPulse: 0x00ffcc,
    broadcastField: 0x1a237e
};

const animation = new BlueDimensionHeroAnimation(container, {
    colors: customColors
});
```

### Changing Animation Speed

Adjust individual phase durations:

```javascript
const customTimings = {
    ...CONFIG.timings,
    phase2_pulse: 5000,  // Make pulse phase longer
    phase11_performance: 10000  // Extend performance
};

const animation = new BlueDimensionHeroAnimation(container, {
    timings: customTimings
});
```

## Browser Support

### Full 3D Version

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome | ✅ Full | Best performance |
| Firefox | ✅ Full | Good performance |
| Safari | ✅ Full | May need flags |
| Edge | ✅ Full | Chromium-based |
| Mobile Chrome | ⚠️ Partial | Performance varies |
| Mobile Safari | ⚠️ Partial | Limited WebGL |
| IE11 | ❌ None | Not supported |

### Simple Version

| Browser | Support |
|---------|---------|
| All modern browsers | ✅ Full |
| IE11 | ⚠️ Partial | Basic functionality |

## Performance Optimization

### For High-End Devices

```javascript
const animation = new BlueDimensionHeroAnimation(container, {
    quality: 'high',
    targetFPS: 120,
    postProcessing: true
});
```

### For Mid-Range Devices

```javascript
const animation = new BlueDimensionHeroAnimation(container, {
    quality: 'medium',
    targetFPS: 60,
    postProcessing: true
});
```

### For Low-End Devices

```javascript
const animation = new BlueDimensionHeroAnimation(container, {
    quality: 'low',
    targetFPS: 30,
    postProcessing: false
});
```

### Automatic Quality Detection

```javascript
function detectQuality() {
    const memory = navigator.deviceMemory || 4;
    const connection = navigator.connection || { effectiveType: '4g' };
    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    
    if (memory < 4 || connection.effectiveType === 'slow-2g' || isMobile) {
        return 'low';
    } else if (memory < 8 || connection.effectiveType === '3g') {
        return 'medium';
    }
    return 'high';
}

const animation = new BlueDimensionHeroAnimation(container, {
    quality: detectQuality()
});
```

## API Reference

### BlueDimensionHeroAnimation

#### Methods

- `play()` - Start the animation
- `pause()` - Pause the animation
- `resume()` - Resume from pause
- `stop()` - Stop and reset to beginning
- `reset()` - Reset to beginning and play
- `setPhase(phase)` - Jump to specific phase (0-11)
- `destroy()` - Clean up resources

#### Properties

- `state.currentPhase` - Current phase (0-11)
- `state.isPlaying` - Whether animation is playing
- `state.isPaused` - Whether animation is paused
- `options` - Configuration options

#### Events

```javascript
// Listen for phase changes
animation.addEventListener('phaseChange', (phase) => {
    console.log(`Phase changed to: ${phase}`);
});

// Listen for completion
animation.addEventListener('complete', () => {
    console.log('Animation complete');
});
```

### BlueDimensionHeroSimple

#### Methods

- `play()` - Start the animation
- `pause()` - Pause the animation
- `resume()` - Resume from pause
- `stop()` - Stop and reset
- `reset()` - Reset and play
- `destroy()` - Clean up

#### Properties

- `getCurrentPhase()` - Get current phase
- `getProgress()` - Get overall progress (0-1)

## Integration with Existing Website

### Adding to index.html

1. Add the container div:

```html
<!-- In the body, where you want the hero section -->
<section id="hero" class="min-h-screen relative">
    <div id="hero-animation"></div>
    <div class="hero-content absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <h1 class="text-4xl font-bold text-cyan-400">DJ Jesse Jay</h1>
        <p class="text-xl text-slate-300 mt-4">The Blue Dimension</p>
    </div>
</section>
```

2. Add the CSS:

```html
<link rel="stylesheet" href="css/hero-animation.css">
```

3. Add the JavaScript:

```html
<script type="module" src="js/hero-animation.js"></script>
<script>
    document.addEventListener('DOMContentLoaded', () => {
        window.heroAnimation = new BlueDimensionHeroAnimation(
            document.getElementById('hero-animation')
        );
    });
</script>
```

### With Fallback

```html
<script>
    // Try to load WebGL version
    function loadHeroAnimation() {
        try {
            // Check if WebGL is supported
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            
            if (gl) {
                // Load WebGL version
                const script = document.createElement('script');
                script.type = 'module';
                script.src = 'js/hero-animation.js';
                script.onload = () => {
                    window.heroAnimation = new BlueDimensionHeroAnimation(
                        document.getElementById('hero-animation')
                    );
                };
                document.head.appendChild(script);
            } else {
                // Fall back to simple version
                const script = document.createElement('script');
                script.src = 'js/hero-simple.js';
                document.head.appendChild(script);
            }
        } catch (e) {
            // Fall back to simple version
            const script = document.createElement('script');
            script.src = 'js/hero-simple.js';
            document.head.appendChild(script);
        }
    }
    
    document.addEventListener('DOMContentLoaded', loadHeroAnimation);
</script>
```

## Testing

### Run the Test Page

Open `hero-test.html` in your browser to see the animation in action.

### Controls

- **Space** - Play/Pause
- **R** - Reset
- **Play Button** - Start animation
- **Pause Button** - Pause animation
- **Reset Button** - Reset animation

### Debug Mode

Add `?debug=true` to the URL to enable debug information:
- Phase indicator
- Progress bar
- FPS counter
- Memory usage

## Troubleshooting

### Animation Not Starting

1. Check if the container element exists
2. Verify WebGL support in your browser
3. Check browser console for errors
4. Ensure ES6 modules are supported

### Performance Issues

1. Reduce quality setting
2. Disable post-processing
3. Lower target FPS
4. Reduce particle count

### Visual Glitches

1. Update Three.js to latest version
2. Check for conflicting CSS
3. Verify z-index ordering
4. Ensure proper transparency sorting

## Future Enhancements

- [ ] Add audio synchronization
- [ ] Implement VR/AR support
- [ ] Add touch interaction for mobile
- [ ] Create custom 3D models for DJ figure
- [ ] Add particle effects for bass drops
- [ ] Implement dynamic lighting based on music
- [ ] Add camera path animation
- [ ] Create multiple scene variations

## Credits

- **Concept**: DJ Jesse Jay & Vibe Code
- **3D Engine**: Three.js
- **Shaders**: Custom GLSL
- **Design**: Inspired by Blue Dimension 97.5 MHz artwork

## License

MIT License - Feel free to use, modify, and distribute.

---

**DJ Jesse Jay - Since 1997 the progressive music attack from Zürich**

*Betreiber der Radiosendung "The Blue Dimension" auf Radio LoRa 97.5 FM*
