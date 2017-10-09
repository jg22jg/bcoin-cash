/* eslint-env mocha */
/* eslint prefer-arrow-callback: "off" */

'use strict';

const assert = require('./util/assert');
const util = require('../lib/utils/util');
const encoding = require('../lib/utils/encoding');
const common = require('./util/common');
const Script = require('../lib/script/script');
const Opcode = require('../lib/script/opcode');
const common = require('../lib/script/common');
const TX = require('../lib/primitives/tx');

const sighashTests = require('./data/sighash-tests.json');

function parseSighashTest(data) {
  const [scriptHex, type, hash] = data;

  const script = Script.fromRaw(scriptHex, 'hex');

  let hex = type & 3;

  if (type & 0x40)
    hex |= 0x40;

  hex = hex.toString(8);

  if (hex.length % 2 !== 0)
    hex = '0' + hex;

  return {
    tx: tx,
    script: script,
    index: index,
    type: type,
    hash: hash,
    hex: hex
  };
}


