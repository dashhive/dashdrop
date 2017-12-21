var DEBUG_DASH_AIRDROP = {};

$(function () {
  'use strict';

  var bitcore = require('bitcore-lib-dash');

  var exampleCsv = [
    '# = 4'
  , '"XjSBXfiAUdrGDJ8TYzSBc2Z5tjexAZao4Q", "7reAg9R74ujxxSj34jpbRpPhfsPt9ytAh3acMehhs1CmfoGFHbh"'
  , '"XunE8skypFR3MHAbu2S3vBZWrWStzQE9f7", "7s8YEQ8LPcCBcWajnwoRYqxCXo5W4AwFrftxQfzoomFGvqYTf8Z"'
  , '"XyGDB8JJhR2s7smACWdWDEV1Lgkg2YeZvH", "7rC9qypu87UCbaDDmAeGGK3JS1TYjLNtT97Nse1E1m7CQaMQSPY"'
  , '"Xsnn4AkwnRDPK3i4CC4MpnhGWcvBKM6bVG", "7qjqyQC7NYWbmRbCq1QfCa3PHZzECjos97WpX3KwWRBc2rxxjcQ"'
  ].join('\n');
  var exampleCsv2 = [
    '1,"XjSBXfiAUdrGDJ8TYzSBc2Z5tjexAZao4Q","7reAg9R74ujxxSj34jpbRpPhfsPt9ytAh3acMehhs1CmfoGFHbh"'
  , '2,"XunE8skypFR3MHAbu2S3vBZWrWStzQE9f7","7s8YEQ8LPcCBcWajnwoRYqxCXo5W4AwFrftxQfzoomFGvqYTf8Z"'
  , '3,"XyGDB8JJhR2s7smACWdWDEV1Lgkg2YeZvH","7rC9qypu87UCbaDDmAeGGK3JS1TYjLNtT97Nse1E1m7CQaMQSPY"'
  , '4,"Xsnn4AkwnRDPK3i4CC4MpnhGWcvBKM6bVG","7qjqyQC7NYWbmRbCq1QfCa3PHZzECjos97WpX3KwWRBc2rxxjcQ"'
  ];

  var config = {
    insightBaseUrl: 'https://api.dashdrop.coolaj86.com/insight-api-dash'
  , numWallets: 100
  , fee: 1000 // 1000 // 0 seems to give the "insufficient priority" error
  , serialize: { disableDustOutputs: true, disableSmallFees: true }
  };

  var data = {
    keypairs: []
  , claimableMap: {}
  , claimable: []
  };

  var DashDrop = {};
  DashDrop._privateToPublic = function (sk) {
    return new bitcore.PrivateKey(sk).toAddress().toString();
  };
  DashDrop._keypairToPublicKey = function (sk) {
    return sk.publicKey; //new bitcore.PrivateKey(sk).toAddress().toString();
  };
  // opts = { utxo, src, dsts, amount, fee }
  DashDrop.disburse = function (opts) {
    var tx = new bitcore.Transaction();

    opts.dsts.forEach(function (privateKey) {
      tx.to(new bitcore.PrivateKey(privateKey).toAddress(), opts.amount);
    });
    tx.change(new bitcore.PrivateKey(opts.src).toAddress());
    opts.utxos.forEach(function (utxo) {
      tx.from(utxo);
    });
    if ('undefined' !== typeof opts.fee) {
      tx.fee(opts.fee);
    }
    return tx.sign(new bitcore.PrivateKey(opts.src)).serialize({ disableDustOutputs: true, disableSmallFees: true });
  };

  // opts = { utxos, srcs, dst, fee }
  DashDrop.claim = function (opts) {
    var tx = new bitcore.Transaction();
    var addr;
    var sum = 0;
    var total;

    opts.utxos.forEach(function (utxo) {
      sum += utxo.satoshis;
      tx.from(utxo);
    });
    total = sum;

    if ('undefined' !== typeof opts.fee) {
      if (opts.utxos.length > 1) {
        // I'm not actually sure what the fee schedule is, but this worked for me
        opts.fee = Math.max(opts.fee, 2000);
      }
      sum -= (opts.fee);
      tx.fee(opts.fee);
    }

    if (52 === opts.dst.length || 51 === opts.dst.length) {
      addr = new bitcore.PrivateKey(opts.dst).toAddress();
    } else if (34 === opts.dst.length) {
      addr = new bitcore.Address(opts.dst);
    } else {
      throw new Error('unexpected key format');
    }
    //tx.to(addr);
    tx.change(addr);

    opts.srcs.forEach(function (sk) {
      tx.sign(new bitcore.PrivateKey(sk));
    });

    return tx.serialize({ disableDustOutputs: true, disableSmallFees: true });
  };

  var DashDom = {};
  DashDom.views = {};
  DashDom._hasBalance = function (pk) {
    try {
      return JSON.parse(localStorage.getItem('dash:' + (pk.publicKey || pk.privateKey))).amount;
    } catch(e) {
      return parseInt(localStorage.getItem('dash:' + (pk.publicKey || pk.privateKey)), 10);
    }
  };


  //
  // Insight Base URL
  //
  DashDom.updateInsightBase = function () {
    config.insightBaseUrl = $('.js-insight-base').val().replace(/\/+$/, '');
    //$('.js-insight-base').text(config.insightBaseUrl);
  };

  //
  // Generate Wallets
  //
  DashDrop._keyToKeypair = function (key, obj) {
    obj = obj || {};
    if (34 === key.length) {
      obj.publicKey = key;
    } else if (52 === key.length || 51 === key.length) {
      obj.privateKey = key;
      obj.publicKey = DashDrop._privateToPublic(key);
    } else {
      return null;
    }

    return obj;
  };
  DashDom._getWallets = function () {
    var i;
    var len = localStorage.length;
    var key;
    var wallets = [];
    var dashkey;
    var keypair;

    for (i = 0; i < len; i += 1) {
      key = localStorage.key(i);
      if (!/^dash:/.test(key)) {
        continue;
        //return;
      }

      try {
        keypair = JSON.parse(localStorage.getItem(key));
        if (!isNaN(keypair)) {
          keypair = { amount: keypair };
        }
      } catch(e) {
        keypair = { amount: parseInt(localStorage.getItem(key), 10) || 0 };
      }

      dashkey = key.replace(/^dash:/, '');

      if (!keypair || !keypair.publicKey) {
        keypair = DashDrop._keyToKeypair(dashkey, keypair);
      }

      if (!keypair) {
        console.warn("Not a valid cached key:", dashkey, localStorage.getItem(key));
        continue;
        //return;
      }

      wallets.push(keypair);
    }

    return wallets;
  };
  DashDom._toCsv = function (keypairs) {
    var csv = ''; //'# = ' + keypairs.length;
    csv += keypairs.map(function (keypair, i) {
      return (i + 1) + ','
        + JSON.stringify(keypair.publicKey) + ','
        + (JSON.stringify(keypair.privateKey) || '')
        + ',' + (keypair.amount || 0)
        ;
    }).join("\n");
    return csv;
  };
  DashDom.generateWallets = function () {
    console.log("generateWallets:");
    data.keypairs = DashDom._getWallets().filter(function (keypair) {
      if (keypair.privateKey && !keypair.amount) { return true; }
    });
    config.numWallets = $('.js-paper-wallet-quantity').val();
    var i;
    var bitkey;

    //data.privateKeys
    for (i = data.keypairs.length; i < config.numWallets; i += 1) {
      bitkey = new bitcore.PrivateKey();
      data.keypairs.push({
        privateKey: bitkey.toWIF()
      , publicKey: bitkey.toAddress().toString()
      , amount: 0
      });
    }
    data.keypairs = data.keypairs.slice(0, config.numWallets);
    data.csv = DashDom._toCsv(data.keypairs);

    console.log('toCsv:', data.csv);
    $('.js-paper-wallet-keys').val(data.csv);
    $('.js-paper-wallet-keys').text(data.csv);
  };
  DashDom.updateWalletQuantity = function () {
    var count = parseInt($('.js-paper-wallet-quantity').val(), 10);
    if (data._count && data._count === count) {
      return true;
    }
    data._count = count;

    $('.js-paper-wallet-quantity').text(count);
    return true;
  };
  DashDom.updateWalletCsv = function () {
    var walletCsv = $('.js-paper-wallet-keys').val().trim();
    if (data._walletCsv && data._walletCsv === walletCsv) {
      return true;
    }
    data._walletCsv = walletCsv;
    console.log('walletCsv:', data._walletCsv);

    data.publicKeysMap = {};

    data.keypairs = data._walletCsv.split(/[,\n\r\s]+/mg).map(function (key) {
      var kp;
      key = key.replace(/["']/g, '');
      kp = DashDrop._keyToKeypair(key);
      if (!kp) {
        return null;
      }
      if (data.publicKeysMap[kp.publicKey]) {
        if (!data.publicKeysMap[kp.publicKey].privateKey) {
          data.publicKeysMap[kp.publicKey].privateKey = kp.privateKey;
        }
        return null;
      }

      data.publicKeysMap[kp.publicKey] = kp;
      return kp;
    }).filter(Boolean);

    data.keypairs.forEach(function (kp) {
      var val = localStorage.getItem('dash:' + kp.publicKey);
      if (val) {
        data.publicKeysMap[kp.publicKey].amount = val.amount || Number(val) || 0;
      }
    });
    data.csv = DashDom._toCsv(data.keypairs);

    $('.js-paper-wallet-keys').val(data.csv);
    $('.js-paper-wallet-keys').text(data.csv);

    config.numWallets = data.keypairs.length;
    $('.js-paper-wallet-quantity').val(data.keypairs.length);
    $('.js-paper-wallet-quantity').text(data.keypairs.length);
  };


  //
  // Load Private Wallet
  //
  DashDom.updatePrivateKey = function () {
    data.wif = $('.js-funding-key').val();
    //localStorage.setItem('private-key', data.wif);
    var addr = new bitcore.PrivateKey(data.wif).toAddress().toString();

    var url = config.insightBaseUrl + '/addrs/:addrs/utxo'.replace(':addrs', addr);
    window.fetch(url, { mode: 'cors' }).then(function (resp) {
      resp.json().then(function (arr) {
        data.sum = 0;
        data.utxos = arr;
        arr.forEach(function (utxo) {
          if (utxo.confirmations >= 6) {
            data.sum += utxo.satoshis;
          } else {
            if (window.confirm("Transaction has not had 6 confirmations yet. Continue?")) {
              data.sum += utxo.satoshis;
            }
          }
        });
        //data.liquid = Math.round(Math.floor((data.sum - config.fee)/1000)*1000);
        data.liquid = data.sum - config.fee;
        $('.js-funding-amount').text(data.sum);
        if (!data.amount) {
          data.amount = Math.floor(data.liquid/config.numWallets);
          $('.js-paper-wallet-amount').val(data.amount);
          $('.js-paper-wallet-amount').text(data.amount);
        }

        DashDom.updateAirdropAmount();
      });
    });
  };
  DashDom.updateAirdropAmount = function () {
    var err;
    data.amount = parseInt($('.js-paper-wallet-amount').val(), 10);
    if (!data.sum || data.amount > data.sum) {
      err = new Error("Insufficient Funds: Cannot load " + data.amount + " mDash onto each wallet.");
      window.alert(err.message);
      throw err;
    }
  };
  DashDom.commitDisburse = function () {
    /*
    data.privateKeys.forEach(function (sk) {
      var amount = parseInt(localStorage.getItem('dash:' + sk), 10) || 0;
      localStorage.setItem('dash:' + sk, amount);
    });
    */

    var rawTx = DashDrop.disburse({
      utxos: data.utxos
    , src: data.wif
    , dsts: data.keypairs.map(function (kp) { return kp.privateKey; }).filter(Boolean)
    , amount: data.amount
    , fee: config.fee
    });
    console.log('transaction:');
    console.log(rawTx);

    var restTx = {
      url: config.insightBaseUrl + '/tx/send'
    , method: 'POST'
    , headers: {
        'Content-Type': 'application/json' //; charset=utf-8
      }
    , body: JSON.stringify({ rawtx: rawTx })
    };

    // TODO don't keep those which were not filled
    data.keypair.forEach(function (kp) {
      localStorage.setItem('dash:' + kp.publicKey, (kp.amount || 0) + data.amount);
    });

    return window.fetch(restTx.url, restTx).then(function (resp) {
      resp.json().then(function (result) {
        console.log('result:');
        console.log(result);
      });
    });
  };
  DashDom.inspectWallets = function () {
    var addrs = DashDom._getWallets().filter(DashDom._hasBalance).map(DashDrop._keypairToPublicKey);
    var addrses = [];
    var ledger = '';

    while (addrs.length) {
      addrses.push(addrs.splice(0, 10));
    };

    function done() {
      $('.js-airdrop-balances code').text(ledger);
      $('.js-airdrop-balances').addClass('in');
    }

    function nextBatch(addrs) {
      if (!addrs) {
        done();
        return;
      }
      var url = config.insightBaseUrl + '/addrs/:addrs/utxo'.replace(':addrs', addrs.join(','));
      window.fetch(url, { mode: 'cors' }).then(function (resp) {
        resp.json().then(function (utxos) {
          console.log('resp.json():');
          console.log(utxos);
          utxos.forEach(function (utxo) {
            if (utxo.confirmations >= 6) {
              ledger += utxo.address + ' ' + utxo.satoshis + ' (' + utxo.confirmations + '+ confirmations)' + '\n';
            } else {
              ledger += utxo.address + ' ' + utxo.satoshis + ' (~' + utxo.confirmations + ' confirmations)' + '\n';
            }
            if (utxo.confirmations >= 6 && utxo.satoshis) {
              if (!data.claimableMap[utxo.address + utxo.txid]) {
                data.claimableMap[utxo.address + utxo.txid] = true;
                data.claimable.push(utxo);
              }
            }
          });

          nextBatch(addrses.shift());
        });
      }, function (err) {
        console.error('Error:');
        console.error(err);
      });
    }
    nextBatch(addrses.shift());
  };
  DashDom.commitReclaim = function () {
    var txObj = {
      utxos: data.claimable
    , srcs: DashDom._getWallets().map(function () {
            })
    , dst: data.addr || data.wif
    , fee: config.fee
    };
    var rawTx = DashDrop.claim(txObj);

    console.log('reclaim rawTx:');
    console.log(txObj);
    console.log(rawTx);

    var restTx = {
      url: config.insightBaseUrl + '/tx/send'
    , method: 'POST'
    , headers: {
        'Content-Type': 'application/json' //; charset=utf-8
      }
    , body: JSON.stringify({ rawtx: rawTx })
    };

    return window.fetch(restTx.url, restTx).then(function (resp) {
      resp.json().then(function (result) {
        console.log('result:');
        console.log(result);

        // TODO demote these once the transactions are confirmed?
        /*
        data.privateKeys.forEach(function (sk) {
          localStorage.removeItem('dash:' + sk);
          localStorage.setItem('spent-dash:' + sk, 0);
        });
        */
      });
    });
  };
  DashDom.print = function () {
    window.print();
  };
  DashDom.showExampleCsv = function () {
    view.csv.show();
    $('.js-paper-wallet-keys').attr('placeholder', exampleCsv);
  };
  DashDom.showCsv = function () {
    view.csv.show();
    $('.js-paper-wallet-keys').removeAttr('placeholder');
  };


  //
  // Reclaim Wallets
  //
  DashDom.views.generate = function () {
    DashDom.generateWallets();
    $('.js-flow').addClass('hidden');
    $('.js-flow-generate').removeClass('hidden');
    setTimeout(function () {
      $('.js-flow-generate').addClass('in');
    });
  };
  DashDom.views.reclaim = function () {
    $('.js-flow').addClass('hidden');
    $('.js-flow-reclaim').removeClass('hidden');
    setTimeout(function () {
      $('.js-flow-reclaim').addClass('in');
    });
  };

  var view = {};
  view.csv = {
    toggle: function () {
      console.log('click, csv toggle');
      if ($('.js-csv-view').hasClass('hidden')) {
        $('.js-csv-view').removeClass('hidden');
      } else {
        $('.js-csv-view').addClass('hidden');
      }
    }
  , show: function () {
      $('.js-csv-view').removeClass('hidden');
    }
  , hide: function () {
      $('.js-csv-view').addClass('hidden');
    }
  };



  $('body').on('click', 'button.js-flow-generate', DashDom.views.generate);
  $('body').on('click', 'button.js-flow-reclaim', DashDom.views.reclaim);
  $('body').on('click', '.js-airdrop-inspect', DashDom.inspectWallets);
  $('body').on('click', '.js-airdrop-reclaim', DashDom.commitReclaim);
  $('body').on('keyup', '.js-paper-wallet-keys', DashDom.updateWalletCsv);
  $('body').on('keyup', '.js-paper-wallet-quantity', DashDom.updateWalletQuantity);
  $('body').on('click', '.js-paper-wallet-generate', DashDom.generateWallets);
  $('body').on('change', '.js-funding-key', DashDom.updatePrivateKey);
  $('body').on('change', '.js-paper-wallet-amount', DashDom.updateAirdropAmount);
  $('body').on('click', '.js-paper-wallet-commit', DashDom.commitDisburse);
  $('body').on('click', '.js-csv-hide', view.csv.hide);
  $('body').on('click', '.js-csv-show', DashDom.showCsv);
  $('body').on('click', '.js-csv-example', DashDom.showExampleCsv);
  $('body').on('change', '.js-insight-base', DashDom.updateInsightBase);
  $('body').on('click', '.js-paper-wallet-print', DashDom.print);


  //
  // Initial Values
  //
  $('.js-insight-base').val(config.insightBaseUrl);
  $('.js-paper-wallet-quantity').val(config.numWallets);
  $('.js-paper-wallet-quantity').text(config.numWallets);
  $('[name=js-fee-schedule]').val(config.fee);


  DEBUG_DASH_AIRDROP.config = config;
  DEBUG_DASH_AIRDROP.data = data;
});
