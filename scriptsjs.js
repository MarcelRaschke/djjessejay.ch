// DJ Jesse Jay Website JavaScript
// Main functionality for interactive features

document.addEventListener('DOMContentLoaded', function() {
    
    // Initialize all features
    initCookieBanner();
    initContactForm();
    initLanguageSelector();
    initMediaPlayer();
    initScrollAnimations();
    
    console.log('DJ Jesse Jay website initialized');
});

// Cookie Banner Management
function initCookieBanner() {
    const cookieBanner = document.querySelector('.cookie-banner');
    const acceptBtn = document.querySelector('.cookie-accept');
    const rejectBtn = document.querySelector('.cookie-reject');
    
    // Check if cookies were already accepted
    if (localStorage.getItem('cookiesAccepted') === 'true') {
        hideCookieBanner();
        return;
    }
    
    // Show banner if not already accepted
    if (cookieBanner) {
        cookieBanner.style.display = 'block';
    }
    
    // Accept cookies
    if (acceptBtn) {
        acceptBtn.addEventListener('click', function() {
            localStorage.setItem('cookiesAccepted', 'true');
            hideCookieBanner();
            enableAnalytics();
        });
    }
    
    // Reject cookies
    if (rejectBtn) {
        rejectBtn.addEventListener('click', function() {
            localStorage.setItem('cookiesAccepted', 'false');
            hideCookieBanner();
        });
    }
}

function hideCookieBanner() {
    const cookieBanner = document.querySelector('.cookie-banner');
    if (cookieBanner) {
        cookieBanner.style.display = 'none';
    }
}

function enableAnalytics() {
    // Placeholder for analytics code
    console.log('Analytics enabled');
}

// Contact Form Handler
function initContactForm() {
    const contactForm = document.querySelector('#contact-form');
    const successMessage = document.querySelector('#form-success');
    const errorMessage = document.querySelector('#form-error');
    
    if (!contactForm) return;
    
    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Hide previous messages
        hideFormMessages();
        
        // Get form data
        const formData = new FormData(contactForm);
        const data = {
            name: formData.get('name'),
            email: formData.get('email'),
            message: formData.get('message'),
            privacy: formData.get('privacy')
        };
        
        // Validate form
        if (!validateContactForm(data)) {
            showErrorMessage('Bitte füllen Sie alle Felder aus und akzeptieren Sie die Datenschutzbestimmungen.');
            return;
        }
        
        // Submit form (placeholder - replace with actual endpoint)
        submitContactForm(data);
    });
}

function validateContactForm(data) {
    return data.name && 
           data.email && 
           data.message && 
           data.privacy &&
           isValidEmail(data.email);
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function submitContactForm(data) {
    // Simulate form submission
    console.log('Submitting form:', data);
    
    // Show loading state
    const submitBtn = document.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Senden...';
    }
    
    // Simulate API call
    setTimeout(() => {
        // Reset button
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Senden';
        }
        
        // Show success message
        showSuccessMessage('Ihre Nachricht wurde erfolgreich gesendet!');
        
        // Reset form
        document.querySelector('#contact-form').reset();
    }, 2000);
}

function showSuccessMessage(message) {
    const successEl = document.querySelector('#form-success');
    if (successEl) {
        successEl.textContent = message;
        successEl.classList.remove('hidden');
        setTimeout(() => successEl.classList.add('hidden'), 5000);
    }
}

function showErrorMessage(message) {
    const errorEl = document.querySelector('#form-error');
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.remove('hidden');
        setTimeout(() => errorEl.classList.add('hidden'), 5000);
    }
}

function hideFormMessages() {
    const successEl = document.querySelector('#form-success');
    const errorEl = document.querySelector('#form-error');
    
    if (successEl) successEl.classList.add('hidden');
    if (errorEl) errorEl.classList.add('hidden');
}

// Language Selector
function initLanguageSelector() {
    const langLinks = document.querySelectorAll('.language-selector a');
    
    langLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const lang = this.getAttribute('data-lang');
            
            // Remove active class from all links
            langLinks.forEach(l => l.classList.remove('active'));
            
            // Add active class to clicked link
            this.classList.add('active');
            
            // Change language
            changeLanguage(lang);
        });
    });
}

function changeLanguage(lang) {
    console.log('Changing language to:', lang);
    
    // Store selected language
    localStorage.setItem('selectedLanguage', lang);
    
    // Update translatable elements
    const translatableElements = document.querySelectorAll('.translate');
    
    translatableElements.forEach(element => {
        const key = element.getAttribute('key');
        const translation = getTranslation(key, lang);
        
        if (translation) {
            element.textContent = translation;
        }
    });
}

function getTranslation(key, lang) {
    const translations = {
        'biography': {
            'de': 'Biografie',
            'en': 'Biography',
            'fr': 'Biographie',
            'it': 'Biografia'
        },
        'music': {
            'de': 'Musik',
            'en': 'Music',
            'fr': 'Musique',
            'it': 'Musica'
        },
        'contact': {
            'de': 'Kontakt',
            'en': 'Contact',
            'fr': 'Contact',
            'it': 'Contatto'
        },
        'privacy': {
            'de': 'Datenschutz',
            'en': 'Privacy',
            'fr': 'Confidentialité',
            'it': 'Privacy'
        }
    };
    
    return translations[key] && translations[key][lang] || null;
}

// Media Player
function initMediaPlayer() {
    const mediaContainer = document.querySelector('.media-container');
    
    if (!mediaContainer) return;
    
    // Create placeholder for media content
    if (mediaContainer.children.length === 0) {
        mediaContainer.innerHTML = `
            <div class="media-placeholder">
                <h3>Musik von DJ Jesse Jay</h3>
                <p>Mixed Sets und Tracks</p>
                <div class="media-links">
                    <a href="https://soundcloud.com/jessejay" target="_blank" class="btn">
                        SoundCloud besuchen
                    </a>
                </div>
            </div>
        `;
    }
}

// Scroll Animations
function initScrollAnimations() {
    const animatedElements = document.querySelectorAll('.section');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, {
        threshold: 0.1
    });
    
    animatedElements.forEach(element => {
        observer.observe(element);
    });
}

// Smooth Scrolling for Navigation Links
document.addEventListener('click', function(e) {
    if (e.target.matches('a[href^="#"]')) {
        e.preventDefault();
        
        const targetId = e.target.getAttribute('href').substring(1);
        const targetElement = document.getElementById(targetId);
        
        if (targetElement) {
            targetElement.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    }
});

// ReCAPTCHA Integration (placeholder)
function initRecaptcha() {
    // This would be called when reCAPTCHA is properly configured
    console.log('reCAPTCHA integration placeholder');
}

// Download Files Handler
function initDownloadHandler() {
    const downloadBtn = document.querySelector('#download-files');
    
    if (downloadBtn) {
        downloadBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Placeholder for download functionality
            alert('Download-Funktion wird vorbereitet...');
        });
    }
}

// Initialize download handler on load
document.addEventListener('DOMContentLoaded', initDownloadHandler);

// Error Handling
window.addEventListener('error', function(e) {
    console.error('JavaScript Error:', e.error);
});

// Performance Monitoring
window.addEventListener('load', function() {
    const loadTime = performance.now();
    console.log('Page loaded in:', Math.round(loadTime), 'ms');
});

// Export functions for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        validateContactForm,
        isValidEmail,
        getTranslation
    };
}