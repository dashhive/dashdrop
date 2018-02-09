(function () {
  'use strict';

  var DashDrop = {};

  // The native unit is the (dash) satoshi
  // 10000 dash satoshi is 0.0001 dash
  DashDrop.toUsd = function (s) {
    return (parseFloat(DashDrop.toDash(s), 10) * config.conversions.dash_usd).toFixed(3).replace(/.$/, '');
  };
  DashDrop.fromUsd = function (dollar) {
    return DashDrop.fromDash(((parseFloat(dollar, 10) / (config.conversions.dash_usd))).toFixed(8));
  };
  DashDrop.fromDash = function (d) {
    return parseInt((parseFloat(d, 10) * config.SATOSHIS_PER_DASH).toFixed(0), 10);
  };
  DashDrop.toDash = DashDrop.fromSatoshi = function (s) {
    // technically toFixed(8), but practically only 4 digits matter (cents, dust)
    return parseFloat((parseFloat(s, 10) / config.SATOSHIS_PER_DASH).toFixed(4), 10);
  };

  window.DashDrop = DashDrop;
}());
