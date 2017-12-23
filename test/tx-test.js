/* eslint-env mocha */
/* eslint prefer-arrow-callback: "off" */

'use strict';

const encoding = require('../lib/utils/encoding');
const assert = require('./util/assert');
const random = require('../lib/crypto/random');
const util = require('../lib/utils/util');
const consensus = require('../lib/protocol/consensus');
const TX = require('../lib/primitives/tx');
const Output = require('../lib/primitives/output');
const Outpoint = require('../lib/primitives/outpoint');
const Script = require('../lib/script/script');
const Opcode = require('../lib/script/opcode');
const Input = require('../lib/primitives/input');
const CoinView = require('../lib/coins/coinview');
const KeyRing = require('../lib/primitives/keyring');
const common = require('./util/common');

const validTests = require('./data/tx-valid.json');
const invalidTests = require('./data/tx-invalid.json');
const sighashTests = require('./data/sighash-tests.json');

const tx1 = common.readTX('tx1');
const tx2 = common.readTX('tx2');
const tx3 = common.readTX('tx3');
const tx4 = common.readTX('tx4');
const tx5 = common.readTX('tx5');
const tx6 = common.readTX('tx6');
const tx7 = common.readTX('tx7');

const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER;
const MAX_SAFE_ADDITION = 0xfffffffffffff;

function clearCache(tx, noCache) {
  if (noCache) {
    tx.refresh();
    return;
  }

  const copy = tx.clone();

  assert.bufferEqual(tx.hash(), copy.hash());
}

function parseTXTest(data) {
  const coins = data[0];
  const hex = data[1];
  const names = data[2] || 'NONE';

  let flags = 0;

  for (const name of names.split(',')) {
    const flag = Script.flags[`VERIFY_${name}`];

    if (flag == null)
      throw new Error(`Unknown flag: ${name}.`);

    flags |= flag;
  }

  const view = new CoinView();

  for (const [txid, index, str, amount] of coins) {
    const hash = util.revHex(txid);
    const script = Script.fromString(str);
    const value = parseInt(amount || '0', 10);

    // Ignore the coinbase tests.
    // They should all fail.
    if ((index >>> 0) === 0xffffffff)
      continue;

    const prevout = new Outpoint(hash, index);
    const output = new Output({script, value});

    view.addOutput(prevout, output);
  }

  const raw = Buffer.from(hex, 'hex');
  const tx = TX.fromRaw(raw);

  const coin = view.getOutputFor(tx.inputs[0]);

  return {
    tx: tx,
    flags: flags,
    view: view,
    comments: coin
      ? util.inspectify(coin.script)
      : 'coinbase',
    data: data
  };
}

function parseSighashTest(data) {
  const [txHex, scriptHex, index, type, hash] = data;

  const tx = TX.fromRaw(txHex, 'hex');
  const script = Script.fromRaw(scriptHex, 'hex');

  const expected = util.revHex(hash);

  let hex = type & 3;

  if (type & 0x40)
    hex |= 0x40;

  hex = hex.toString(16);

  if (hex.length % 2 !== 0)
    hex = '0' + hex;

  return {
    tx: tx,
    script: script,
    index: index,
    type: type,
    hash: hash,
    expected: expected,
    hex: hex
  };
}

function createInput(value, view) {
  const hash = random.randomBytes(32).toString('hex');

  const input = {
    prevout: {
      hash: hash,
      index: 0
    }
  };

  const output = new Output();
  output.value = value;

  if (!view)
    view = new CoinView();

  view.addOutput(new Outpoint(hash, 0), output);

  return [input, view];
};

function sigopContext(scriptSig, scriptPubkey) {
  const fund = new TX();

  {
    fund.version = 1;

    const input = new Input();
    fund.inputs.push(input);

    const output = new Output();
    output.value = 1;
    output.script = scriptPubkey;
    fund.outputs.push(output);

    fund.refresh();
  }

  const spend = new TX();

  {
    spend.version = 1;

    const input = new Input();
    input.prevout.hash = fund.hash('hex');
    input.prevout.index = 0;
    input.script = scriptSig;
    spend.inputs.push(input);

    const output = new Output();
    output.value = 1;
    spend.outputs.push(output);

    spend.refresh();
  }

  const view = new CoinView();

  view.addTX(fund, 0);

  return {
    fund: fund,
    spend: spend,
    view: view
  };
}

describe('TX', function() {
  for (const noCache of [false, true]) {
    const suffix = noCache ? 'without cache' : 'with cache';

    it(`should verify non-minimal output ${suffix}`, () => {
      const [tx, view] = tx1.getTX();
      clearCache(tx, noCache);
      assert(tx.verify(view, Script.flags.VERIFY_P2SH));
    });

    it(`should verify tx.version == 0 ${suffix}`, () => {
      const [tx, view] = tx2.getTX();
      clearCache(tx, noCache);
      assert(tx.verify(view, Script.flags.VERIFY_P2SH));
    });

    it(`should verify high S value with only DERSIG enabled ${suffix}`, () => {
      const [tx, view] = tx4.getTX();
      const coin = view.getOutputFor(tx.inputs[0]);
      const flags = Script.flags.VERIFY_P2SH | Script.flags.VERIFY_DERSIG;
      clearCache(tx, noCache);
      assert(tx.verifyInput(0, coin, flags));
    });

    it(`should verify the coolest tx ever sent ${suffix}`, () => {
      const [tx, view] = tx6.getTX();
      clearCache(tx, noCache);
      assert(tx.verify(view, Script.flags.VERIFY_NONE));
    });

    it(`should count sigops for p2sh multisig`, () => {
      const flags = Script.flags.VERIFY_P2SH;
      const key = KeyRing.generate();
      const pub = key.publicKey;

      const redeem = Script.fromMultisig(1, 2, [pub, pub]);
      const output = Script.fromScripthash(redeem.hash160());

      const input = new Script([
        Opcode.fromInt(0),
        Opcode.fromInt(0),
        Opcode.fromData(redeem.toRaw())
      ]);

      const ctx = sigopContext(input, output);

      assert.strictEqual(ctx.spend.getSigopsCount(ctx.view, flags), 2);
    });

    for (const json of sighashTests) {
      if (json.length === 1)
        continue;

      const test = parseSighashTest(json);
      const {tx, script, index, type} = test;
      const {hash, hex, expected} = test;

      clearCache(tx, noCache);

      it(`should get sighash of ${hash} (${hex}) ${suffix}`, () => {
        const subscript = script.getSubscript(0).removeSeparators();
        const hash = tx.signatureHash(index, subscript, 0, type, 0);
        assert.strictEqual(hash.toString('hex'), expected);
      });
    }
   }
});
