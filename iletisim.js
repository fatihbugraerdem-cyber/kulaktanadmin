(function () {
  'use strict';
  var form = document.getElementById('contactForm');
  var msg = document.getElementById('contactMsg');
  var btn = form.querySelector('button[type="submit"]');

  function say(text, ok) {
    msg.textContent = text;
    msg.className = ok ? 'ok' : 'err';
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    btn.disabled = true;
    K.post('/api/contact', {
      name: document.getElementById('cName').value.trim(),
      email: document.getElementById('cEmail').value.trim(),
      company: document.getElementById('cCompany').value.trim(),
      message: document.getElementById('cMessage').value.trim()
    })
      .then(function (d) { say(d.message, true); form.reset(); })
      .catch(function (err) { say(err.message, false); })
      .then(function () { btn.disabled = false; });
  });
})();
