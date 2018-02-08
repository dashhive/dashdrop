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
  , walletQuantity: 100
  , minTransactionFee: 1000 // 1000 // 0 seems to give the "insufficient priority" error
  , transactionFee: 1000 // 1000 // 0 seems to give the "insufficient priority" error
  , walletAmount: 1000000
  //, walletAmount: 10000
  , serialize: { disableDustOutputs: true, disableSmallFees: true }
    // mdash per dash = 1000
    // udash per dash = 1000000
    // satoshis per dash = 100000000
  , dashMultiple: 1000000
    // 0.00000001
  , SATOSHIS_PER_DASH: 100000000
  , outputsPerTransaction: 1000 // theroetically 1900 (100kb transaction)
  //, reclaimDirty: false
  , reclaimDirty: true
  , UTXO_BATCH_MAX: 40 //100
  };

  var data = {
    keypairs: []
  , reclaimUtxos: []
  };

  var DashDrop = {};
  // 10000 dash satoshi is 0.0001 dash
  // The native unit is the (dash) satoshi
  DashDrop.dashToUsd = function (s) {
    return (parseFloat(s, 10) * config.conversions.dash_usd).toFixed(3).replace(/.$/, '');
  };
  DashDrop.toUsd = function (s) {
    return (parseFloat(DashDrop.toDash(s), 10) * config.conversions.dash_usd).toFixed(3).replace(/.$/, '');
  };
  DashDrop.fromUsd = function (dollar) {
    return DashDrop.fromDash(((parseFloat(dollar, 10) / (config.conversions.dash_usd))).toFixed(8));
  };
  DashDrop.centToDash = function (cent) {
    return ((parseFloat(cent, 10) / (config.conversions.dash_usd * 100))).toFixed(8);
  };
  DashDrop.dollarToDash = function (dollar) {
    return ((parseFloat(dollar, 10) / (config.conversions.dash_usd))).toFixed(8);
  };
  DashDrop.fromDash = function (d) {
    return parseInt((parseFloat(d, 10) * config.SATOSHIS_PER_DASH).toFixed(0), 10);
  };
  DashDrop.toDash = DashDrop.fromSatoshi = function (s) {
    return parseFloat((parseFloat(s, 10) / config.SATOSHIS_PER_DASH).toFixed(8), 10);
  };
  DashDrop._getSourceAddress = function (sk) {
    var bitkey;
    data.sourceAddress = JSON.parse(localStorage.getItem('source-address') || null);

    try {
      bitkey = new bitcore.PrivateKey(data.sourceAddress.privateKey);
    } catch(e) {
      data.sourceAddress = null;
    }

    if (!data.sourceAddress) {
      bitkey = new bitcore.PrivateKey();
      data.sourceAddress = {
        publicKey: bitkey.toAddress().toString()
      , privateKey: bitkey.toWIF()
      , amount: 0
      };
      localStorage.setItem('source-address', JSON.stringify(data.sourceAddress));
    }

    console.log("data.sourceAddress");
    console.log(data.sourceAddress);
    return data.sourceAddress;
  };
  DashDrop._privateToPublic = function (sk) {
    return new bitcore.PrivateKey(sk).toAddress().toString();
  };
  DashDrop._keypairToPublicKey = function (sk) {
    return sk.publicKey; //new bitcore.PrivateKey(sk).toAddress().toString();
  };
  // opts = { utxo, src, dsts, amount, fee }
  DashDrop.estimateFee = function (opts) {
    var tx = new bitcore.Transaction();

    opts.dsts.forEach(function (publicKey) {
      tx.to(new bitcore.Address(publicKey), opts.amount);
    });
    tx.change(opts.change || new bitcore.PrivateKey(opts.src).toAddress());
    opts.utxos.forEach(function (utxo) {
      tx.from(utxo);
    });

    return tx.getFee();
  };
  DashDrop.disburse = function (opts) {
    var tx = new bitcore.Transaction();

    opts.dsts.forEach(function (publicKey) {
      tx.to(new bitcore.Address(publicKey), opts.amount);
    });
    tx.change(new bitcore.PrivateKey(opts.src).toAddress());
    opts.utxos.forEach(function (utxo) {
      tx.from(utxo);
    });
    if ('number' === typeof opts.fee && !isNaN(opts.fee)) {
      tx.fee(opts.fee);
    }
    return tx.sign(new bitcore.PrivateKey(opts.src)).serialize({ disableDustOutputs: true, disableSmallFees: true });
  };

  DashDrop.createTx = function (opts) {
    var tx = new bitcore.Transaction();
    var addr;
    //var sum = 0;
    //var total;

    opts.utxos.forEach(function (utxo) {
      //sum += utxo.satoshis;
      tx.from(utxo);
    });
    //total = sum;

    if ('number' === typeof opts.fee && !isNaN(opts.fee)) {
      console.log('1 opts.fee:', opts.fee);
      if (opts.utxos.length > 1) {
        // I'm not actually sure what the fee schedule is, but this worked for me
        opts.fee = Math.max(opts.fee, config.minTransactionFee * 2/*opts.utxos.length*/);
        console.log('2 opts.fee:', opts.fee, config.minTransactionFee * 2);
      }
      //sum -= (opts.fee);
      console.log('3 opts.fee:', opts.fee);
      tx.fee(opts.fee);
    }

    addr = DashDrop._keyToKeypair(opts.dst).publicKey;
    if (!addr) {
      window.alert("invalid key format");
      throw new Error('unexpected key format');
    }

    //tx.to(addr);
    tx.change(addr);

    opts.srcs.forEach(function (sk) {
      tx.sign(new bitcore.PrivateKey(sk));
    });

    return tx;
  };
  DashDrop.estimateReclaimFee = function (opts) {
    var utxos = opts.utxos.slice();
    var fee = 0;
    opts.dst = opts.dst || new bitcore.PrivateKey().toAddress().toString();

    while (utxos.length) {
      opts.utxos = utxos.splice(0, config.UTXO_BATCH_MAX);
      fee += DashDrop.createTx(opts).getFee();
    }

    return fee;
  };
  // opts = { utxos, srcs, dst, fee }
  DashDrop.reclaimTx = function (opts) {
    var tx = DashDrop.createTx(opts);

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
    var csv = DashDrop._toCsv(keypairs);
    console.log('toCsv:', csv);
    $('.js-paper-wallet-keys').val(csv);
    $('.js-paper-wallet-keys').text(csv);
    return csv;
  };
  DashDrop._toCsv = function (keypairs) {
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
    config.walletQuantity = $('.js-paper-wallet-quantity').val();
    var i;
    var bitkey;

    //data.privateKeys
    for (i = data.keypairs.length; i < config.walletQuantity; i += 1) {
      bitkey = new bitcore.PrivateKey();
      data.keypairs.push({
        privateKey: bitkey.toWIF()
      , publicKey: bitkey.toAddress().toString()
      , amount: 0
      });
    }
    data.keypairs = data.keypairs.slice(0, config.walletQuantity);
    data.csv = DashDom._toCsv(data.keypairs);

    config.transactionFee = DashDom.estimateFee(config, data);
    DashDom.updateTransactionTotal();
    view.csv.show();
  };
  DashDom._debounceWq = null;
  DashDom.updateWalletQuantity = function () {
    DashDom._debounceWq = setTimeout(function () {
      var quantity = parseInt($('.js-paper-wallet-quantity').val(), 10);
      if (quantity > config.outputsPerTransaction) {
        window.alert("Only " + config.outputsPerTransaction + " wallets can be generated at a time");
        quantity = config.outputsPerTransaction;
        $('.js-paper-wallet-quantity').val(quantity);
      }
      if (config.walletQuantity && config.walletQuantity === quantity) {
        return true;
      }
      config.walletQuantity = quantity;

      $('.js-paper-wallet-quantity').text(quantity);

      clearTimeout(DashDom._debounceWq);
        //DashDom.updateTransactionTotal();
        DashDom.generateWallets();
    }, 300);
    return true;
  };
  DashDom.updateWalletCsv = function () {
    var $el = $(this);
    clearTimeout(DashDom.__walletCsv);
    DashDom.__walletCsv = setTimeout(function () {
      DashDom._updateWalletCsv($el);
    }, 750);
  };
  DashDom._updateWalletCsv = function ($el) {
    console.log('keyup on csv');
    var walletCsv = $el.val().trim();
    if (data._walletCsv && data._walletCsv === walletCsv) {
      return true;
    }
    data._walletCsv = walletCsv;
    console.log('walletCsv:', data._walletCsv);

    data.keypairs = DashDrop._updateWalletCsv(walletCsv);
    console.log('updateWalletCsv, inspectWallets');
    DashDom.inspectWallets(data.keypairs);

    $('.js-paper-wallet-quantity').val(data.keypairs.length);
    $('.js-paper-wallet-quantity').text(data.keypairs.length);
  };
  DashDrop._updateWalletCsv = function (csv) {
    var publicKeysMap = {};
    var keypairs = csv.split(/[,\n\r\s]+/mg).map(function (key) {
      var kp;
      key = key.replace(/["']/g, '');
      kp = DashDrop._keyToKeypair(key);
      if (!kp) {
        return null;
      }
      if (publicKeysMap[kp.publicKey]) {
        if (!publicKeysMap[kp.publicKey].privateKey) {
          publicKeysMap[kp.publicKey].privateKey = kp.privateKey;
        }
        return null;
      }

      publicKeysMap[kp.publicKey] = kp;
      return kp;
    }).filter(Boolean);
    console.log('keypairs', keypairs);

    keypairs.forEach(function (kp) {
      var val = localStorage.getItem('dash:' + kp.publicKey);
      if (val) {
        publicKeysMap[kp.publicKey].amount = val.amount || Number(val) || 0;
      }
    });
    data.csv = DashDom._toCsv(keypairs);

    config.walletQuantity = keypairs.length;
    return keypairs;
  };


  //
  // Load Private Wallet
  //
  DashDom.updateTransactionTotal = function () {
    console.log('update transaction total', config.walletQuantity);
    // TODO you can only have one transaction per UTXO
    config.transactionCount = Math.ceil(config.walletQuantity / config.outputsPerTransaction);
    config.estimatedTransactionFee = DashDom.estimateFee(config, data);
    config.transactionTotal = (config.transactionCount * config.transactionFee)
      + (config.walletAmount * config.walletQuantity);
    $('input.js-transaction-fee').val(DashDrop.toDash(config.transactionFee));
    $('span.js-transaction-fee').text(DashDrop.toDash(config.transactionFee));
    $('input.js-transaction-fee-usd').val(DashDrop.toUsd(config.transactionFee));
    $('span.js-transaction-fee-usd').text(DashDrop.toUsd(config.transactionFee));
    $('.js-transaction-count').val(config.transactionCount);
    $('.js-transaction-count').text(config.transactionCount);
    $('input.js-transaction-total').val(DashDrop.toDash(config.transactionTotal));
    $('span.js-transaction-total').text(DashDrop.toDash(config.transactionTotal));
    $('input.js-transaction-total-usd').val(DashDrop.toUsd(config.transactionTotal));
    $('span.js-transaction-total-usd').text(DashDrop.toUsd(config.transactionTotal));
    if (data.fundingKey && config.transactionTotal <= data.fundingTotal) {
      $('.js-transaction-commit-error').addClass('hidden');
      $('button.js-transaction-commit').prop('disabled', false);
    } else {
      $('.js-transaction-commit-error').removeClass('hidden');
      $('button.js-transaction-commit').prop('disabled', true);
    }
  };
  DashDom.updateFundingKey = function (ev) {
    var $el = $(this);
    DashDom._updateFundingKey($el, ev);
  };
  DashDom._updateFundingKey = function ($el) {
    console.log('$el', $el);
    console.log('$el.val()', $el.val());
    var keypair = DashDrop._keyToKeypair($el.val());
    var qrPublic = new QRious({
      element: document.querySelector('.js-funding-qr-public')
    , value: keypair.publicKey
    , size: 256
    , background: '#CCFFFF'
    });
    var qrPrivate;
    if (keypair.privateKey) {
      qrPrivate = new QRious({
        element: document.querySelector('.js-funding-qr-private')
      , value: keypair.privateKey
      });
    }
    if (keypair.privateKey && data.reclaimUtxos.length) {
      $('.js-reclaim-commit').prop('disabled', false);
    } else {
      $('.js-reclaim-commit').prop('disabled', true);
    }
    $('.js-funding-key-public').val(data.fundingKeypair.publicKey);

    DashDrop._updateFundingKey(keypair).then(function () {
      // whatever
      $('.js-transaction-fee').val(DashDrop.toDash(config.transactionFee));
      $('.js-transaction-fee').text(DashDrop.toDash(config.transactionFee));
      $('.js-transaction-fee-usd').val(DashDrop.toUsd(config.transactionFee));
      $('.js-transaction-fee-usd').text(DashDrop.toUsd(config.transactionFee));

      $('.js-funding-amount').val(DashDrop.toDash(data.fundingTotal));
      $('.js-funding-amount').text(DashDrop.toDash(data.fundingTotal));
      $('.js-funding-amount-usd').val(DashDrop.toUsd(data.fundingTotal));
      $('.js-funding-amount-usd').text(DashDrop.toUsd(data.fundingTotal));

      DashDom.updateWalletAmount();
    });
  };
  DashDrop._updateFundingKey = function (keypair) {
    var addr = keypair.publicKey;
    data.fundingKey = keypair.privateKey || keypair.publicKey;

    var url = config.insightBaseUrl + '/addrs/:addrs/utxo'.replace(':addrs', addr);
    return window.fetch(url, { mode: 'cors' }).then(function (resp) {
      return resp.json().then(function (arr) {
        var cont;
        data.fundingTotal = 0;
        data.fundingUtxos = arr;
        arr.forEach(function (utxo) {
          if (utxo.confirmations >= 6) {
            data.fundingTotal += utxo.satoshis;
          } else {
            if (false === cont) { return; }
            if (true !== cont) {
              cont = window.confirm("Funding source has not had 6 confirmations yet. Continue?")
            }
            if (true === cont) { data.fundingTotal += utxo.satoshis; }
          }
        });

        var txOpts = {
          src: data.fundingKey
        , dsts: data.keypairs.map(function (kp) { return kp.publicKey })
        , amount: config.walletAmount
        , utxos: data.fundingUtxos
        };
        config.transactionFee = DashDrop.estimateFee(txOpts);

        return config.transactionFee;
      });
    });
  };
  DashDom.estimateFee = function () {
    var bitkey = new bitcore.PrivateKey();
    var txOpts = {
      src: bitkey.toWIF()
    , dsts: data.keypairs.map(function (kp) { return kp.publicKey })
    , amount: config.walletAmount
      // some made-up address with infinite money
    , utxos: data.fundingUtxos || [{"address":"XwZ3CBB97JnyYi17tQdzFDhZJYCenwtMU8","txid":"af37fad079c34a8ac62a32496485f2f8815ddd8fd1d5ffec84f820a91d82a7fc","vout":2,"scriptPubKey":"76a914e4e0cc1758622358f04c7d4d6894201c7ca3a44788ac","amount":8601,"satoshis":860100000000,"height":791049,"confirmations":6}]
    };
    return DashDrop.estimateFee(txOpts);
  };
  DashDom.updateWalletAmountDash = function (ev) {
    config._walletAmount = DashDrop.fromDash($('input.js-paper-wallet-amount').val());
    $('input.js-paper-wallet-amount-usd').val(DashDrop.toUsd(config._walletAmount));
    $('span.js-paper-wallet-amount-usd').text(DashDrop.toUsd(config._walletAmount));
    $('span.js-paper-wallet-amount').text(DashDrop.toDash(config._walletAmount));
    DashDom.updateWalletAmount(ev);
  };
  DashDom.updateWalletAmountUsd = function (ev) {
    config._walletAmount = DashDrop.fromUsd($('input.js-paper-wallet-amount-usd').val());
    $('input.js-paper-wallet-amount').val(DashDrop.toDash(config._walletAmount));
    $('span.js-paper-wallet-amount').text(DashDrop.toDash(config._walletAmount));
    $('span.js-paper-wallet-amount-usd').text(DashDrop.toUsd(config._walletAmount));
    DashDom.updateWalletAmount(ev);
  };
  DashDom.updateWalletAmount = function () {

    if (!config.walletAmount && !config._walletAmount) {
      config.walletAmount = Math.floor(
        (data.fundingTotal - (config.transactionCount * config.transactionFee)) / config.walletQuantity
      );
    }

    if (!config._walletAmount || (config.walletAmount && config.walletAmount === config._walletAmount)) {
      return true;
    }

    config.walletAmount = config._walletAmount;
    DashDom.updateTransactionTotal();
  };
  DashDom.commitDisburse = function () {
    // The logic here is built such that multiple funding private keys could be used in the future
    var fundingKeypair = DashDrop._keyToKeypair(data.fundingKey);
    if (!data.fundingKey || !fundingKeypair.privateKey) {
      window.alert("Please choose a Private Key with sufficient funds as a funding source.");
      return;
    }

    var keypairs = data.keypairs.slice(0);
    var keysets = [];
    while (keypairs.length) {
      keysets.push(keypairs.splice(0, config.outputsPerTransaction));
    }
    if (keysets.length > 1) {
      window.alert("Only the first " + config.outputsPerTransaction + " wallets will be filled (1000 outputs per UTXO per private key).");
      keysets.length = 1;
    }

    function nextTx(x) {
      var keyset = keysets.shift();
      if (!keyset) {
        return Promise.resolve(x);
      }

      var rawTx = DashDrop.disburse({
        utxos: data.fundingUtxos
      , src: data.fundingKey
      , dsts: keyset.map(function (kp) { return kp.publicKey; }).filter(Boolean)
      , amount: config.walletAmount
      , fee: config.transactionFee || undefined
      });
      console.log('transaction:');
      console.log(rawTx);

      var restTx = {
        url: config.insightBaseUrl + '/tx/send'
      , method: 'POST'
      , headers: { 'Content-Type': 'application/json' }
      , body: JSON.stringify({ rawtx: rawTx })
      };

      keyset.forEach(function (kp) {
        localStorage.setItem('dash:' + kp.publicKey, JSON.stringify({
          privateKey: kp.privateKey
        , publicKey: kp.publicKey
        , amount: (kp.amount || 0) + config.walletAmount
        , commited: false
        }));
      });

      return window.fetch(restTx.url, restTx).then(function (resp) {
        // 258: txn-mempool-conflict. Code:-26
        return resp.json().then(function (result) {
          console.log('result:');
          console.log(result);
          keyset.forEach(function (kp) {
            localStorage.setItem('dash:' + kp.publicKey, JSON.stringify({
              privateKey: kp.privateKey
            , publicKey: kp.publicKey
            , amount: (kp.amount || 0) + config.walletAmount
            , commited: true
            }));
          });

          return result;
        });
      }).then(function (y) { return y; }, function (err) {
        console.error("Disburse Commit Transaction Error:");
        console.error(err);
        window.alert("An error occured. Transaction may have not committed.");
      }).then(function (y) {
        return nextTx(y || x);
      });
    }

    return nextTx().then(function (result) {
      $('.js-transaction-commit-complete').removeClass('hidden');
      $('.js-transaction-id').text(result.txid);

      // Don't allow changing of keys
      $('button.js-paper-wallet-generate').prop('disabled', true);
      $('textarea.js-paper-wallet-keys').prop('disabled', true);
      $('input.js-paper-wallet-quantity').prop('disabled', true);
      $('body').off('keyup', '.js-paper-wallet-keys', DashDom.updateWalletCsv);
      $('body').off('click', '.js-paper-wallet-generate', DashDom.generateWallets);
      $('body').off('keyup', '.js-paper-wallet-quantity', DashDom.updateWalletQuantity);
      // Don't allow anything else
      $('input.js-transaction-fee').prop('disabled', true);
      $('input.js-transaction-fee-usd').prop('disabled', true);
      $('input.js-funding-key').prop('disabled', true);
      $('input.js-paper-wallet-amount').prop('disabled', true);
    });
  };
  DashDom._createMap = function (addr) {
    return { change: 0, value: 0, in: 0, out: 0, satoshis: 0, utxos: [], txs: [], addr: addr };
  };
  DashDom.inspectWallets = function (wallets) {
    var resultsMap = {};
    var valIn = 0;
    var valOut = 0
    var mostRecent = 0;
    var leastRecent = Date.now() + (60 * 60 * 24 * 1000 * 3650);
    var publicKeysMap = {};
    var count = 0;

    $('.js-paper-wallet-total').text(wallets.length);

    if (!wallets.length) {
      return Promise.resolve();
    }

    wallets.forEach(function (w) {
      publicKeysMap[w.publicKey] = w;
    });

    $('.js-paper-wallet-load').removeClass('hidden');
    $('.js-paper-wallet-load .progress-bar').css({ width: '2%' });
    $('.js-paper-wallet-load .progress-bar').text('2%');
    return DashDrop.inspectWallets({
      wallets: wallets
    , progress: function (progress) {
        // If there are both unspent transactions and spent transactions,
        // then we should probably not reclaim this address

        count += 10;
        var percent = (count / wallets.length) * 100;
        var showPercent = Math.max(5, (percent * 0.93)); // always at least 5, never 100
        $('.js-paper-wallet-load .progress-bar').css({ width: showPercent + '%' });
        $('.js-paper-wallet-load .progress-bar').text(showPercent.toFixed(2) + '%');
        if (progress.data.utxos) {
          progress.data.utxos.forEach(function (utxo) {
            function insert(map) {
              if (!publicKeysMap[utxo.address]) {
                console.warn('utxo not found:');
                console.warn(utxo);
                return;
              }
              if (!map[utxo.address]) {
                map[utxo.address] = DashDom._createMap(utxo.address);
              }

              map[utxo.address].utxos.push(utxo);
              map[utxo.address].satoshis += utxo.satoshis;
            }

            insert(resultsMap);
            /*
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
            */
          });
        }
        if (progress.data.items) {
          progress.data.items = progress.data.items.sort(function (a, b) {
            // earliest first
            return a.time - b.time;
          });
          //console.log('progress.data.items:');
          //console.log(progress.data.items);
          progress.data.items.forEach(eachTx);

          function eachTx(tx) {
            var addr;
            // each vin is actually a utxo
            tx.vin.forEach(function (vin) {
              addr = vin.addr;
              var val = Math.round((parseFloat(vin.value, 10) || 0) * config.SATOSHIS_PER_DASH);
              if (!publicKeysMap[vin.addr]) { return; }

              if (!resultsMap[vin.addr]) {
                resultsMap[vin.addr] = DashDom._createMap(vin.addr.address);
              }
              if (!resultsMap[vin.addr].loaded) {
                resultsMap[vin.addr].loaded = true;
                // only do this on the first (oldest) transaction
                resultsMap[vin.addr].in += val;
                valIn += val;
              }
            });
            if (!publicKeysMap[addr]) { return; }

            // NOTE: in our use case for this app
            // the very first transaction in values will be what was put in
            // any later transactions will be full values of the change
            resultsMap[addr].txs.push(tx);
            resultsMap[addr].time = Math.min(tx.time * 1000, resultsMap[addr].time || Infinity);
            mostRecent = Math.max(resultsMap[addr].time, mostRecent);
            leastRecent = Math.min(resultsMap[addr].time, leastRecent)
            /*
            tx.vout.forEach(function (vout) {
              var val = Math.round((parseFloat(vout.value, 10) || 0) * config.SATOSHIS_PER_DASH);
              vout.scriptPubKey.addresses.forEach(function (_addr) {
                if (_addr === addr) {
                  // self used as change address, not actually spent
                  // this will be represented as utxo
                  //resultsMap[addr].value == val;
                  return;
                }
                resultsMap[addr].out += val;
                valOut += val;
              });
            });
            */
          }
        }
      }
    }).then(function () {
      $('.js-paper-wallet-load .progress-bar').css({ width: '96%' });
      $('.js-paper-wallet-load .progress-bar').text('96%');
      return new Promise(function (resolve, reject) {
        setTimeout(function () {
          resolve();
        }, 50);
      });
    }).then(function () {
      var satoshis = 0;
      var fullMap = {};
      var dirtyMap = {};
      var emptyMap = {};
      var otherMap = {};
      var newMap = {};

      console.log('resultsMap:');
      console.log(resultsMap);
      Object.keys(resultsMap).forEach(function (addr) {
        var txs = resultsMap[addr];
          // don't double count those that have had transactions and uxtos
        if (!txs.txs.length) {
          // basically we could use valIn here instead
          satoshis += txs.satoshis;
        }

        // commenting out multiple utxos for test data
        // TODO uncomment
        if ((txs.txs.length && txs.utxos.length)/* || txs.utxos.length > 1*/) {
          dirtyMap[addr] = txs;
        } else if (/*1 === */txs.utxos.length) {
          fullMap[addr] = txs;
        } else if (txs.time) {
          emptyMap[addr] = txs;
        } else {
          otherMap[addr] = txs;
        }
      });
      console.log('post results map');

      wallets.forEach(function (w) {
        if (resultsMap[w.publicKey]) {
          w.amount = resultsMap[w.publicKey].satoshis;
        }
        if (!resultsMap[w.publicKey]) {
          newMap[w.publicKey] = DashDom._createMap(w.publicKey);
        }
      });
      console.log('pre csv');
      data.csv = DashDom._toCsv(wallets);
      console.log('post csv');

      // TODO need to check which were loaded, unloaded
      var allCount = wallets.length;
      var fullCount = Object.keys(fullMap).length;
      var dirtyCount = Object.keys(dirtyMap).length;
      var emptyCount = Object.keys(emptyMap).length;
      var usedCount = emptyCount + dirtyCount;
      var loadedCount = fullCount + emptyCount + dirtyCount;
      var otherCount = Object.keys(otherMap).length;
      var newCount = Object.keys(newMap).length;
      // otherCount and newCount should be the same... right?
      console.log('allCount', allCount);
      console.log('fullCount', fullCount);
      console.log('dirtyCount', dirtyCount);
      console.log('emptyCount', emptyCount);
      console.log('loadedCount', loadedCount);
      console.log('otherCount', otherCount);
      console.log('newCount', newCount);
      console.log('valIn', valIn);
      console.log('valOut', valOut);
      console.log('satoshis', satoshis);
      console.log('mostRecent', new Date(mostRecent).toISOString());
      console.log('leastRecent', new Date(leastRecent).toISOString());

      var percent = Math.round((usedCount / (loadedCount || 1)) * 100);

      $('.js-paper-wallet-percent').text(percent);
      $('.js-paper-wallet-used').text(usedCount);
      $('.js-paper-wallet-loaded').text(loadedCount);
      $('.js-paper-wallet-balance').val(satoshis);
      $('.js-paper-wallet-balance').text((satoshis / config.SATOSHIS_PER_DASH).toFixed(8));
      // it's gone out if it's been used as an input
      $('.js-paper-wallet-balance-out').text((valIn / config.SATOSHIS_PER_DASH).toFixed(8));
      //$('.js-paper-wallet-balance-out').text((valOut / config.SATOSHIS_PER_DASH).toFixed(8));
      $('.js-paper-wallet-balance-in').text(((valIn + satoshis) / config.SATOSHIS_PER_DASH).toFixed(8));
      $('.js-paper-wallet-most-recent').text(new Date(mostRecent).toLocaleString());
      $('.js-paper-wallet-least-recent').text(new Date(leastRecent).toLocaleString());
      //$('.js-paper-wallet-least-recent').text(new Date(leastRecent).toLocaleDateString());

      console.log('post ui update');

      data.reclaimUtxos = [];
      Object.keys(fullMap).forEach(function (key) {
        fullMap[key].utxos.forEach(function (utxo) {
          data.reclaimUtxos.push(utxo);
        });
      });
      if (config.reclaimDirty) {
        Object.keys(dirtyMap).forEach(function (key) {
          dirtyMap[key].utxos.forEach(function (utxo) {
            data.reclaimUtxos.push(utxo);
          });
        });
      }
      console.log('post array');
      data.reclaimKeypairs = wallets.slice(0);
      console.log('pre estimate');
      data.transactionFee = DashDrop.estimateReclaimFee({
        utxos: data.reclaimUtxos
      , srcs: data.reclaimKeypairs.map(function (kp) { return kp.privateKey; }).filter(Boolean)
      , dst: null // data.fundingKey
      //, fee: null // config.transactionFee
      });
      console.log('post estimate');
      console.log('data.transactionFee:', data.transactionFee);
      $('span.js-transaction-fees').text(DashDrop.toDash(data.transactionFee));
      $('input.js-transaction-fee').val(DashDrop.toDash(data.transactionFee));
      $('span.js-transaction-fees-usd').text(DashDrop.toUsd(data.transactionFee));
      $('input.js-transaction-fee-usd').val(DashDrop.toUsd(data.transactionFee));
      $('.js-paper-wallet-load .progress-bar').css({ width: '100%' });
      $('.js-paper-wallet-load .progress-bar').text('100%');
    });
  };
  DashDrop.inspectWallets = function (opts) {
    var addrs = opts.wallets.map(DashDrop._keypairToPublicKey);
    var total = addrs.length;
    var count = 0;
    var addrses = [];
    var MAX_BATCH_SIZE = 10;
    var set;

    while (addrs.length) {
      set = addrs.splice(0, MAX_BATCH_SIZE);
      count += set.length;
      addrses.push(set);
    };

    function nextBatch(addrs) {
      if (!addrs) { return; }

      // https://api.dashdrop.coolaj86.com/insight-api-dash/addrs/XbxDxU8ry96ZpXm4wDiFdpRNGiWuXfemNK,Xr7x52ykWX7FmCcuy32zC2F69817vuwywU/utxo
      var url = config.insightBaseUrl + '/addrs/:addrs/utxo'.replace(':addrs', addrs.join(','));
      var utxos;

      return window.fetch(url, { mode: 'cors' }).then(function (resp) {
        return resp.json().then(function (_utxos) {
          utxos = _utxos;
          console.log('utxos resp.json():', url);
          console.log(utxos);
        });
      }, function (err) {
        console.error('UTXO Error:');
        console.error(err);
        return null;
      }).then(function () {
        // https://api.dashdrop.coolaj86.com/insight-api-dash/addrs/XbxDxU8ry96ZpXm4wDiFdpRNGiWuXfemNK,Xr7x52ykWX7FmCcuy32zC2F69817vuwywU/txs
        var url = config.insightBaseUrl + '/addrs/:addrs/txs'.replace(':addrs', addrs.join(','));
        var results;

        return window.fetch(url, { mode: 'cors' }).then(function (resp) {
          return resp.json().then(function (_results) {
            results = _results;
            console.log('txs resp.json():', url);
            console.log(results);
          });
        }, function (err) {
          console.error('Transaction Error:');
          console.error(err);
        }).then(function () {
          if ('function' === typeof opts.progress) {
            if (!results) { results = {}; }
            results.utxos = utxos;
            opts.progress({ data: results, count: count, total: total });
          }

          return nextBatch(addrses.shift());
        });
      });
    }

    return nextBatch(addrses.shift());
  };
  DashDom.commitReclaim = function () {
    console.log('commit reclaim');
    var reclaimUtxos = data.reclaimUtxos.slice();
    var txResults = [];

    function nextBatch() {
      var utxos = reclaimUtxos.splice(0, config.UTXO_BATCH_MAX);
      if (!utxos.length) { return txResults; }
      var txObj = {
        utxos: utxos
      , srcs: data.reclaimKeypairs.map(function (kp) { return kp.privateKey; }).filter(Boolean)
      , dst: data.fundingKey
      };
      if (config.transactionFee) {
        txObj.fee = config.transactionFee;
      }
      var rawTx = DashDrop.reclaimTx(txObj);
      var restTx = {
        url: config.insightBaseUrl + '/tx/send'
      , method: 'POST'
      , headers: { 'Content-Type': 'application/json' }
      , body: JSON.stringify({ rawtx: rawTx })
      };

      return window.fetch(restTx.url, restTx).then(function (resp) {
        return resp.json().then(function (result) {
          txResults.push(result);
          return nextBatch();
        });
      });
    };

    return nextBatch().then(function () {
      console.log("Transaction Batch", txResults);
      $('.js-transaction-ids').text(results.map(function (tx) { return tx.txid; }).join('\n'));
      $('.js-reclaim-commit-complete').removeClass('hidden');
    });
  };
  DashDom.print = function () {
    window.print();
  };
  DashDom.downloadCsv = function () {
    var hiddenElement = document.createElement('a');
    hiddenElement.href = 'data:text/csv;base64,' + btoa(data.csv);
    hiddenElement.target = '_blank';
    hiddenElement.download = 'dash-paper-wallets.csv';
    hiddenElement.click();
  };
  DashDom.importCsv = function () {
    $('.js-csv-import-file').click();
  };
  DashDom.uploadCsv = function () {
    $('.js-csv-upload-file').click();
  };
  DashDom._parseFileCsv = function (file, cb) {
    var reader = new FileReader();
    reader.addEventListener('error', function () {
      window.alert("Error parsing CSV");
    });
    reader.addEventListener('load', function (ev) {
      data.csv = ev.target.result;
      $('.js-paper-wallet-keys').val(data.csv);
      console.log('data.csv:');
      console.log(data.csv);
      DashDom._updateWalletCsv($('.js-paper-wallet-keys'));
      console.log('data.keypairs:');
      console.log(data.keypairs);
      cb();
    });
    reader.readAsText(file);
  };
  DashDom.importFileCsv = function () {
    var file = $('.js-csv-import-file')[0].files[0];
    DashDom._parseFileCsv(file, function () {
      DashDom.initCsv();
    });
  };
  DashDom.parseFileCsv = function () {
    var file = $('.js-csv-upload-file')[0].files[0];
    DashDom._parseFileCsv(file, function () {
      view.csv.show();
    });
  };
  DashDom.showExampleCsv = function () {
    view.csv.show();
    $('.js-paper-wallet-keys').attr('placeholder', exampleCsv);
  };
  DashDom.showCsv = function () {
    view.csv.show();
    $('.js-paper-wallet-keys').removeAttr('placeholder');
  };
  DashDom.updateFeeScheduleDash = function () {
    var $el = $(this);
    config._fee = DashDrop.fromDash($el.val());
    DashDom.updateFeeSchedule();
  };
  DashDom.updateFeeScheduleUsd = function () {
    var $el = $(this);
    config._fee = DashDrop.fromUsd($el.val());
    DashDom.updateFeeSchedule();
  };
  DashDom.updateFeeSchedule = function () {
    // XXX xfer
    if (config._fee && !isNaN(config._fee)) {
      config.transactionFee = config._fee;
      DashDom.updateTransactionTotal();
    }
    return true;
  };
  DashDom.initReclaim = function () {
    var wallets = DashDom._getWallets().filter(DashDom._hasBalance);
    //return DashDom.inspectWallets(wallets);
    return DashDom.inspectWallets(wallets);
  };
  DashDom.initCsv = function () {
    var wallets = data.keypairs; //DashDom._getWallets();
    //return DashDom.inspectWallets(wallets);
    return DashDom.inspectWallets(wallets);
  };


  //
  // Reclaim Wallets
  //
  DashDom.views.generate = function () {
    DashDom.generateWallets();
    view.csv.hide();
    data.fundingKeypair = DashDrop._getSourceAddress();
    data.fundingKey = data.fundingKeypair.privateKey;
    $('.js-funding-key').val(data.fundingKeypair.privateKey);
    $('.js-funding-key').trigger('keyup');
    //DashDom._updateFundingKey($('.js-funding-key'));

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
    DashDom.initReclaim();
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



  // Switch views
  $('body').on('click', 'button.js-flow-generate', DashDom.views.generate);
  $('body').on('click', 'button.js-flow-reclaim', DashDom.views.reclaim);

  // Wallet Generation Related
  $('body').on('keyup', '.js-paper-wallet-keys', DashDom.updateWalletCsv);
  $('body').on('click', '.js-paper-wallet-generate', DashDom.generateWallets);
  $('body').on('keyup', '.js-paper-wallet-quantity', DashDom.updateWalletQuantity);

  // Save related
  $('body').on('click', '.js-csv-hide', view.csv.hide);
  $('body').on('click', '.js-csv-show', DashDom.showCsv);
  $('body').on('click', '.js-csv-download', DashDom.downloadCsv);
  $('body').on('click', '.js-csv-import', DashDom.importCsv);
  $('body').on('change', '.js-csv-import-file', DashDom.importFileCsv);
  $('body').on('click', '.js-csv-upload', DashDom.uploadCsv);
  $('body').on('change', '.js-csv-upload-file', DashDom.parseFileCsv);
  $('body').on('click', '.js-csv-example', DashDom.showExampleCsv);
  $('body').on('click', '.js-paper-wallet-print', DashDom.print);

  // Transaction Related
  $('body').on('change', '.js-insight-base', DashDom.updateInsightBase);
  $('body').on('keyup', '.js-funding-key', DashDom.updateFundingKey);
  $('body').on('click', '.js-funding-key-check', function () {
    $('.js-funding-amount').val('---');
    $('.js-funding-amount').text('---');
    $('.js-funding-key').trigger('keyup');
  });
  $('body').on('click', '.js-transaction-commit', DashDom.commitDisburse);
  $('body').on('keyup', '.js-paper-wallet-amount', DashDom.updateWalletAmountDash);
  $('body').on('keyup', '.js-paper-wallet-amount-usd', DashDom.updateWalletAmountUsd);
  $('body').on('keyup', '.js-transaction-fee', DashDom.updateFeeScheduleDash);
  $('body').on('keyup', '.js-transaction-fee-usd', DashDom.updateFeeScheduleUsd);

  // Reclaim Related
  $('body').on('click', '.js-reclaim-commit', DashDom.commitReclaim);


  //
  // Initial Values
  //
  $('.js-insight-base').val(config.insightBaseUrl);
  $('.js-insight-base').text(config.insightBaseUrl);
  $('.js-paper-wallet-cache').prop('checked', 'checked');
  $('.js-paper-wallet-cache').removeProp('checked');
  $('.js-paper-wallet-quantity').val(config.walletQuantity);
  $('.js-paper-wallet-quantity').text(config.walletQuantity);

  function delimitNumbers(str) {
    return (str + "").replace(/\b(\d+)((\.\d+)*)\b/g, function(a, b, c) {
      return (b.charAt(0) > 0 && !(c || ".").lastIndexOf(".") ? b.replace(/(\d)(?=(\d{3})+$)/g, "$1,") : b) + c;
    });
  }

  function init() {
    return window.fetch(config.insightBaseUrl + "/currency", { mode: 'cors' }).then(function (resp) {
      return resp.json().then(function (resp) {
        config.conversions = resp.data;
        $('.js-currency-dash-usd').text('$' + delimitNumbers(parseFloat(resp.data.dash_usd, 10).toFixed(2)));
        $('.js-currency-btc-usd').text('$' + delimitNumbers(parseFloat(resp.data.btc_usd, 10).toFixed(2)));
        $('.js-currency-btc-dash').text(delimitNumbers(parseFloat(resp.data.btc_dash, 10).toFixed(8)));
        console.log('resp.data.dash_usd', resp.data.dash_usd);
        console.log('resp.data.btc_dash', resp.data.btc_dash);
        console.log('resp.data.btc_usd', resp.data.btc_usd);

        $('input.js-paper-wallet-amount').val(DashDrop.toDash(config.walletAmount));
        $('span.js-paper-wallet-amount').text(DashDrop.toDash(config.walletAmount));
        $('input.js-paper-wallet-amount-usd').val(DashDrop.toUsd(config.walletAmount));
        $('span.js-paper-wallet-amount-usd').text(DashDrop.toUsd(config.walletAmount));
        $('input.js-transaction-fee').val(DashDrop.toDash(config.transactionFee));
        $('span.js-transaction-fee').text(DashDrop.toDash(config.transactionFee));
        $('input.js-transaction-fee-usd').val(DashDrop.toUsd(config.transactionFee));
        $('span.js-transaction-fee-usd').text(DashDrop.toUsd(config.transactionFee));
        $('[name=js-fee-schedule]').val(DashDrop.toDash(config.transactionFee));
        $('[name=js-fee-schedule-usd]').val(DashDrop.toUsd(config.transactionFee));

        DashDom.updateTransactionTotal();

        return resp.data.dash_usd;
      });
    });
  }

  init();


  DEBUG_DASH_AIRDROP.config = config;
  DEBUG_DASH_AIRDROP.data = data;
  window.DashDrop = DashDrop;
});
