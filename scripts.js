/**
 * DJ Jesse Jay Website Scripts
 * Since 1997 - The Progressive Music Attack
 */

// Basic website functionality for DJ Jesse Jay site
(function() {
    'use strict';

    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', function() {
        
        // Cookie banner functionality
        const cookieBanner = document.getElementById('cookie-banner');
        if (cookieBanner) {
            // Show cookie banner if no consent stored
            if (!localStorage.getItem('cookie-consent')) {
                cookieBanner.classList.add('show');
            }
            
            // Handle cookie acceptance
            const acceptBtn = document.querySelector('.cookie-accept');
            const declineBtn = document.querySelector('.cookie-decline');
            
            if (acceptBtn) {
                acceptBtn.addEventListener('click', function() {
                    localStorage.setItem('cookie-consent', 'accepted');
                    cookieBanner.classList.remove('show');
                });
            }
            
            if (declineBtn) {
                declineBtn.addEventListener('click', function() {
                    localStorage.setItem('cookie-consent', 'declined');
                    cookieBanner.classList.remove('show');
                });
            }
        }

        // Language selector functionality
        const languageSelector = document.querySelector('.language-selector');
        if (languageSelector) {
            const langLinks = languageSelector.querySelectorAll('a[data-lang]');
            langLinks.forEach(function(link) {
                link.addEventListener('click', function(e) {
                    e.preventDefault();
                    const lang = this.getAttribute('data-lang');
                    
                    // Update active state
                    langLinks.forEach(l => l.classList.remove('active'));
                    this.classList.add('active');
                    
                    // Store language preference
                    localStorage.setItem('preferred-language', lang);
                    
                    // Apply language (placeholder for future i18n)
                    console.log('Language changed to:', lang);
                });
            });
        }

        // Smooth scrolling for anchor links
        const anchorLinks = document.querySelectorAll('a[href^="#"]');
        anchorLinks.forEach(function(link) {
            link.addEventListener('click', function(e) {
                const href = this.getAttribute('href');
                if (href !== '#') {
                    const target = document.querySelector(href);
                    if (target) {
                        e.preventDefault();
                        target.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        });
                    }
                }
            });
        });

        // Contact form handling (if present)
        const contactForm = document.querySelector('#contact-form');
        if (contactForm) {
            contactForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                // Basic form validation
                const name = this.querySelector('#name');
                const email = this.querySelector('#email');
                const message = this.querySelector('#message');
                const privacy = this.querySelector('#privacy');
                
                let isValid = true;
                
                if (!name || !name.value.trim()) {
                    isValid = false;
                }
                
                if (!email || !email.value.trim() || !isValidEmail(email.value)) {
                    isValid = false;
                }
                
                if (!message || !message.value.trim()) {
                    isValid = false;
                }
                
                if (!privacy || !privacy.checked) {
                    isValid = false;
                }
                
                if (isValid) {
                    // Show success message
                    const successMsg = document.querySelector('#form-success');
                    if (successMsg) {
                        successMsg.classList.remove('hidden');
                    }
                    this.reset();
                } else {
                    // Show error message
                    const errorMsg = document.querySelector('#form-error');
                    if (errorMsg) {
                        errorMsg.classList.remove('hidden');
                    }
                }
            });
        }

        // Auto-hide messages after 5 seconds
        const messages = document.querySelectorAll('.form-message');
        messages.forEach(function(msg) {
            if (!msg.classList.contains('hidden')) {
                setTimeout(function() {
                    msg.classList.add('hidden');
                }, 5000);
            }
        });
    });

    // Helper function for email validation
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Progressive music attack console message
    console.log('🎵 DJ Jesse Jay :: Since 1997 the progressive music attack :: 🎵');
    console.log('Website loaded successfully!');

})();