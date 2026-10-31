/* İhbarcı takip sayfası */
(function () {
  'use strict';
  var cur = { code: '', token: '' };
  var $ = function (id) { return document.getElementById(id); };

  function bubble(cls, who, text) {
    return '<div class="bubble ' + cls + '"><b>' + K.esc(who) + '</b>' + K.esc(text) + '</div>';
  }

  function renderMessages(list) {
    var box = $('chatMessages');
    if (!list || !list.length) {
      box.innerHTML = '<div class="bubble bubble-sys">Bildiriminiz güvenli kanaldan alındı. İnceleme süreci yürütülüyor; uzman yazdığında mesajı burada görürsünüz.</div>';
      return;
    }
    box.innerHTML = list.map(function (m) {
      return m.sender === 'expert' ? bubble('bubble-them', 'Bağımsız uzman', m.text) : bubble('bubble-me', 'Siz', m.text);
    }).join('');
    box.scrollTop = box.scrollHeight;
  }

  function show(found) {
    $('resCode').textContent = found.code;
    $('resCategory').textContent = found.category || '-';
    $('resExpert').textContent = found.expert || '-';

    var status = found.status, decided = !!found.boardDecision;
    if (decided) status = 'Dosya Kapatıldı / Arşivlendi';
    else if (found.status === 'YK Onaylandı') status = 'YK İncelemesinde / Karar Bekleniyor';
    $('resStatus').innerHTML = K.chip(status);

    var sec = $('boardDecisionSection');
    if (decided) { $('resBoardDecision').textContent = found.boardDecision; sec.classList.remove('hidden'); }
    else sec.classList.add('hidden');

    renderMessages(found.messages);
  }

  function query(code, token, quiet) {
    return fetch('/api/cases/track?code=' + encodeURIComponent(code) + '&token=' + encodeURIComponent(token))
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        if (!res.ok || !res.d.success) throw new Error(res.d.error || 'Girilen koda ve anahtara ait bir dosya bulunamadı.');
        cur = { code: code, token: token };
        show(res.d.case);
        $('resultBox').classList.remove('hidden');
        if (!quiet) $('resultBox').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
  }

  $('trackForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var msg = $('trackMsg'), btn = $('trackBtn');
    msg.classList.add('hidden');
    var code = $('trackCodeInput').value.trim().toUpperCase();
    var token = $('trackTokenInput').value.trim();
    if (!code || !token) { msg.textContent = 'Dosya kodu ve erişim anahtarı birlikte gereklidir.'; msg.classList.remove('hidden'); return; }
    btn.disabled = true;
    query(code, token)
      .catch(function (err) {
        $('resultBox').classList.add('hidden');
        msg.textContent = err.message === 'Failed to fetch' ? 'Sunucuya ulaşılamadı. Bağlantınızı kontrol edip tekrar deneyin.' : err.message;
        msg.classList.remove('hidden');
      })
      .then(function () { btn.disabled = false; });
  });

  $('chatForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var input = $('chatInput'), text = input.value.trim();
    if (!text || !cur.code) return;
    K.post('/api/cases/message', { code: cur.code, token: cur.token, text: text })
      .then(function () {
        var box = $('chatMessages');
        if (box.querySelector('.bubble-sys')) box.innerHTML = '';
        box.insertAdjacentHTML('beforeend', bubble('bubble-me', 'Siz', text));
        input.value = '';
        box.scrollTop = box.scrollHeight;
      })
      .catch(K.error);
  });

  $('refreshBtn').addEventListener('click', function () {
    if (!cur.code) return;
    query(cur.code, cur.token, true).then(function () { K.toast('Yazışma güncellendi'); }).catch(K.error);
  });
})();
