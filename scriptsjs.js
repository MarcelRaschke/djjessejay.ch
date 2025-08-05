// DJ Jesse Jay Website JavaScript

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DJ Jesse Jay website loaded successfully!');
    
    // Initialize website functionality
    initWebsite();
});

function initWebsite() {
    // Add smooth scrolling for anchor links
    addSmoothScrolling();
    
    // Add video lazy loading
    addVideoLazyLoading();
    
    // Add mobile menu functionality
    addMobileMenu();
    
    // Add scroll animations
    addScrollAnimations();
}

function addSmoothScrolling() {
    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

function addVideoLazyLoading() {
    // Lazy load videos for better performance
    const videos = document.querySelectorAll('iframe[src*="clipchamp.com"]');
    
    const videoObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const iframe = entry.target;
                if (iframe.dataset.src) {
                    iframe.src = iframe.dataset.src;
                    iframe.removeAttribute('data-src');
                }
                videoObserver.unobserve(iframe);
            }
        });
    });
    
    videos.forEach(video => {
        videoObserver.observe(video);
    });
}

function addMobileMenu() {
    // Mobile menu toggle functionality
    const menuToggle = document.querySelector('.menu-toggle');
    const mobileMenu = document.querySelector('.mobile-menu');
    
    if (menuToggle && mobileMenu) {
        menuToggle.addEventListener('click', function() {
            mobileMenu.classList.toggle('active');
            this.classList.toggle('active');
        });
    }
}

function addScrollAnimations() {
    // Add scroll-triggered animations
    const animatedElements = document.querySelectorAll('.wp-block-image, .video-container');
    
    const animationObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, {
        threshold: 0.1
    });
    
    animatedElements.forEach(element => {
        animationObserver.observe(element);
    });
}

// Video player controls
function playVideo(videoId) {
    const video = document.querySelector(`[data-video-id="${videoId}"]`);
    if (video) {
        video.play();
    }
}

function pauseVideo(videoId) {
    const video = document.querySelector(`[data-video-id="${videoId}"]`);
    if (video) {
        video.pause();
    }
}

// Social media sharing
function shareOnSocial(platform, url, text) {
    const shareUrls = {
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
        twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
    };
    
    if (shareUrls[platform]) {
        window.open(shareUrls[platform], '_blank', 'width=600,height=400');
    }
}

// Analytics tracking
function trackEvent(eventName, eventData) {
    // Google Analytics tracking (if available)
    if (typeof gtag !== 'undefined') {
        gtag('event', eventName, eventData);
    }
    
    // Console logging for debugging
    console.log('Event tracked:', eventName, eventData);
}

// Performance monitoring
function measurePageLoadTime() {
    window.addEventListener('load', function() {
        const loadTime = performance.now();
        console.log(`Page loaded in ${loadTime.toFixed(2)}ms`);
        trackEvent('page_load_time', { load_time: loadTime });
    });
}

// Error handling
window.addEventListener('error', function(e) {
    console.error('Website error:', e.error);
    trackEvent('error', { 
        message: e.message, 
        filename: e.filename, 
        lineno: e.lineno 
    });
});

// Initialize performance monitoring
measurePageLoadTime();