/* Kurumsal (admin) paneli */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var esc = K.esc;
  var cases = [], experts = [], current = null;
  var CLOSED = ['YK Onaylandı', 'Dosya Kapatıldı / Arşivlendi'];

  function pad(n) { return String(n); }

  function load() {
    return Promise.all([
      K.api('/api/admin/experts'),
      K.api('/api/admin/cases'),
      K.api('/api/admin/emails'),
      K.api('/api/admin/audit')
    ]).then(function (r) {
      experts = r[0].experts;
      cases = r[1].cases;
      renderTable();
      renderEmails(r[2].logs);
      renderAudit(r[3]);
      $('lastSync').textContent = 'Son güncelleme: ' + new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    });
  }

  function renderTable() {
    var inReview = 0, ready = 0;
    var rows = cases.map(function (c) {
      if (c.status === 'Uzman İncelemesinde') inReview++;
      if (c.status === 'YK Onayına Hazır' || c.status === 'YK Onaylandı') ready++;
      var unassigned = c.expert === 'Atanmadı';
      var opinion = c.opinion && c.opinion !== 'Henüz mütalaa yazılmadı.' ? '<span class="clamp">' + esc(c.opinion) + '</span>' : '<span class="muted">Yazılmadı</span>';
      return '<tr>' +
        '<td data-label="Dosya kodu"><span class="code">' + esc(c.code) + '</span></td>' +
        '<td data-label="Kategori">' + esc(c.category) + '</td>' +
        '<td data-label="Atanan uzman">' + (unassigned ? '<span style="color:var(--bad);font-weight:600">Atanmadı</span>' : esc(c.expert)) + '</td>' +
        '<td data-label="Durum">' + K.chip(c.status) + '</td>' +
        '<td data-label="Mütalaa" class="clip">' + opinion + '</td>' +
        '<td data-label="İşlem"><div class="row" style="gap:.9rem;justify-content:flex-end">' +
        '<button type="button" class="link link-btn" data-open="' + esc(c.code) + '">Yönet</button>' +
        (c.status === 'YK Onayına Hazır' ? '<button type="button" class="link link-btn" data-board="' + esc(c.code) + '">Kurula sun</button>' : '') +
        '</div></td></tr>';
    }).join('');
    $('adminTableBody').innerHTML = rows ||
      '<tr><td colspan="6" class="empty"><strong>Henüz bildirim yok</strong>Kurumunuzun ihbar formuna gelen bildirimler burada listelenir.</td></tr>';
    $('totalCasesCount').textContent = pad(cases.length);
    $('inReviewCount').textContent = pad(inReview);
    $('readyBoardCount').textContent = pad(ready);
  }

  function renderEmails(logs) {
    $('emailTerminalLogs').innerHTML = logs.map(function (l) {
      return '<div><time>' + K.date(l.created_at) + '</time><span class="hl">' + esc(l.to_email) + '</span> · ' + esc(l.subject) + ' · ' + esc(l.status) + '</div>';
    }).join('') || '<div>Henüz e-posta gönderilmedi.</div>';
    $('emailCount').textContent = pad(logs.length);
  }

  function renderAudit(d) {
    $('adminAuditBox').innerHTML = d.logs.map(function (l) {
      return '<div><time>' + K.date(l.created_at) + '</time><span class="hl">' + esc(l.case_code || '-') + '</span> · ' + esc(l.actor) + ' · ' + esc(l.action) + '</div>';
    }).join('') || '<div>Henüz kayıt yok.</div>';
    var b = $('chainIntegrityBadge');
    b.classList.remove('hidden');
    if (d.chainIntact) { b.textContent = 'Zincir bütünlüğü doğrulandı'; b.className = 'chain chain-ok'; }
    else { b.textContent = 'Zincir bozulmuş: müdahale şüphesi'; b.className = 'chain chain-bad'; }
  }

  function openCase(code) {
    var c = cases.filter(function (x) { return x.code === code; })[0];
    if (!c) return;
    current = c;
    var locked = CLOSED.indexOf(c.status) !== -1;
    var hasOpinion = c.opinion && c.opinion !== 'Henüz mütalaa yazılmadı.';

    var assign;
    if (locked) {
      assign = '<div class="note"><p>Bu dosya yönetim kuruluna sunuldu veya kapatıldı; uzman ataması değiştirilemez.</p></div>';
    } else if (!experts.length) {
      assign = '<div class="note note-warn"><p>Kurumunuza henüz uzman hesabı eklenmemiş. Platform yöneticisinden bir uzman hesabı isteyin.</p></div>';
    } else {
      var opts = experts.map(function (x) { return '<option value="' + x.id + '">' + esc(x.name) + '</option>'; }).join('');
      assign = '<form id="assignForm" class="panel-soft" novalidate><div class="field" style="margin-bottom:1rem"><label for="expertSelect">Dosyayı incelemesi için uzman ata (e-posta bildirimi tetiklenir):</label><select id="expertSelect">' + opts + '</select><p class="hint">Atama yapıldığında uzmana e-posta gönderilir.</p></div><button type="submit" class="btn btn-primary btn-block">' + (c.expert === 'Atanmadı' ? 'Ata' : 'Uzmanı değiştir') + '</button></form>';
    }

    $('caseDrawerBody').innerHTML =
      '<div class="drawer-head"><div><h2 class="mono" style="font-family:var(--mono);font-size:1.6rem;letter-spacing:0">' + esc(c.code) + '</h2><div class="mt-1">' + K.chip(c.status) + '</div></div>' +
      '<button type="button" class="x-btn" data-close aria-label="Kapat">&times;</button></div>' +
      '<dl class="kv"><div><dt>Kurum</dt><dd>' + esc(c.company || '-') + '</dd></div><div><dt>Departman</dt><dd>' + esc(c.department || '-') + '</dd></div>' +
      '<div><dt>Kategori</dt><dd>' + esc(c.category) + '</dd></div><div><dt>Alınma tarihi</dt><dd>' + K.date(c.createdAt) + '</dd></div>' +
      '<div><dt>Atanan uzman</dt><dd>' + esc(c.expert) + '</dd></div><div><dt>Kanıt dosyası</dt><dd>' + (c.hasEvidence ? esc(c.evidenceFilename || 'Var') + ' (şifreli saklanıyor)' : 'Yok') + '</dd></div></dl>' +
      '<h3 class="mt-4" style="font-size:1.3rem">Bildirim Özeti:</h3>' +
      '<div class="panel-soft mt-1" style="white-space:pre-wrap;word-break:break-word">' + esc(c.summary) + '</div>' +
      (hasOpinion ? '<h3 class="mt-4" style="font-size:1.3rem">Uzman mütalaası</h3><div class="panel-soft mt-1" style="white-space:pre-wrap;word-break:break-word">' + esc(c.opinion) + '</div>' : '') +
      (c.boardDecision ? '<h3 class="mt-4" style="font-size:1.3rem">Yönetim kurulu kararı</h3><div class="note note-ok mt-1"><p style="white-space:pre-wrap">' + esc(c.boardDecision) + '</p></div>' : '') +
      '<div class="mt-4">' + assign + '</div>';
    K.open('caseDrawer');
  }

  function sendToBoard(code) {
    K.confirm({
      title: 'Dosya yönetim kuruluna sunulsun mu?',
      body: code + ' kodlu dosya ve uzman mütalaası yönetim kurulu üyelerine iletilecek ve üyelere e-posta gönderilecek.',
      confirm: 'Kurula sun'
    }).then(function (ok) {
      if (!ok) return;
      return K.post('/api/admin/approve-for-board', { code: code })
        .then(load)
        .then(function () { K.toast('Dosya yönetim kuruluna sunuldu'); });
    }).catch(K.error);
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-open],[data-board],[data-close]');
    if (!t) return;
    if (t.hasAttribute('data-open')) openCase(t.getAttribute('data-open'));
    else if (t.hasAttribute('data-board')) sendToBoard(t.getAttribute('data-board'));
    else K.close('caseDrawer');
  });

  document.addEventListener('submit', function (e) {
    if (e.target.id !== 'assignForm') return;
    e.preventDefault();
    var id = Number($('expertSelect').value);
    var name = (experts.filter(function (x) { return x.id === id; })[0] || {}).name || '';
    K.post('/api/admin/assign', { code: current.code, expertId: id })
      .then(load)
      .then(function () { K.close('caseDrawer'); K.toast('Dosya ' + name + ' adlı uzmana atandı'); })
      .catch(K.error);
  });

  $('refreshBtn').addEventListener('click', function () { load().then(function () { K.toast('Liste güncellendi'); }).catch(K.error); });

  K.portal({
    role: 'admin',
    wrongRole: 'Bu hesap yönetici yetkisine sahip değil.',
    onEnter: function () { return load().catch(K.error); }
  });
})();
