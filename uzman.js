/* Bağımsız uzman paneli (TR / EN) */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var esc = K.esc;

  var TR = {
    login_title: 'Uzman / Avukat Girişi', login_desc: 'Size özel atanan şifreli dosyaları incelemek için giriş yapın.',
    username: 'Kullanıcı Adı', password: 'Şifre', login_btn: 'Güvenli Uzman Oturumu Aç', forgot: 'Şifremi unuttum', send_reset: 'Sıfırlama Bağlantısı Gönder',
    aside_title: 'Bağımsız Hukuk & Denetim Portalı', aside_text: '', back_home: 'Ana sayfaya dön',
    welcome: 'Hoş Geldiniz, ', workspace_desc: 'Tarafınıza yönlendirilen şifreli bildirimleri inceleyin, ihbarcı ile mesajlaşın ve mütalaanızı sunun.',
    refresh: 'Yenile', assigned_files: 'Tarafınıza Atanan Soruşturma Dosyaları', th_code: 'Dosya Kodu', th_cat: 'Kategori', th_summary: 'İhbar Özeti', th_status: 'Mevcut Durum', th_action: 'İşlem & Mütalaa',
    audit_title: 'ISO 37002 Denetim İzi', no_audit: 'Henüz kayıt yok.',
    empty_title: 'Size atanmış aktif dosya yok', empty_text: 'Yöneticiniz bir dosya atadığında burada görünür.', open_case: 'Dosyayı aç',
    drawer_sub: 'Hukuki Mütalaa & İhbarcı Mesajlaşması', summary: 'Özet:', chat_label: 'İhbarcı ile Gizli Soru-Cevap Hattı:', chat_ph: 'İhbarcıya ek soru veya mesaj yazın...', send: 'Gönder',
    me: 'Siz (uzman)', them: 'İhbarcı', sys_empty: 'Güvenli kanal açık. Henüz mesaj yok.',
    opinion_label: 'Uzman Hukuki Görüşü ve Tavsiye Raporu:', opinion_ph: 'Dosya kapsamındaki bulgular incelenmiştir. TTK m. 369 çerçevesinde...',
    cancel: 'İptal', submit_opinion: "Görüşü Admin'e Gönder & Onaya Sun",
    opinion_empty: 'Lütfen geçerli bir hukuki görüş yazın.', opinion_sent: 'Mütalaanız yöneticiye iletildi ve denetim izine kaydedildi.', msg_sent: 'Mesaj gönderildi',
    wrongRole: 'Bu hesap uzman yetkisine sahip değil.', updated: 'Liste güncellendi'
  };
  var EN = {
    login_title: 'Expert / attorney sign-in', login_desc: 'Sign in to review the encrypted files assigned to you.',
    username: 'Username', password: 'Password', login_btn: 'Open secure session', forgot: 'Forgot password', send_reset: 'Send reset link',
    aside_title: 'Review your assigned files independently.', aside_text: 'Correspond with the reporter without exposing their identity and submit your legal opinion.', back_home: 'Back to home page',
    welcome: 'Welcome, ', workspace_desc: 'Review the encrypted reports assigned to you, chat anonymously with reporters and submit your opinion.',
    refresh: 'Refresh', assigned_files: 'Your assigned investigation files', th_code: 'Case code', th_cat: 'Category', th_summary: 'Summary', th_status: 'Status', th_action: 'Action',
    audit_title: 'ISO 37002 audit trail', no_audit: 'No entries yet.',
    empty_title: 'No active files assigned to you', empty_text: 'Files appear here once your administrator assigns them.', open_case: 'Open file',
    drawer_sub: 'Legal opinion and reporter chat', summary: 'Summary', chat_label: 'Confidential chat with the reporter', chat_ph: 'Write a question or message to the reporter', send: 'Send',
    me: 'You (expert)', them: 'Reporter', sys_empty: 'Secure channel is open. No messages yet.',
    opinion_label: 'Expert legal opinion and recommendation', opinion_ph: 'The findings in the file have been reviewed. Under TTK art. 369...',
    cancel: 'Cancel', submit_opinion: 'Submit opinion for approval',
    opinion_empty: 'Please write a valid legal opinion.', opinion_sent: 'Your opinion was sent to the administrator and logged in the audit trail.', msg_sent: 'Message sent',
    wrongRole: 'This account does not have expert access.', updated: 'List updated'
  };
  var lang = 'tr';
  try { lang = localStorage.getItem('kulaktan_lang') === 'en' ? 'en' : 'tr'; } catch (e) { /* özel pencere */ }
  function t(k) { return (lang === 'en' ? EN : TR)[k]; }

  var cases = [], current = null, userName = '';

  function applyLang() {
    document.documentElement.lang = lang;
    document.title = lang === 'en' ? 'Independent Expert Portal | Kulaktan' : 'Bağımsız Uzman Paneli | Kulaktan';
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var v = t(el.getAttribute('data-i18n'));
      if (v) el.textContent = v;
    });
    $('loginUser').placeholder = lang === 'en' ? 'e.g. ahmet.yilmaz' : 'Örn. ahmet.yilmaz';
    $('loginPass').placeholder = lang === 'en' ? 'Your password' : 'Şifreniz';
    document.querySelectorAll('.lang-btn').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-lang') === lang ? 'true' : 'false'); b.style.opacity = b.getAttribute('data-lang') === lang ? '1' : '.6'; });
    if (userName) $('welcomeTitle').textContent = t('welcome') + userName;
    if (cases.length || userName) { renderTable(); if (auditCache) renderAudit(auditCache); }
    K.close('expertDrawer');
  }
  document.querySelectorAll('.lang-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      lang = b.getAttribute('data-lang');
      try { localStorage.setItem('kulaktan_lang', lang); } catch (e) { /* yok say */ }
      applyLang();
    });
  });

  var auditCache = null;
  function renderAudit(logs) {
    auditCache = logs;
    $('auditTrailBox').innerHTML = logs.map(function (l) {
      return '<div><time>' + K.date(l.created_at) + '</time><span class="hl">' + esc(l.case_code) + '</span> · ' + esc(l.actor) + ' · ' + esc(l.action) + '</div>';
    }).join('') || '<div>' + t('no_audit') + '</div>';
  }

  function renderTable() {
    $('assignedFilesTable').innerHTML = cases.map(function (c) {
      return '<tr><td data-label="' + t('th_code') + '"><span class="code">' + esc(c.code) + '</span></td>' +
        '<td data-label="' + t('th_cat') + '">' + esc(c.category) + '</td>' +
        '<td data-label="' + t('th_summary') + '" class="clip"><span class="clamp">' + esc(c.summary) + '</span></td>' +
        '<td data-label="' + t('th_status') + '">' + K.chip(c.status) + '</td>' +
        '<td data-label="' + t('th_action') + '"><button type="button" class="btn btn-primary btn-sm" data-open="' + esc(c.code) + '">' + t('open_case') + '</button></td></tr>';
    }).join('') || '<tr><td colspan="5" class="empty"><strong>' + t('empty_title') + '</strong>' + t('empty_text') + '</td></tr>';
  }

  function load() {
    return Promise.all([K.api('/api/expert/cases'), K.api('/api/expert/audit')]).then(function (r) {
      cases = r[0].cases; renderTable(); renderAudit(r[1].logs);
    });
  }

  function chatHtml(c) {
    if (!c.messages || !c.messages.length) return '<div class="bubble bubble-sys">' + t('sys_empty') + '</div>';
    return c.messages.map(function (m) {
      return m.sender === 'expert'
        ? '<div class="bubble bubble-me"><b>' + t('me') + '</b>' + esc(m.text) + '</div>'
        : '<div class="bubble bubble-them"><b>' + t('them') + '</b>' + esc(m.text) + '</div>';
    }).join('');
  }

  function openCase(code) {
    var c = cases.filter(function (x) { return x.code === code; })[0];
    if (!c) return;
    current = c;
    var opinion = c.opinion === 'Henüz mütalaa yazılmadı.' ? '' : c.opinion;
    $('expertDrawerBody').innerHTML =
      '<div class="drawer-head"><div><p class="muted small" style="margin:0 0 .2rem">' + t('drawer_sub') + '</p><h2 class="mono" style="font-family:var(--mono);font-size:1.6rem;letter-spacing:0">' + esc(c.code) + '</h2><div class="mt-1">' + K.chip(c.status) + '</div></div>' +
      '<button type="button" class="x-btn" data-close aria-label="Close">&times;</button></div>' +
      '<h3 style="font-size:1.3rem">' + t('summary') + '</h3>' +
      '<div class="panel-soft mt-1" style="white-space:pre-wrap;word-break:break-word">' + esc(c.summary) + '</div>' +
      '<h3 class="mt-4" style="font-size:1.3rem">' + t('chat_label') + '</h3>' +
      '<div class="chat mt-1" id="expertChatMessages">' + chatHtml(c) + '</div>' +
      '<form class="chat-form" id="expertChatForm"><input type="text" id="expertChatInput" placeholder="' + esc(t('chat_ph')) + '" autocomplete="off"><button type="submit" class="btn btn-primary">' + t('send') + '</button></form>' +
      '<form id="opinionForm" class="mt-4" novalidate><div class="field"><label for="expertOpinionInput">' + t('opinion_label') + '</label>' +
      '<textarea id="expertOpinionInput" rows="6" placeholder="' + esc(t('opinion_ph')) + '">' + esc(opinion) + '</textarea></div>' +
      '<div class="drawer-foot"><button type="button" class="btn btn-ghost" data-close>' + t('cancel') + '</button><button type="submit" class="btn btn-primary">' + t('submit_opinion') + '</button></div></form>';
    K.open('expertDrawer');
    var box = $('expertChatMessages'); box.scrollTop = box.scrollHeight;
  }

  document.addEventListener('click', function (e) {
    var tgt = e.target.closest('[data-open],[data-close]');
    if (!tgt) return;
    if (tgt.hasAttribute('data-open')) openCase(tgt.getAttribute('data-open'));
    else K.close('expertDrawer');
  });

  document.addEventListener('submit', function (e) {
    if (e.target.id === 'expertChatForm') {
      e.preventDefault();
      var input = $('expertChatInput'), text = input.value.trim();
      if (!text) return;
      K.post('/api/expert/message', { code: current.code, text: text })
        .then(function () {
          current.messages = (current.messages || []).concat([{ sender: 'expert', text: text }]);
          $('expertChatMessages').innerHTML = chatHtml(current);
          input.value = '';
          var box = $('expertChatMessages'); box.scrollTop = box.scrollHeight;
          K.toast(t('msg_sent'));
        }).catch(K.error);
    } else if (e.target.id === 'opinionForm') {
      e.preventDefault();
      var opinion = $('expertOpinionInput').value.trim();
      if (!opinion) { K.toast(t('opinion_empty'), 'error'); return; }
      K.post('/api/expert/opinion', { code: current.code, opinion: opinion })
        .then(load)
        .then(function () { K.close('expertDrawer'); K.toast(t('opinion_sent')); })
        .catch(K.error);
    }
  });

  $('refreshBtn').addEventListener('click', function () { load().then(function () { K.toast(t('updated')); }).catch(K.error); });

  applyLang();
  K.portal({
    role: 'expert',
    wrongRole: t('wrongRole'),
    onEnter: function (u) {
      userName = u.name;
      $('welcomeTitle').textContent = t('welcome') + userName;
      return load().catch(K.error);
    }
  });
})();
