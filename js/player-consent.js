// Zwei-Klick-Player: Ein Drittanbieter-Player (SoundCloud, Mixcloud) wird erst
// nach aktivem Klick geladen. Vorher geht kein Request an den Anbieter.
// Die Entscheidung wird bewusst nicht gespeichert: jeder Seitenaufruf startet
// ohne Drittanbieter-Verbindung.
(function () {
  'use strict';

  var ALLOWED_HOSTS = ['w.soundcloud.com', 'player-widget.mixcloud.com', 'www.mixcloud.com'];

  function isAllowed(src) {
    try {
      var url = new URL(src);
      return url.protocol === 'https:' && ALLOWED_HOSTS.indexOf(url.hostname) !== -1;
    } catch (e) {
      return false;
    }
  }

  function load(box) {
    var src = box.getAttribute('data-src');
    if (!src || !isAllowed(src)) return;
    var frame = document.createElement('iframe');
    frame.src = src;
    frame.title = box.getAttribute('data-title') || 'Audio-Player';
    frame.width = '100%';
    frame.height = box.getAttribute('data-height') || '220';
    frame.setAttribute('allow', 'autoplay');
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    var slot = box.querySelector('.player-slot');
    slot.replaceChildren(frame);
    box.classList.add('is-loaded');
    frame.focus();
  }

  document.querySelectorAll('.player-consent').forEach(function (box) {
    var button = box.querySelector('.player-load');
    if (!button) return;
    button.addEventListener('click', function () { load(box); }, { once: true });
  });
})();
