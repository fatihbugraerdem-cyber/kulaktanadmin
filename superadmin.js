/* Platform yönetimi (süper-admin) */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var esc = K.esc;
  var HEX = /^#[0-9a-fA-F]{6}$/;
  var ROLES = { admin: 'Admin', expert: 'Uzman', board: 'Yönetim Kurulu' };
  var orgs = [];

  function safeColor(c) { return HEX.test(c || '') ? c : '#2a3b5f'; }

  /* Tek seferlik gösterilen kimlik bilgileri */
  function creds(box, title, rows) {
    box.innerHTML = '<div class="note note-ok"><div><strong>' + esc(title) + '</strong>' +
      '<p style="margin-top:.3rem">Şifre bir daha gösterilmeyecek. Şimdi kopyalayıp kullanıcıya güvenli bir kanaldan iletin.</p></div></div>' +
      '<div class="mt-2">' + rows.map(function (r, i) {
        return '<div class="receipt"><div><span class="k">' + esc(r[0]) + '</span><span class="v">' + esc(r[1]) + '</span></div>' +
          '<button type="button" class="btn btn-ghost btn-sm copy-btn" data-copy-text="' + esc(r[1]) + '">Kopyala</button></div>';
      }).join('') + '</div>';
  }
  function fail(box, err) { box.innerHTML = '<p class="form-msg err" role="alert">' + esc(err.message) + '</p>'; }

  document.addEventListener('click', function (e) {
    var c = e.target.closest('[data-copy-text]');
    if (c) K.copy(c.getAttribute('data-copy-text'));
  });

  function loadOrgs() {
    return K.api('/api/superadmin/organizations').then(function (d) {
      orgs = d.organizations;
      $('orgsTableBody').innerHTML = orgs.map(function (o) {
        return '<tr><td data-label="Şirket"><strong>' + esc(o.name) + '</strong></td>' +
          '<td data-label="Form adresi"><a href="/o/' + encodeURIComponent(o.slug) + '" target="_blank" rel="noopener" class="link mono">/o/' + esc(o.slug) + '</a></td>' +
          '<td data-label="Marka rengi"><span style="display:inline-block;width:16px;height:16px;border-radius:5px;vertical-align:-3px;margin-right:.5rem;border:1px solid var(--line);background:' + safeColor(o.primaryColor) + '"></span><span class="mono small">' + esc(o.primaryColor) + '</span></td>' +
          '<td data-label="Dosya">' + esc(o.caseCount) + '</td><td data-label="Personel">' + esc(o.staffCount) + '</td>' +
          '<td data-label="Oluşturulma" class="muted small">' + K.date(o.createdAt) + '</td></tr>';
      }).join('') || '<tr><td colspan="6" class="empty"><strong>Henüz şirket yok</strong>İlk müşteri şirketi aşağıdan ekleyin.</td></tr>';

      var opts = orgs.map(function (o) { return '<option value="' + esc(o.slug) + '">' + esc(o.name) + ' (/o/' + esc(o.slug) + ')</option>'; }).join('');
      ['staffOrgSlug', 'brandingOrgSlug'].forEach(function (id) { var v = $(id).value; $(id).innerHTML = opts; if (v) $(id).value = v; });
      var sel = $('staffListOrgSlug'), prev = sel.value;
      sel.innerHTML = opts;
      if (orgs.some(function (o) { return o.slug === prev; })) sel.value = prev;
      if (!brandDirty) syncBrandColor();
      return sel.value ? loadStaff() : (($('staffListBody').innerHTML = ''), null);
    });
  }

  var brandDirty = false;
  function syncBrandColor() {
    var o = orgs.filter(function (x) { return x.slug === $('brandingOrgSlug').value; })[0];
    if (o) $('brandingColor').value = safeColor(o.primaryColor);
  }
  $('brandingOrgSlug').addEventListener('change', function () { brandDirty = false; syncBrandColor(); });
  $('brandingColor').addEventListener('input', function () { brandDirty = true; });

  function loadStaff() {
    var slug = $('staffListOrgSlug').value;
    if (!slug) { $('staffListBody').innerHTML = ''; return Promise.resolve(); }
    return K.api('/api/superadmin/organizations/' + encodeURIComponent(slug) + '/staff').then(function (d) {
      $('staffListBody').innerHTML = d.staff.map(function (s) {
        return '<tr><td data-label="Ad soyad">' + esc(s.name) + '</td><td data-label="Kullanıcı adı" class="mono small">' + esc(s.username) + '</td>' +
          '<td data-label="Rol">' + esc(ROLES[s.role] || s.role) + '</td><td data-label="E-posta">' + esc(s.email) + '</td>' +
          '<td data-label="İşlem"><div class="row" style="gap:.9rem;justify-content:flex-end">' +
          '<button type="button" class="link link-btn" data-edit="' + esc(s.id) + '">Düzenle</button>' +
          '<button type="button" class="link link-btn link-danger" data-del="' + esc(s.id) + '">Sil</button></div></td></tr>';
      }).join('') || '<tr><td colspan="5" class="empty"><strong>Bu şirkette personel yok</strong>Yukarıdan personel ekleyebilirsiniz.</td></tr>';
      staff = d.staff;
    }).catch(function (err) {
      $('staffListBody').innerHTML = '<tr><td colspan="5" class="form-msg err">' + esc(err.message) + '</td></tr>';
    });
  }
  var staff = [];
  $('staffListOrgSlug').addEventListener('change', loadStaff);

  document.addEventListener('click', function (e) {
    var ed = e.target.closest('[data-edit]'), del = e.target.closest('[data-del]');
    if (ed) {
      var s = staff.filter(function (x) { return String(x.id) === ed.getAttribute('data-edit'); })[0];
      if (!s) return;
      $('editStaffId').value = s.id; $('editStaffName').value = s.name; $('editStaffEmail').value = s.email; $('editStaffRole').value = s.role;
      $('editStaffError').classList.add('hidden');
      K.open('editStaffModal');
    } else if (del) {
      var d = staff.filter(function (x) { return String(x.id) === del.getAttribute('data-del'); })[0];
      if (!d) return;
      K.confirm({ title: d.name + ' silinsin mi?', body: 'Hesap ve açık oturumları kalıcı olarak silinir. Bu işlem geri alınamaz.', confirm: 'Sil', danger: true })
        .then(function (ok) {
          if (!ok) return;
          return K.api('/api/superadmin/staff/' + d.id, { method: 'DELETE' }).then(function () { return Promise.all([loadStaff(), loadOrgs()]); }).then(function () { K.toast('Personel silindi'); });
        }).catch(K.error);
    }
  });

  $('editCancel').addEventListener('click', function () { K.close('editStaffModal'); });
  $('editStaffForm').addEventListener('submit', function (e) {
    e.preventDefault();
    K.api('/api/superadmin/staff/' + $('editStaffId').value, {
      method: 'PUT',
      body: JSON.stringify({ name: $('editStaffName').value.trim(), email: $('editStaffEmail').value.trim(), role: $('editStaffRole').value })
    }).then(function () { K.close('editStaffModal'); return loadStaff(); }).then(function () { K.toast('Personel güncellendi'); })
      .catch(function (err) { var m = $('editStaffError'); m.textContent = err.message; m.classList.remove('hidden'); });
  });

  $('newOrgForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var form = e.target, box = $('createOrgResult');
    K.post('/api/superadmin/organizations', {
      name: $('newOrgName').value.trim(), slug: $('newOrgSlug').value.trim().toLowerCase(),
      adminName: $('newOrgAdminName').value.trim(), adminEmail: $('newOrgAdminEmail').value.trim()
    }).then(function (d) {
      creds(box, d.organization.name + ' oluşturuldu', [['Yönetici kullanıcı adı', d.admin.username], ['Yönetici şifresi', d.admin.password], ['İhbar formu', location.origin + '/o/' + d.organization.slug]]);
      form.reset();
      return loadOrgs();
    }).catch(function (err) { fail(box, err); });
  });

  $('newStaffForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var form = e.target, box = $('addStaffResult'), slug = $('staffOrgSlug').value;
    K.post('/api/superadmin/organizations/' + encodeURIComponent(slug) + '/staff', {
      role: $('staffRole').value, name: $('staffName').value.trim(), username: $('staffUsername').value.trim(), email: $('staffEmail').value.trim()
    }).then(function (d) {
      creds(box, 'Hesap oluşturuldu', [['Kullanıcı adı', d.username], ['Şifre', d.password]]);
      form.reset();
      return loadOrgs();
    }).catch(function (err) { fail(box, err); });
  });

  $('brandForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var box = $('brandingResult');
    K.post('/api/superadmin/organizations/' + encodeURIComponent($('brandingOrgSlug').value) + '/branding', { primaryColor: $('brandingColor').value })
      .then(function () { brandDirty = false; box.innerHTML = ''; K.toast('Marka rengi güncellendi'); return loadOrgs(); })
      .catch(function (err) { fail(box, err); });
  });

  K.portal({
    role: 'superadmin',
    wrongRole: 'Bu hesap platform yönetimi yetkisine sahip değil.',
    onEnter: function () { return loadOrgs().catch(K.error); }
  });
})();
