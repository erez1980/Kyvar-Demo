/* KYVAR contact form.
 *
 * ENDPOINT is the only thing to set to make this a real form. Until it is set
 * the form still works: it opens the visitor's mail client with everything
 * filled in, and says so — it never claims to have sent something it did not.
 *
 * Supported without code changes:
 *   Formspree    https://formspree.io/f/<your-id>
 *   Web3Forms    https://api.web3forms.com/submit   (also set ACCESS_KEY)
 * Both accept a JSON POST and answer JSON. Any other host needs adding to
 * connect-src in this page's Content-Security-Policy meta tag, or the browser
 * will block the request silently.
 */
var ENDPOINT = "";
var ACCESS_KEY = "";      /* Web3Forms only */
var MAIL_TO = "hello@kyvar.io";

(function () {
  var form = document.getElementById("contactform");
  if (!form) return;

  var ok = document.getElementById("ok");
  var bad = document.getElementById("bad");
  var btn = document.getElementById("submitbtn");
  var loadedAt = Date.now();

  /* A person types. A bot assigns .value directly and fires no key event, so
     "did a key ever reach this form?" is a better signal than a stopwatch —
     a stopwatch punishes someone using autofill, and this does not. */
  var typed = false;
  form.addEventListener("keydown", function () { typed = true; }, true);

  var REQUIRED = [
    /* These check for emptiness, not for shape. A one-letter company name and
       an unfamiliar personal name are both real; refusing them would turn the
       form into a gate on whose name looks right. Only the email is matched
       against a pattern, because we have to be able to reply to it. */
    { id: "f-name", err: "e-name", test: function (v) { return v.trim() !== ""; } },
    { id: "f-email", err: "e-email", test: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()); } },
    { id: "f-company", err: "e-company", test: function (v) { return v.trim() !== ""; } },
    { id: "f-intent", err: "e-intent", test: function (v) { return v !== ""; } },
    { id: "f-consent", err: "e-consent", test: null }
  ];

  function show(el, on) { if (el) el.classList.toggle("on", !!on); }

  function clearField(f) {
    var el = document.getElementById(f.id);
    show(document.getElementById(f.err), false);
    if (el) el.removeAttribute("aria-invalid");
  }

  function validate() {
    var firstBad = null;
    REQUIRED.forEach(function (f) {
      var el = document.getElementById(f.id);
      if (!el) return;
      var good = f.test ? f.test(el.value) : el.checked;
      show(document.getElementById(f.err), !good);
      if (good) el.removeAttribute("aria-invalid");
      else {
        el.setAttribute("aria-invalid", "true");
        if (!firstBad) firstBad = el;
      }
    });
    if (firstBad) firstBad.focus();
    return !firstBad;
  }

  REQUIRED.forEach(function (f) {
    var el = document.getElementById(f.id);
    if (!el) return;
    el.addEventListener("input", function () { clearField(f); });
    el.addEventListener("change", function () { clearField(f); });
  });

  function collect() {
    var stack = [].slice
      .call(form.querySelectorAll('input[name="stack"]:checked'))
      .map(function (c) { return c.value; });
    return {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      company: form.company.value.trim(),
      role: form.role.value.trim(),
      intent: form.intent.value,
      stack: stack.join(", "),
      message: form.message.value.trim(),
      page: location.href
    };
  }

  /* No endpoint configured: hand the visitor a prefilled email rather than
     pretending. Every field goes in the body so nothing they typed is lost. */
  function viaMail(d) {
    var body = [
      "Name: " + d.name,
      "Email: " + d.email,
      "Company: " + d.company,
      d.role ? "Role: " + d.role : "",
      "What would help most: " + d.intent,
      d.stack ? "What we run: " + d.stack : "",
      "",
      d.message
    ].filter(Boolean).join("\n");

    var href = "mailto:" + MAIL_TO +
      "?subject=" + encodeURIComponent("KYVAR — " + d.intent + " (" + d.company + ")") +
      "&body=" + encodeURIComponent(body);

    ok.innerHTML =
      "<b>Your email client is opening, with all of this filled in.</b><br>" +
      "Press send there and it reaches us. If nothing opened, copy the details to " +
      '<a href="mailto:' + MAIL_TO + '">' + MAIL_TO + "</a> and we will pick it up.";
    show(ok, true);
    ok.scrollIntoView({ behavior: "smooth", block: "center" });
    location.href = href;
  }

  function payloadFor(d) {
    var p = {
      name: d.name, email: d.email, company: d.company, role: d.role,
      intent: d.intent, stack: d.stack, message: d.message, page: d.page,
      _subject: "KYVAR — " + d.intent + " (" + d.company + ")"
    };
    if (ACCESS_KEY) p.access_key = ACCESS_KEY;
    return p;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    show(ok, false);
    show(bad, false);

    /* Validate FIRST. The spam checks below answer silently, and a person who
       lands on the page and hits Send straight away must be told what is
       missing — never handed a "thank you" for a form that went nowhere. */
    if (!validate()) return;

    /* A bot fills every field, including the one nobody can see, and gets
       there without touching the keyboard. Accept silently in either case —
       telling a bot why it failed only helps it. */
    if (form.website.value !== "" || (!typed && Date.now() - loadedAt < 2000)) {
      show(ok, true);
      form.reset();
      return;
    }

    var d = collect();

    if (!ENDPOINT) { viaMail(d); return; }

    btn.disabled = true;
    var label = btn.textContent;
    btn.textContent = "Sending…";

    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payloadFor(d))
    })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        show(ok, true);
        form.reset();
        ok.scrollIntoView({ behavior: "smooth", block: "center" });
      })
      .catch(function () {
        show(bad, true);
        bad.scrollIntoView({ behavior: "smooth", block: "center" });
      })
      .then(function () {
        btn.disabled = false;
        btn.textContent = label;
      });
  });
})();
