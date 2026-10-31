/* Ana sayfa: ihbar formu, kuruma özel marka, makbuz penceresi */
(function () {
  'use strict';
  var HEX = /^#[0-9a-fA-F]{6}$/;

  function slug() {
    var m = location.pathname.match(/^\/o\/([a-z0-9-]+)/);
    return m ? m[1] : null;
  }

  /* Açık renkli bir marka rengi beyaz düğme yazısını okunmaz yapar; o durumda uygulanmaz. */
  function usable(hex) {
    var r = parseInt(hex.substr(1, 2), 16), g = parseInt(hex.substr(3, 2), 16), b = parseInt(hex.substr(5, 2), 16);
    var lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return lum < 0.55;
  }

  function loadOrg() {
    var s = slug();
    if (!s) return;
    fetch('/api/orgs/' + encodeURIComponent(s))
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.success) return;
        var banner = document.getElementById('orgBanner');
        banner.textContent = 'Bu güvenli hat ' + d.organization.name + ' içindir';
        banner.classList.remove('hidden');
        var c = d.organization.primaryColor;
        if (c && HEX.test(c) && usable(c)) {
          document.documentElement.style.setProperty('--brand', c);
          banner.style.color = c;
        }
      })
      .catch(function () { /* form yine varsayılan kuruma gönderir */ });
  }
  loadOrg();

  function fileToBase64(file) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () { resolve(String(fr.result).split(',')[1]); };
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });
  }

  var form = document.getElementById('caseForm');
  var msg = document.getElementById('formMsg');
  var btn = document.getElementById('submitReportBtn');
  var lastReceipt = null;

  function showMsg(t) { msg.textContent = t; msg.classList.remove('hidden'); }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    msg.classList.add('hidden');

    var company = document.getElementById('targetCompany').value.trim();
    var category = document.getElementById('category').value;
    var department = document.getElementById('dept').value.trim();
    var summary = document.getElementById('description').value.trim();
    if (!company || !category || !department || summary.length < 5) {
      showMsg('Kurum, kategori, departman ve olay özeti zorunludur. Olay özeti en az 5 karakter olmalı.');
      return;
    }

    var file = document.getElementById('evidence').files[0];
    if (file && file.size > 15 * 1024 * 1024) { showMsg('Dosya 15 MB sınırını aşıyor. Daha küçük bir dosya seçin.'); return; }

    btn.disabled = true;
    btn.textContent = 'Şifrelenip gönderiliyor';

    var payload = { company: company, category: category, department: department, summary: summary, organizationSlug: slug() || 'default' };
    var ready = file
      ? fileToBase64(file).then(function (b64) { payload.evidenceBase64 = b64; payload.evidenceFilename = file.name; payload.evidenceMimeType = file.type; })
      : Promise.resolve();

    ready
      .then(function () { return K.post('/api/cases', payload); })
      .then(function (res) {
        lastReceipt = { code: res.code, token: res.accessToken };
        document.getElementById('receiptCode').textContent = res.code;
        document.getElementById('receiptToken').textContent = res.accessToken;
        K.open('receiptModal');
        form.reset();
      })
      .catch(function (err) { showMsg(err.message || 'Gönderilemedi. Lütfen tekrar deneyin.'); })
      .then(function () { btn.disabled = false; btn.textContent = 'Şifreli ihbarı gönder'; });
  });

  document.querySelectorAll('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () { K.copy(document.getElementById(b.getAttribute('data-copy')).textContent, 'Kopyalandı'); });
  });

  document.getElementById('receiptDownload').addEventListener('click', function () {
    if (!lastReceipt) return;
    var txt = 'Kulaktan ihbar dosyası\r\n\r\nDosya kodu: ' + lastReceipt.code + '\r\nErişim anahtarı: ' + lastReceipt.token +
      '\r\n\r\nBu iki bilgi birlikte olmadan dosyanızın durumu sorgulanamaz. Güvenli bir yerde saklayın.\r\n';
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([txt], { type: 'text/plain;charset=utf-8' }));
    a.download = 'kulaktan-' + lastReceipt.code + '.txt';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  });

  document.getElementById('receiptClose').addEventListener('click', function () {
    K.confirm({
      title: 'Bilgileri kaydettiniz mi?',
      body: 'Dosya kodu ve erişim anahtarı bir daha gösterilmeyecek. Kaybederseniz dosyanıza erişemezsiniz.',
      confirm: 'Evet, kaydettim'
    }).then(function (ok) { if (ok) K.close('receiptModal'); });
  });

  var track = document.getElementById('receiptTrack');
  var s = slug();
  if (s) track.setAttribute('href', '/o/' + s + '/takip');
})();
