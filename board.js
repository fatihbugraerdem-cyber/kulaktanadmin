/* Yönetim kurulu paneli */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var esc = K.esc;
  var cases = [], current = null;

  function statusOf(c) {
    if (c.boardDecision) return 'Dosya Kapatıldı / Arşivlendi';
    if (c.status === 'YK Onaylandı') return 'YK İncelemesinde / Karar Bekleniyor';
    return c.status;
  }

  function load() {
    return K.api('/api/board/cases').then(function (d) {
      cases = d.cases;
      var pending = 0, closed = 0;
      var rows = cases.map(function (c) {
        if (c.boardDecision) closed++; else if (c.status === 'YK Onaylandı') pending++;
        var decision = c.boardDecision
          ? '<span class="clamp" style="color:var(--ok);font-weight:600">' + esc(c.boardDecision) + '</span>'
          : '<span class="muted">Karar girilmedi</span>';
        return '<tr>' +
          '<td data-label="Dosya kodu"><span class="code">' + esc(c.code) + '</span></td>' +
          '<td data-label="Kategori">' + esc(c.category) + '</td>' +
          '<td data-label="Uzman mütalaası" class="clip"><strong>' + esc(c.expert) + '</strong><span class="clamp">' + esc(c.opinion) + '</span></td>' +
          '<td data-label="Kurul kararı" class="clip">' + decision + '</td>' +
          '<td data-label="Durum">' + K.chip(statusOf(c)) + '</td>' +
          '<td data-label="İşlem">' + (c.boardDecision
            ? '<button type="button" class="link link-btn" data-view="' + esc(c.code) + '">Görüntüle</button>'
            : '<button type="button" class="btn btn-primary btn-sm" data-decide="' + esc(c.code) + '">Karar ver</button>') + '</td></tr>';
      }).join('');
      $('boardTableBody').innerHTML = rows ||
        '<tr><td colspan="6" class="empty"><strong>Karar bekleyen dosya yok</strong>Yöneticiniz bir dosyayı kurula sunduğunda burada görünür.</td></tr>';
      $('boardTotalCases').textContent = String(cases.length);
      $('boardPendingCases').textContent = String(pending);
      $('boardClosedCases').textContent = String(closed);
    });
  }

  function openCase(code, readOnly) {
    var c = cases.filter(function (x) { return x.code === code; })[0];
    if (!c) return;
    current = c;
    $('boardDrawerBody').innerHTML =
      '<div class="drawer-head"><div><p class="muted small" style="margin:0 0 .2rem">' + (readOnly ? 'Kurul kararı' : 'ZORUNLU YÖNETİM KURULU KARAR & ÖNLEM FORMU') + '</p><h2 class="mono" style="font-family:var(--mono);font-size:1.6rem;letter-spacing:0">' + esc(c.code) + '</h2></div>' +
      '<button type="button" class="x-btn" data-close aria-label="Kapat">&times;</button></div>' +
      '<dl class="kv"><div><dt>Kategori</dt><dd>' + esc(c.category) + '</dd></div><div><dt>Atanan uzman</dt><dd>' + esc(c.expert) + '</dd></div></dl>' +
      '<h3 class="mt-4" style="font-size:1.3rem">Uzman Hukuki Mütalaası:</h3>' +
      '<div class="panel-soft mt-1" style="white-space:pre-wrap;word-break:break-word">' + esc(c.opinion) + '</div>' +
      (readOnly
        ? '<h3 class="mt-4" style="font-size:1.3rem">Alınan karar ve önlem</h3><div class="note note-ok mt-1"><p style="white-space:pre-wrap">' + esc(c.boardDecision) + '</p></div>'
        : '<form id="decisionForm" class="mt-4" novalidate><div class="field"><label for="boardDecisionInput">Yönetim Kurulu Kararı ve Alınan Önlem (Zorunludur)</label>' +
          '<textarea id="boardDecisionInput" rows="6" required placeholder="Şirketin aldığı önlemleri, DÖF planını veya disiplin sevk kararını detaylıca yazınız..."></textarea>' +
          '<p class="hint">Karar girilmeden dosya kapatılamaz. Kaydettiğinizde karar mühürlenir ve ihbarcı takip sayfasında görür.</p></div>' +
          '<div class="drawer-foot"><button type="button" class="btn btn-ghost" data-close>İptal</button><button type="submit" class="btn btn-primary">Kararı Kaydet ve Dosyayı Kapat</button></div></form>');
    K.open('boardDrawer');
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-decide],[data-view],[data-close]');
    if (!t) return;
    if (t.hasAttribute('data-decide')) openCase(t.getAttribute('data-decide'), false);
    else if (t.hasAttribute('data-view')) openCase(t.getAttribute('data-view'), true);
    else K.close('boardDrawer');
  });

  document.addEventListener('submit', function (e) {
    if (e.target.id !== 'decisionForm') return;
    e.preventDefault();
    var decision = $('boardDecisionInput').value.trim();
    if (!decision) { K.toast('Yönetim kurulu kararı ve önlem alanı boş bırakılamaz.', 'error'); return; }
    K.confirm({
      title: 'Karar mühürlensin mi?',
      body: 'Karar kaydedildikten sonra dosya kapatılır ve değiştirilemez.',
      confirm: 'Kaydet ve kapat'
    }).then(function (ok) {
      if (!ok) return;
      return K.post('/api/board/decision', { code: current.code, decision: decision })
        .then(load)
        .then(function () { K.close('boardDrawer'); K.toast('Karar mühürlendi, dosya kapatıldı'); });
    }).catch(K.error);
  });

  $('refreshBtn').addEventListener('click', function () { load().then(function () { K.toast('Liste güncellendi'); }).catch(K.error); });

  $('reportBtn').addEventListener('click', function () {
    var t = 'KULAKTAN - YÖNETİM KURULU ERKEN TEŞHİS VE UYUM KOMİTESİ RAPORU\r\n';
    t += 'Dayanak: TTK m. 369, m. 378 ve ISO 37002 ilkeleri\r\n';
    t += 'Rapor tarihi: ' + new Date().toLocaleDateString('tr-TR') + '\r\n';
    t += '---------------------------------------------------\r\n\r\n';
    cases.forEach(function (c, i) {
      t += (i + 1) + '. Dosya kodu: ' + c.code + '\r\n';
      t += '   Kategori: ' + c.category + '\r\n';
      t += '   Atanan uzman: ' + c.expert + '\r\n';
      t += '   Uzman mütalaası: ' + c.opinion + '\r\n';
      t += '   YK kararı ve alınan önlem: ' + (c.boardDecision || 'Karar bekleniyor') + '\r\n';
      t += '   Son durum: ' + (c.boardDecision ? 'Dosya Kapatıldı / Arşivlendi' : 'YK İncelemesinde') + '\r\n';
      t += '   ---------------------------------------------------\r\n';
    });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([t], { type: 'text/plain;charset=utf-8' }));
    a.download = 'Kulaktan_Komite_Raporu_' + new Date().toISOString().slice(0, 10) + '.txt';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    K.toast('Rapor indirildi');
  });

  K.portal({
    role: 'board',
    wrongRole: 'Bu hesap yönetim kurulu yetkisine sahip değil.',
    onEnter: function () { return load().catch(K.error); }
  });
})();
