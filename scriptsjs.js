
// --- Form Handling ---
document.addEventListener('DOMContentLoaded', function() {
    var contactForm = document.getElementById('contact-form');
    if (contactForm) {
        var nameInput = contactForm.querySelector('[name="name"]');
        var emailInput = contactForm.querySelector('[name="email"]');
        var messageInput = contactForm.querySelector('[name="message"]');
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            var name = nameInput.value.trim();
            var email = emailInput.value.trim();
            var message = messageInput.value.trim();
            if (!name || !email || !message) {
                alert('Please fill in all fields.');
                return;
            }
            // Simulate AJAX submission
            setTimeout(function() {
                alert('Thank you for your message, ' + name + '!');
                contactForm.reset();
            }, 500);
        });
    }

    // --- Language Switching ---
    var langSwitcher = document.getElementById('lang-switcher');
    if (langSwitcher) {
        langSwitcher.addEventListener('change', function() {
            var selectedLang = langSwitcher.value;
            var elements = document.querySelectorAll('[data-lang]');
            elements.forEach(function(el) {
                el.style.display = (el.getAttribute('data-lang') === selectedLang) ? '' : 'none';
            });
        });
    }

    // --- Animations ---
    var animatedEls = document.querySelectorAll('.fade-in');
    animatedEls.forEach(function(el) {
        el.style.opacity = 0;
        el.style.transition = 'opacity 1s';
    });
    window.addEventListener('scroll', function() {
        animatedEls.forEach(function(el) {
            var rect = el.getBoundingClientRect();
            if (rect.top < window.innerHeight) {
                el.style.opacity = 1;
            }
        });
    });
});
