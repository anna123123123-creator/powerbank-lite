(function () {
  'use strict';

  var data = PowerbankData.load();

  var sideLinks = document.querySelectorAll('.side-link[data-view]');
  var views = document.querySelectorAll('.admin-view');

  function switchView(name) {
    sideLinks.forEach(function (l) { l.classList.toggle('active', l.dataset.view === name); });
    views.forEach(function (v) { v.classList.toggle('active', v.id === 'view-' + name); });
    if (name === 'dashboard') renderDashboard();
    if (name === 'stations') renderStations();
    if (name === 'rentals') renderRentals();
  }

  sideLinks.forEach(function (l) {
    l.addEventListener('click', function () { switchView(l.dataset.view); });
  });

  document.getElementById('btnResetData').addEventListener('click', function () {
    if (!confirm('确定要重置成示例数据吗？这会清空你新增/修改的所有内容。')) return;
    data = PowerbankData.reset();
    switchView('dashboard');
  });

  function stationName(id) {
    var s = data.stations.find(function (x) { return x.id === id; });
    return s ? s.name : '（已删除站点）';
  }

  function formatTime(iso) {
    if (!iso) return '-';
    var d = new Date(iso);
    function pad(n) { return String(n).padStart(2, '0'); }
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function statusLabel(s) {
    return { active: '进行中', completed: '已完成' }[s] || s;
  }

  // ---------- Dashboard ----------
  function renderDashboard() {
    var totalStations = data.stations.length;
    var totalSlots = data.stations.reduce(function (sum, s) { return sum + s.totalSlots; }, 0);
    var activeCount = data.rentals.filter(function (r) { return r.status === 'active'; }).length;

    var now = new Date();
    var y = now.getFullYear();
    var m = now.getMonth();
    var monthRevenue = data.rentals
      .filter(function (r) {
        if (r.status !== 'completed' || !r.endTime) return false;
        var d = new Date(r.endTime);
        return d.getFullYear() === y && d.getMonth() === m;
      })
      .reduce(function (sum, r) { return sum + (r.cost || 0); }, 0);

    var stats = [
      { label: '站点总数', value: totalStations },
      { label: '总插槽数', value: totalSlots },
      { label: '进行中订单', value: activeCount },
      { label: '本月完成订单收入', value: '¥' + monthRevenue.toFixed(2) },
    ];
    document.getElementById('statGrid').innerHTML = stats.map(function (s) {
      return '<div class="stat-card"><div class="num">' + s.value + '</div><div class="label">' + s.label + '</div></div>';
    }).join('');

    var recent = data.rentals.slice().sort(function (a, b) { return b.startTime < a.startTime ? -1 : 1; }).slice(0, 6);
    document.getElementById('recentRentalsBody').innerHTML = recent.map(function (r) {
      return '<tr><td>' + r.id + '</td><td>' + stationName(r.stationId) + '</td><td>' + (r.returnStationId ? stationName(r.returnStationId) : '-') + '</td>' +
        '<td><span class="badge ' + r.status + '">' + statusLabel(r.status) + '</span></td>' +
        '<td>' + (r.cost != null ? '¥' + r.cost.toFixed(2) : '-') + '</td></tr>';
    }).join('') || '<tr><td colspan="5" style="color:var(--muted)">暂无订单</td></tr>';
  }

  // ---------- Stations ----------
  var stationModalBackdrop = document.getElementById('stationModalBackdrop');
  var stationModalTitle = document.getElementById('stationModalTitle');
  var stationModalMsg = document.getElementById('stationModalMsg');
  var stationForm = document.getElementById('stationForm');
  var stationIdInput = document.getElementById('stationIdInput');
  var stationNameInput = document.getElementById('stationNameInput');
  var stationLocationInput = document.getElementById('stationLocationInput');
  var stationTotalInput = document.getElementById('stationTotalInput');
  var stationAvailInput = document.getElementById('stationAvailInput');
  var stationPriceInput = document.getElementById('stationPriceInput');

  function renderStations() {
    document.getElementById('stationsBody').innerHTML = data.stations.map(function (s) {
      return '<tr><td>' + s.name + '</td><td>' + s.location + '</td><td>' + s.availableCount + ' / ' + s.totalSlots + '</td><td>¥' + s.pricePerHour + '</td>' +
        '<td class="table-actions">' +
        '<button class="btn btn-sm" data-edit="' + s.id + '">编辑</button>' +
        '<button class="btn btn-sm btn-danger" data-delete="' + s.id + '">删除</button>' +
        '</td></tr>';
    }).join('') || '<tr><td colspan="5" style="color:var(--muted)">暂无站点</td></tr>';

    document.querySelectorAll('[data-edit]').forEach(function (btn) {
      btn.addEventListener('click', function () { openStationModal(btn.dataset.edit); });
    });
    document.querySelectorAll('[data-delete]').forEach(function (btn) {
      btn.addEventListener('click', function () { deleteStation(btn.dataset.delete); });
    });
  }

  function openStationModal(id) {
    stationModalMsg.innerHTML = '';
    stationForm.reset();
    if (id) {
      var s = data.stations.find(function (x) { return x.id === id; });
      stationModalTitle.textContent = '编辑站点';
      stationIdInput.value = s.id;
      stationNameInput.value = s.name;
      stationLocationInput.value = s.location;
      stationTotalInput.value = s.totalSlots;
      stationAvailInput.value = s.availableCount;
      stationPriceInput.value = s.pricePerHour;
    } else {
      stationModalTitle.textContent = '新增站点';
      stationIdInput.value = '';
    }
    stationModalBackdrop.classList.add('show');
  }

  document.getElementById('btnAddStation').addEventListener('click', function () { openStationModal(null); });
  document.getElementById('btnCloseStationModal').addEventListener('click', function () { stationModalBackdrop.classList.remove('show'); });
  stationModalBackdrop.addEventListener('click', function (e) { if (e.target === stationModalBackdrop) stationModalBackdrop.classList.remove('show'); });

  stationForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = stationNameInput.value.trim();
    var location = stationLocationInput.value.trim();
    var totalSlots = parseInt(stationTotalInput.value, 10);
    var availableCount = parseInt(stationAvailInput.value, 10);
    var pricePerHour = parseFloat(stationPriceInput.value);

    if (!name || !location || !(totalSlots > 0) || isNaN(availableCount) || availableCount < 0 || !(pricePerHour >= 0)) {
      stationModalMsg.innerHTML = '<div class="msg error">请完整填写所有必填项，总插槽数需大于 0，价格不能为负。</div>';
      return;
    }
    if (availableCount > totalSlots) {
      stationModalMsg.innerHTML = '<div class="msg error">当前可借数不能超过总插槽数。</div>';
      return;
    }

    var id = stationIdInput.value;
    if (id) {
      var s = data.stations.find(function (x) { return x.id === id; });
      s.name = name; s.location = location; s.totalSlots = totalSlots; s.availableCount = availableCount; s.pricePerHour = pricePerHour;
    } else {
      data.stations.push({
        id: PowerbankData.uid('st'), name: name, location: location,
        totalSlots: totalSlots, availableCount: availableCount, pricePerHour: pricePerHour,
      });
    }
    PowerbankData.save(data);
    stationModalBackdrop.classList.remove('show');
    renderStations();
  });

  function deleteStation(id) {
    if (!confirm('确定删除这个站点吗？关联的订单记录会保留但会显示"已删除站点"。')) return;
    data.stations = data.stations.filter(function (s) { return s.id !== id; });
    PowerbankData.save(data);
    renderStations();
  }

  // ---------- Rentals ----------
  var currentFilter = 'all';
  document.querySelectorAll('#rentalFilters .filter-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      currentFilter = btn.dataset.status;
      document.querySelectorAll('#rentalFilters .filter-btn').forEach(function (b) { b.classList.toggle('active', b === btn); });
      renderRentals();
    });
  });

  function renderRentals() {
    var list = currentFilter === 'all' ? data.rentals : data.rentals.filter(function (r) { return r.status === currentFilter; });
    list = list.slice().sort(function (a, b) { return b.startTime < a.startTime ? -1 : 1; });
    document.getElementById('rentalsBody').innerHTML = list.map(function (r) {
      return '<tr><td>' + r.id + '</td><td>' + r.userPhone + '</td><td>' + stationName(r.stationId) + '</td>' +
        '<td>' + (r.returnStationId ? stationName(r.returnStationId) : '-') + '</td>' +
        '<td>' + formatTime(r.startTime) + '</td><td>' + formatTime(r.endTime) + '</td>' +
        '<td><span class="badge ' + r.status + '">' + statusLabel(r.status) + '</span></td>' +
        '<td>' + (r.cost != null ? '¥' + r.cost.toFixed(2) : '-') + '</td></tr>';
    }).join('') || '<tr><td colspan="8" style="color:var(--muted)">暂无订单</td></tr>';
  }

  switchView('dashboard');
})();
