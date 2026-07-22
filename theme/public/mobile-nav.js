(function () {
  if (window.__arogyaNavBound) return;
  window.__arogyaNavBound = true;

  function setOpen(open) {
    var header = document.querySelector('[data-site-header]');
    var panel = document.querySelector('[data-nav-panel]');
    var toggle = document.querySelector('[data-nav-toggle]');
    document.body.classList.toggle('nav-menu-open', !!open);
    if (header) header.classList.toggle('is-nav-open', !!open);
    if (panel) {
      if (open) panel.removeAttribute('hidden');
      else panel.setAttribute('hidden', '');
      panel.classList.toggle('is-open', !!open);
    }
    if (toggle) {
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      toggle.classList.toggle('is-open', !!open);
    }
  }

  function isOpen() {
    return document.body.classList.contains('nav-menu-open');
  }

  document.addEventListener(
    'click',
    function (event) {
      var target = event.target;
      if (!(target instanceof Element)) return;

      var toggle = target.closest('[data-nav-toggle]');
      if (toggle) {
        event.preventDefault();
        event.stopPropagation();
        setOpen(!isOpen());
        return;
      }

      if (target.closest('[data-nav-close]')) {
        setOpen(false);
        return;
      }

      if (isOpen() && !target.closest('[data-site-header]')) {
        setOpen(false);
      }
    },
    true
  );

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') setOpen(false);
  });
})();
