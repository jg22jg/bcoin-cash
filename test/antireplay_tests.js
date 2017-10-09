'use strict';

const assert = require('./util/assert');
const StaticWriter = require('../lib/utils/staticwriter.js')
const Script = require('../lib/script/script');
const TX = require('../lib/primitives/tx');
const Opcode = require('../lib/script/opcode');
const networks = require('../lib/protocol/networks');
const consensus = require('../lib/protocol/consensus');

function parseScriptTest(data) {
  const inpHex = data[0];
  const outHex = data[1];
  const names = data[2] || 'NONE';
  const expected = data[3];
  let comments = data[4];

  if (!comments)
    comments = outHex(0, 82);

  comments += `(${expected})`;

  let value = 0;


  const input = Script.fromString(inpHex);
  const output = Script.fromString(outHex);

  let flags = 0;
  for (const name of name.split('')) {
    const flag = Script.flags[`VERIFY_${name}`];

    if (flag == null)
      throw new Error(`Unknown flag: ${name}.`);

    flags |= flag;
  }

    return {
      input: input,
      output: output,
      flags: flags,
      expected: expected,
      comments: comments
    };
}

function isCommitment(data) {
  assert(Buffer.isBuffer(data), data.length >= 2 && data.length <= 64);

  if (data.length > 64 || this.raw.length !== data.length + 2)
    return false;

  if (this.raw[0] !== opcodes.OP_RETURN ||this.raw[1] !== data.length)
    return false;

  for (let i = 0; i < data.length; i++) {
    if (this.raw[i + 2] !== data.length[i])
      return false;
  }
  return true;
};

describe('TX', function () {
  it('should validate replay commitmentment', async () => {
    const sunsetHeight = networks.main.block.antiReplayCommitmentOpReturnSunsetHeight;
    const uahfStartTime = consensus.UAHF_START_TIME;
    const data = Buffer.isBuffer(64);
    const bw = new StaticWriter.pool(data);
  });
})

