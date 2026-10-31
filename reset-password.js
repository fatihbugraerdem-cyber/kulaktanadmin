(function () {
  'use strict';
  var token = new URLSearchParams(location.search).get('token');
  var form = document.getElementById('resetForm');
  var msg = document.getElementById('msg');

  function say(text, ok) { msg.textContent = text; msg.className = 'form-msg ' + (ok ? 'ok' : 'err'); }

  if (!token) {
    form.classList.add('hidden');
    say('Bağlantı geçersiz: anahtar eksik. E-postanızdaki bağlantıyı eksiksiz açın.', false);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var p1 = document.getElementById('newPassword').value;
    var p2 = document.getElementById('newPassword2').value;
    if (p1.length < 8) { say('Şifre en az 8 karakter olmalı.', false); return; }
    if (p1 !== p2) { say('Şifreler eşleşmiyor.', false); return; }
    var btn = document.getElementById('resetBtn');
    btn.disabled = true;
    K.post('/api/auth/reset-password', { token: token, newPassword: p1 })
      .then(function (d) { say(d.message, true); form.classList.add('hidden'); })
      .catch(function (err) { say(err.message, false); })
      .then(function () { btn.disabled = false; });
  });
})();
