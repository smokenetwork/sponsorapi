const config = require('config.json')('./config.json');
// const fetch = require('node-fetch');
const smokejs = require('@smokenetwork/smoke-js');
// const queryString = require('query-string');
const db = require('./db');
const utils = require('./utils');
// const trackingShared = require('./tracking_shared');

smokejs.api.setOptions({url: 'https://pubrpc.smoke.io'});
smokejs.config.set('address_prefix', 'SMK');
smokejs.config.set('chain_id', '1ce08345e61cd3bf91673a47fc507e7ed01550dab841fd9cdb0ab66ef576aaf0');


let stop = 1;
let lastIrreversibleBlockNum = 0;

const updateStopThenSaveLastState = async () => {
  stop = stop + 1;

  // step X. Save last state to db
  await db.getDB().run(`UPDATE cronjob SET datavalue = "${stop}" WHERE datakey="${config.KEY_STOP}"`);
};

const processTx = async (tx) => {
  console.log(JSON.stringify(tx));

  const [idx, trx] = tx;
  const [optType, opt] = trx.op;
  if (trx.block > lastIrreversibleBlockNum) {
    return;
  }

  if (idx < stop) {
    return;
  }

  if (optType !== 'transfer') {
    await updateStopThenSaveLastState();
    return;
  }

  if (opt.to !== config.TRACKING_ACCOUNT) {
    await updateStopThenSaveLastState();
    return;
  }

  if (opt.amount.endsWith('SMOKE') === false) {
    await updateStopThenSaveLastState();
    return;
  }

  const amount = parseFloat(opt.amount);
  if (amount <config.MIN_AMOUNT) {
    await updateStopThenSaveLastState();
    return;
  }

  const accountname = opt.from;
  const txdatetime = Math.floor(new Date(`${trx.timestamp}Z`).getTime()/1000);
  console.log(`amount=${amount}, accountname=${accountname}, txdatetime=${txdatetime}`);
  try {
    await db.getDB().run(`INSERT INTO sponsor VALUES ("${accountname}", ${amount}, ${txdatetime})`);
  } catch (e) {
    console.log(e);
  }

  await updateStopThenSaveLastState();
};


const loadLastState = async () => {
  const row = await db.getDB().get(`SELECT * FROM cronjob WHERE datakey="${config.KEY_STOP}"`);

  if (row) {
    stop = parseInt(row.datavalue);
  }

  console.log(`stop=${stop}`);
};

const main = async () => {
  console.log('tracking...');

  try {
    await loadLastState();

    const dgp = await smokejs.api.getDynamicGlobalPropertiesAsync();
    // console.log(JSON.stringify(dgp));
    lastIrreversibleBlockNum = dgp.last_irreversible_block_num;

    const txs = await smokejs.api.getAccountHistoryAsync(config.TRACKING_ACCOUNT, stop, 1);
    // console.log(JSON.stringify(txs));

    let i = txs.length - 1;
    for (; i >= 0; i -= 1) {
      const tx = txs[i];
      // eslint-disable-next-line no-await-in-loop
      await processTx(tx);
    }
  } catch (err) {
    console.log(err.message);
  } finally {
    // try {
    //   await con.release();
    // } catch (e) {
    //   // do nothing
    // }
  }
};

const start = async () => {

  await db.init();

  while (true) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await main();
      console.log('stopped!');
    } catch (err) {
      console.log(err.message);
    }

    try {
      // eslint-disable-next-line no-await-in-loop
      await utils.sleep(1 * 10 * 1000);
    } catch (err) {
      // do nothing
    }
  }
};

const end = async () => {
  try {
    await db.getDB().close();
  } catch (err) {
    // do nothing
  }
};

// module.exports = {
//   start,
//   end,
// };

start();