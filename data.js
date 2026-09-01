(function (global) {
  'use strict';
  var STORAGE_KEY = 'powerbank_lite_data_v1';

  function iso(d) {
    return d.toISOString();
  }

  // Places a timestamp somewhere within the elapsed portion of the CURRENT calendar month
  // (fraction 0 = start of month, fraction ~1 = now). This guarantees seed "historical" data
  // always lands in "this month" no matter what day of the month it is run on -- a fixed
  // days-ago offset would roll into last month whenever run near the 1st.
  function monthAgo(fraction) {
    var now = new Date();
    var startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    var span = now.getTime() - startOfMonth.getTime();
    return new Date(startOfMonth.getTime() + span * fraction);
  }

  function hoursAgo(n) {
    var d = new Date();
    d.setTime(d.getTime() - n * 3600000);
    return d;
  }

  function seed() {
    var stations = [
      { id: 'st1', name: '万象城东门站', location: '万象城购物中心 · 东门入口自助柜', totalSlots: 12, availableCount: 5, pricePerHour: 2 },
      { id: 'st2', name: '地铁三号线口站', location: '地铁三号线 A2 出口旁', totalSlots: 8, availableCount: 0, pricePerHour: 3 },
      { id: 'st3', name: '大学城便利店站', location: '大学城北街 24 号 · 好邻居便利店门口', totalSlots: 10, availableCount: 6, pricePerHour: 1.5 },
      { id: 'st4', name: '中央公园南门站', location: '中央公园南门广场', totalSlots: 6, availableCount: 2, pricePerHour: 2 },
      { id: 'st5', name: '火车站候车厅站', location: '火车站候车大厅 3 号立柱旁', totalSlots: 16, availableCount: 9, pricePerHour: 3 },
    ];

    // Historical completed rentals spread across this month (dynamic, relative dates).
    // `fraction` places startTime somewhere within [0, ~0.97] of the elapsed portion of the
    // current calendar month, so they always land in "this month" no matter which day it is run on.
    var rentals = [];
    var rid = 1;
    function addCompleted(stationId, returnStationId, phone, fraction, durHours) {
      var start = monthAgo(fraction);
      var now = new Date();
      var end = new Date(Math.min(start.getTime() + durHours * 3600000, now.getTime() - 60000));
      var station = stations.find(function (s) { return s.id === returnStationId; });
      var actualDurHours = (end.getTime() - start.getTime()) / 3600000;
      var cost = Math.ceil(actualDurHours) * station.pricePerHour;
      rentals.push({
        id: 'r' + (rid++),
        stationId: stationId,
        userPhone: phone,
        startTime: iso(start),
        endTime: iso(end),
        returnStationId: returnStationId,
        status: 'completed',
        cost: cost,
      });
    }

    addCompleted('st1', 'st3', '138****2201', 0.05, 1.5);
    addCompleted('st3', 'st1', '135****7788', 0.15, 3.2);
    addCompleted('st5', 'st2', '156****0093', 0.28, 0.6);
    addCompleted('st2', 'st4', '189****4521', 0.4, 2.1);
    addCompleted('st4', 'st5', '133****9012', 0.55, 5.4);
    addCompleted('st1', 'st1', '177****3344', 0.68, 1.1);
    addCompleted('st3', 'st2', '158****6677', 0.8, 0.3);
    addCompleted('st5', 'st5', '150****8899', 0.92, 2.8);

    // 1-2 currently active rentals (no endTime, no cost yet)
    rentals.push({
      id: 'r' + (rid++),
      stationId: 'st1',
      userPhone: '186****5566',
      startTime: iso(hoursAgo(1.2)),
      endTime: null,
      returnStationId: null,
      status: 'active',
      cost: null,
    });
    rentals.push({
      id: 'r' + (rid++),
      stationId: 'st5',
      userPhone: '199****1122',
      startTime: iso(hoursAgo(0.4)),
      endTime: null,
      returnStationId: null,
      status: 'active',
      cost: null,
    });

    return { stations: stations, rentals: rentals };
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        var s = seed();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
        return s;
      }
      return JSON.parse(raw);
    } catch (e) {
      return seed();
    }
  }

  function save(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function uid(prefix) {
    return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function durationHours(startIso, endIso) {
    var ms = new Date(endIso) - new Date(startIso);
    return ms / 3600000;
  }

  global.PowerbankData = {
    load: load,
    save: save,
    uid: uid,
    durationHours: durationHours,
    reset: function () { var s = seed(); save(s); return s; },
  };
})(window);
