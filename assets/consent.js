/* KYVAR — cookie consent (GDPR / ePrivacy) with Google Consent Mode v2.
   No analytics cookie is set and no Google script is loaded until the
   visitor explicitly accepts. */
(function () {
  'use strict';
  var GA_ID = 'G-1XD8MVMJ2L';
  var KEY = 'kyvar-consent';
  var VERSION = 1;
  var MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;

  // Consent Mode v2 — deny everything until the visitor decides.
  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    personalization_storage: 'denied',
    functionality_storage: 'granted',
    security_storage: 'granted'
  });

  function read() {
    try {
      var v = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!v || v.v !== VERSION || !v.t) return null;
      if (Date.now() - v.t > MAX_AGE_MS) return null;   // re-ask after a year
      return v;
    } catch (e) { return null; }
  }
  function save(analytics) {
    try {
      localStorage.setItem(KEY, JSON.stringify({ v: VERSION, t: Date.now(), analytics: !!analytics }));
    } catch (e) {}
  }

  var gaLoaded = false;
  function loadGA() {
    if (gaLoaded) return;
    gaLoaded = true;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    (document.head || document.documentElement).appendChild(s);
    gtag('js', new Date());
    gtag('config', GA_ID, { anonymize_ip: true });
  }

  function dropAnalyticsCookies() {
    var host = location.hostname;
    document.cookie.split(';').forEach(function (c) {
      var name = c.split('=')[0].trim();
      if (!/^_ga/.test(name)) return;
      [host, '.' + host, ''].forEach(function (d) {
        document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' + (d ? '; domain=' + d : '');
      });
    });
  }

  function apply(analytics) {
    gtag('consent', 'update', { analytics_storage: analytics ? 'granted' : 'denied' });
    if (analytics) loadGA(); else dropAnalyticsCookies();
  }

  var stored = read();
  if (stored) apply(stored.analytics);

  // ---------- banner ----------
  var el = null;
  function close() { if (el) { el.remove(); el = null; } }

  function open() {
    if (el) return;
    el = document.createElement('div');
    el.className = 'cbanner';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-labelledby', 'cbanner-title');
    el.setAttribute('aria-describedby', 'cbanner-text');
    el.innerHTML =
      '<div class="cbanner-in">' +
        '<div class="cbanner-txt">' +
          '<b id="cbanner-title">Cookies on kyvar.io</b>' +
          '<p id="cbanner-text">We would like to set one analytics cookie to understand how this site is used. ' +
          'Nothing is stored on your device unless you accept, and the site works either way. ' +
          '<a href="/cookies.html">Cookie Policy</a> · <a href="/privacy.html">Privacy Policy</a></p>' +
        '</div>' +
        '<div class="cbanner-btns">' +
          '<button type="button" class="cbtn ghost" data-consent="reject">Reject</button>' +
          '<button type="button" class="cbtn" data-consent="accept">Accept</button>' +
        '</div>' +
      '</div>';
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-consent]');
      if (!b) return;
      var yes = b.dataset.consent === 'accept';
      save(yes);
      apply(yes);
      close();
    });
    document.body.appendChild(el);
    requestAnimationFrame(function () { if (el) el.classList.add('on'); });
  }

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    if (!read()) open();
    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-cookie-settings]')) { e.preventDefault(); close(); open(); }
    });
  });
})();
