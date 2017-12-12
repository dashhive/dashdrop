var DEBUG_DASH_AIRDROP = {};
$(function () {
  'use strict';

  var config = {
    insightBaseUrl: 'http://104.236.12.147:3001/insight-api-dash'
  };
  var data = {
  };

  var bitcore = require('bitcore-lib-dash');
  var privateKey = new bitcore.PrivateKey();
  var wif = privateKey.toWIF();
  var addr = privateKey.toAddress.toString();

  console.log('New Key:');
  console.log('Share:', addr);
  console.log('Secret:', wif);
  console.log('');

  //
  // Insight Base URL
  //
  $('.js-insight-base').val(config.insightBaseUrl);
  $('body').on('change', '.js-insight-base', function () {
    config.insightBaseUrl = $('.js-insight-base').val().replace(/\/+$/, '');
    //$('.js-insight-base').text(config.insightBaseUrl);
  });

  //
  // Generate Wallets
  //
  $('body').on('change', '.js-dst-public-keys', function () {
    data.publicKeys = $('.js-dst-public-keys').val().trim().split(/[,\n\r\s]+/mg);
    $('.js-dst-public-keys').val(data.publicKeys.join('\n'));

    $('.js-airdrop-count').val(data.publicKeys.length);
    $('.js-airdrop-count').text(data.publicKeys.length);
    console.log('public keys:', data.publicKeys);

    // TODO store in localStorage
  });
  $('body').on('change', '.js-airdrop-count', function () {
    var count = $('.js-airdrop-count').val();
    $('.js-airdrop-count').text(count);
  });
  $('body').on('click', '.js-airdrop-generate', function () {
    var count = $('.js-airdrop-count').val();
    var i;
    var keypair;

    data.privateKeys = [];
    data.publicKeys = [];
    for (i = 0; i < count; i += 1) {
      keypair = new bitcore.PrivateKey();
      data.privateKeys.push( keypair.toWIF() );
      data.publicKeys.push( keypair.toAddress().toString() );
    }

    $('.js-dst-public-keys').val(data.publicKeys.join('\n'));
  });

  //
  // Reclaim Wallets
  //
  $('body').on('click', '.js-airdrop-inspect', function () {
    var addrs = data.publicKeys.join(',');
    var url = config.insightBaseUrl + '/addrs/:addrs/utxo'.replace(':addrs', addrs);
    window.fetch(url, { mode: 'cors' }).then(function (resp) {
      resp.json().then(function (val) {
        console.log('resp.json():');
        console.log(val);
      });
    }, function (err) {
      console.error('Error:');
      console.error(err);
    });
  });

  DEBUG_DASH_AIRDROP.config = config;
  DEBUG_DASH_AIRDROP.data = data;
});
