
// --- Form Handling ---
document.addEventListener('DOMContentLoaded', function() {
    var contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            var name = contactForm.querySelector('[name="name"]').value.trim();
            var email = contactForm.querySelector('[name="email"]').value.trim();
            var message = contactForm.querySelector('[name="message"]').value.trim();
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
