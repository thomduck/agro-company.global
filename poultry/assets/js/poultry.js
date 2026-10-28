/* Thomduck Poultry — tiny vanilla JS (mobile menu + continent accordions) */
(function () {
  'use strict';
  var burger = document.getElementById('tdBurger'), menu = document.getElementById('tdMobile');
  if (burger && menu) {
    burger.addEventListener('click', function () {
      var open = burger.getAttribute('aria-expanded') === 'true';
      burger.setAttribute('aria-expanded', String(!open));
      menu.hidden = open;
    });
    menu.addEventListener('click', function (e) { if (e.target.tagName === 'A') { burger.setAttribute('aria-expanded', 'false'); menu.hidden = true; } });
    window.addEventListener('resize', function () { if (window.innerWidth >= 768) { burger.setAttribute('aria-expanded', 'false'); menu.hidden = true; } });
  }
  document.querySelectorAll('.accordion-header').forEach(function (btn) {
    var body = btn.nextElementSibling, chev = btn.querySelector('svg');
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      if (body) body.style.gridTemplateRows = open ? '0fr' : '1fr';
      if (chev) chev.classList.toggle('rotate-180', !open);
    });
  });
})();
