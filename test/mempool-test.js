/* eslint-env mocha */
/* eslint prefer-arrow-callback: "off" */

'use strict';

const assert = require('./util/assert');
const Mempool = require('../lib/mempool/mempool');
const MempoolEntry = require('../lib/mempool/mempoolentry');
const WorkerPool = require('../lib/workers/workerpool');
const Chain = require('../lib/blockchain/chain');
const Memwallet = require('./utils/memwallet');
const MTX = require('../lib/primitives/mtx');
const Script = require('../lib/script/script');
const Coin = require('../lib/primitives/coin');
const ALL = Script.hashType.ALL;
const FORKID = Script.hashType.FORKID;

const wallet = new MemWallet();

const workers = new WorkerPool({
  enabled: true
});
const chain = new Chain({
  db: 'memory',
  workers
});
const mempool = new Mempool({
  chain,
  db: 'memory',
  workers
});

function dummyInput(script, hash) {
  const coin = new Coin();
  coin.height = 0;
  coin.value = 0;
  coin.script = script;
  coin.hash = hash;
  coin.index = 0;

  const fund = new MTX();
  fund.addCoin(coin);
  fund.addOutput(script, 100000);

};

describe('Mempool', function() {
  this.timeout(5000);

  it('should open mempool', async () => {
    await mempool.open();
    chain.state.flags |= Script.flags.VERIFY_FORKID;
  });
});
