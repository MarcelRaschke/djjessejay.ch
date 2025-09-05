// DJ Jesse Jay Website Scripts
// Since 1997 the progressive music attack from Zürich

// Basic website functionality
document.addEventListener('DOMContentLoaded', function() {
    // Initialize any interactive elements
    initializeAudioPlayers();
    initializeContactForm();
    initializeGallery();
});

// Audio player functionality
function initializeAudioPlayers() {
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach(audio => {
        audio.addEventListener('loadstart', function() {
            console.log('Loading audio track...');
        });
    });
}

// Contact form functionality  
function initializeContactForm() {
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            // Handle form submission
            console.log('Contact form submitted');
        });
    }
}

// Gallery functionality
function initializeGallery() {
    const galleryItems = document.querySelectorAll('.gallery-item');
    galleryItems.forEach(item => {
        item.addEventListener('click', function() {
            // Handle gallery item click
            console.log('Gallery item clicked');
        });
    });
}

// Utility functions
function detectFlashPlugin() {
    // Modern replacement for Flash detection
    return false; // Flash is no longer supported
}

// Music player controls
function playTrack(trackId) {
    const audio = document.getElementById(trackId);
    if (audio) {
        audio.play();
    }
}

function pauseTrack(trackId) {
    const audio = document.getElementById(trackId);
    if (audio) {
        audio.pause();
    }
}