(function () {
  'use strict';

  var data = PowerbankData.load();

  var stationGrid = document.getElementById('stationGrid');
  var tabBorrow = document.getElementById('tabBorrow');
  var tabReturn = document.getElementById('tabReturn');
  var panelBorrow = document.getElementById('panelBorrow');
  var panelReturn = document.getElementById('panelReturn');

  var borrowModalBackdrop = document.getElementById('borrowModalBackdrop');
  var btnCloseBorrowModal = document.getElementById('btnCloseBorrowModal');
  var borrowStationName = document.getElementById('borrowStationName');
  var borrowStationInfo = document.getElementById('borrowStationInfo');
  var borrowMsg = document.getElementById('borrowMsg');
  var borrowForm = document.getElementById('borrowForm');
  var borrowPhoneInput = document.getElementById('borrowPhoneInput');

  var lookupPhoneInput = document.getElementById('lookupPhoneInput');
  var btnLookup = document.getElementById('btnLookup');
  var lookupMsg = document.getElementById('lookupMsg');
  var activeRentalList = document.getElementById('activeRentalList');

  var returnModalBackdrop = document.getElementById('returnModalBackdrop');
  var btnCloseReturnModal = document.getElementById('btnCloseReturnModal');
  var returnRentalInfo = document.getElementById('returnRentalInfo');
  var returnMsg = document.getElementById('returnMsg');
  var returnForm = document.getElementById('returnForm');
  var returnStationSelect = document.getElementById('returnStationSelect');
  var returnResult = document.getElementById('returnResult');

  var currentBorrowStation = null;
  var currentReturnRental = null;

  // ---------- Tabs ----------
  tabBorrow.addEventListener('click', function () {
    tabBorrow.classList.add('active');
    tabReturn.classList.remove('active');
    panelBorrow.style.display = '';
    panelReturn.style.display = 'none';
  });
  tabReturn.addEventListener('click', function () {
    tabReturn.classList.add('active');
    tabBorrow.classList.remove('active');
    panelReturn.style.display = '';
    panelBorrow.style.display = 'none';
  });

  // ---------- Station list / borrow ----------
  function renderStations() {
    stationGrid.innerHTML = data.stations.map(function (s) {
      var full = s.availableCount <= 0;
      return '<div class="prop-card station-card" data-id="' + s.id + '">' +
        '<div class="prop-card__body">' +
        '<h3>' + s.name + '</h3>' +
        '<div class="prop-card__loc">' + s.location + '</div>' +
        '<div class="slot-row"><span class="slot-count ' + (full ? 'empty' : '') + '">' + s.availableCount + ' / ' + s.totalSlots + ' 可借</span></div>' +
        '<div class="prop-card__price">¥' + s.pricePerHour + ' <span>/ 小时</span></div>' +
        '<button class="btn btn-primary btn-block btn-sm" ' + (full ? 'disabled' : '') + ' data-borrow="' + s.id + '">' + (full ? '暂无余量' : '借出') + '</button>' +
        '</div></div>';
    }).join('');

    stationGrid.querySelectorAll('[data-borrow]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (btn.disabled) return;
        openBorrowModal(btn.dataset.borrow);
      });
    });
  }

  function openBorrowModal(stationId) {
    currentBorrowStation = data.stations.find(function (s) { return s.id === stationId; });
    if (!currentBorrowStation) return;
    borrowStationName.textContent = currentBorrowStation.name;
    borrowStationInfo.textContent = currentBorrowStation.location + ' · ¥' + currentBorrowStation.pricePerHour + '/小时 · 剩余 ' + currentBorrowStation.availableCount + ' 个';
    borrowMsg.innerHTML = '';
    borrowForm.reset();
    borrowModalBackdrop.classList.add('show');
  }

  function closeBorrowModal() {
    borrowModalBackdrop.classList.remove('show');
    currentBorrowStation = null;
  }

  btnCloseBorrowModal.addEventListener('click', closeBorrowModal);
  borrowModalBackdrop.addEventListener('click', function (e) {
    if (e.target === borrowModalBackdrop) closeBorrowModal();
  });

  borrowForm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!currentBorrowStation) return;

    var phone = borrowPhoneInput.value.trim();
    if (!phone) return showBorrowMsg('请填写手机号。', true);
    if (!/^[0-9*]{6,20}$/.test(phone)) return showBorrowMsg('请输入有效的手机号。', true);

    // Re-read latest station state in case it changed since modal opened.
    var station = data.stations.find(function (s) { return s.id === currentBorrowStation.id; });
    if (!station || station.availableCount <= 0) {
      return showBorrowMsg('抱歉，该站点已无可借充电宝，请换一个站点。', true);
    }

    var rental = {
      id: PowerbankData.uid('r'),
      stationId: station.id,
      userPhone: phone,
      startTime: new Date().toISOString(),
      endTime: null,
      returnStationId: null,
      status: 'active',
      cost: null,
    };
    data.rentals.push(rental);
    station.availableCount -= 1;
    PowerbankData.save(data);

    showBorrowMsg('借出成功！订单号 ' + rental.id + '，请及时使用，归还时按小时计费。', false);
    renderStations();
    setTimeout(closeBorrowModal, 1400);
  });

  function showBorrowMsg(text, isError) {
    borrowMsg.innerHTML = '<div class="msg ' + (isError ? 'error' : 'success') + '">' + text + '</div>';
  }

  // ---------- Return flow ----------
  btnLookup.addEventListener('click', function () {
    var phone = lookupPhoneInput.value.trim();
    lookupMsg.innerHTML = '';
    activeRentalList.innerHTML = '';
    if (!phone) {
      lookupMsg.innerHTML = '<div class="msg error">请输入手机号查询。</div>';
      return;
    }
    var mine = data.rentals.filter(function (r) { return r.status === 'active' && r.userPhone === phone; });
    if (!mine.length) {
      lookupMsg.innerHTML = '<div class="msg error">没有找到该手机号下进行中的借出订单。</div>';
      return;
    }
    activeRentalList.innerHTML = mine.map(function (r) {
      var station = data.stations.find(function (s) { return s.id === r.stationId; });
      return '<div class="rental-item">' +
        '<div><strong>订单 ' + r.id + '</strong><br><span class="muted">借出站点：' + (station ? station.name : '未知站点') + ' · ' + formatTime(r.startTime) + '</span></div>' +
        '<button class="btn btn-primary btn-sm" data-return="' + r.id + '">归还</button>' +
        '</div>';
    }).join('');

    activeRentalList.querySelectorAll('[data-return]').forEach(function (btn) {
      btn.addEventListener('click', function () { openReturnModal(btn.dataset.return); });
    });
  });

  function formatTime(iso) {
    var d = new Date(iso);
    function pad(n) { return String(n).padStart(2, '0'); }
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function openReturnModal(rentalId) {
    currentReturnRental = data.rentals.find(function (r) { return r.id === rentalId; });
    if (!currentReturnRental) return;
    var station = data.stations.find(function (s) { return s.id === currentReturnRental.stationId; });
    returnRentalInfo.textContent = '订单 ' + currentReturnRental.id + ' · 借出站点：' + (station ? station.name : '未知') + ' · 借出时间：' + formatTime(currentReturnRental.startTime);
    returnStationSelect.innerHTML = data.stations.map(function (s) {
      return '<option value="' + s.id + '">' + s.name + '（' + s.availableCount + '/' + s.totalSlots + ' 空位，¥' + s.pricePerHour + '/小时）</option>';
    }).join('');
    returnMsg.innerHTML = '';
    returnResult.innerHTML = '';
    returnForm.style.display = '';
    returnModalBackdrop.classList.add('show');
  }

  function closeReturnModal() {
    returnModalBackdrop.classList.remove('show');
    currentReturnRental = null;
  }

  btnCloseReturnModal.addEventListener('click', closeReturnModal);
  returnModalBackdrop.addEventListener('click', function (e) {
    if (e.target === returnModalBackdrop) closeReturnModal();
  });

  returnForm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!currentReturnRental) return;

    var returnStationId = returnStationSelect.value;
    var returnStation = data.stations.find(function (s) { return s.id === returnStationId; });
    if (!returnStation) return showReturnMsg('请选择归还站点。', true);
    if (returnStation.availableCount >= returnStation.totalSlots) {
      return showReturnMsg('该站点插槽已满，请选择另一个站点归还。', true);
    }

    var rental = data.rentals.find(function (r) { return r.id === currentReturnRental.id; });
    if (!rental || rental.status !== 'active') {
      return showReturnMsg('该订单已被处理，请刷新重试。', true);
    }

    var now = new Date().toISOString();
    var hours = PowerbankData.durationHours(rental.startTime, now);
    var billedHours = Math.max(1, Math.ceil(hours));
    var cost = billedHours * returnStation.pricePerHour;

    rental.endTime = now;
    rental.returnStationId = returnStation.id;
    rental.status = 'completed';
    rental.cost = cost;
    returnStation.availableCount += 1;
    PowerbankData.save(data);

    returnForm.style.display = 'none';
    returnMsg.innerHTML = '';
    returnResult.innerHTML = '<div class="msg success">归还成功！使用时长 ' + hours.toFixed(2) + ' 小时（按 ' + billedHours + ' 小时计费），费用 <strong>¥' + cost.toFixed(2) + '</strong>。</div>';

    renderStations();
  });

  function showReturnMsg(text, isError) {
    returnMsg.innerHTML = '<div class="msg ' + (isError ? 'error' : 'success') + '">' + text + '</div>';
  }

  renderStations();
})();
