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

  // if (opt.to !== config.tracking_account) {
  //   await updateStopThenSaveLastState(idx, con);
  //   return;
  // }
  //
  // if (opt.amount.endsWith('STEEM') === false) {
  //   await updateStopThenSaveLastState(idx, con);
  //   return;
  // }
  //
  // // process_memo
  // const { memo } = opt;
  // if (memo.startsWith('getcoin') === false) {
  //   await updateStopThenSaveLastState(idx, con);
  //   return;
  // }
  //
  // const isexist = await trackingShared.isTxinDB(`steem:${trx.trx_id}`, con);
  // if (isexist === true) {
  //   await updateStopThenSaveLastState(idx, con);
  //   return;
  // }
  //
  // const parsed = queryString.parseUrl(memo).query;
  //
  // // validate account name
  // const isValidUsername = steem.utils.validateAccountName(parsed.a);
  // if (isValidUsername) {
  //   // throw new Error(isValidUsername);
  //   await updateStopThenSaveLastState(idx, con);
  //   return;
  // }
  //
  // const sendAmount = parseFloat(opt.amount);
  // console.log(`sendAmount=${sendAmount}`);
  //
  // const receiveAmount = sendAmount / price;
  // if (receiveAmount < 0.001) {
  //   await updateStopThenSaveLastState(idx, con);
  //   return;
  // }
  //
  // // save tx to send coin later in other process
  // await trackingShared.saveTx(
  //   {
  //     id: `steem:${trx.trx_id}`,
  //     network: 'steem',
  //     sender: opt.from,
  //     receiver: parsed.a,
  //     sendAmount,
  //     sendAsset: 'STEEM',
  //     receiveAmount,
  //     receiveAsset: 'WLS',
  //     state: 0,
  //     note: '',
  //     txSendback: null,
  //   },
  //   con,
  // );
  //
  await updateStopThenSaveLastState();
};


const loadLastState = async () => {
  // let storeStop = stop;

  // step 1. Loading last state from db
  const row = await db.getDB().get(`SELECT * FROM cronjob WHERE datakey="${config.KEY_STOP}"`);

  if (row) {
    stop = parseInt(row.datavalue);
  }

  console.log(`stop=${stop}`);
};

const main = async () => {
  console.log('tracking...');

  // let con;

  try {
    // con = await db.getConnection();
    // price = await trackingShared.getPrices('WLS_STEEM', con);

    await loadLastState();

    const dgp = await smokejs.api.getDynamicGlobalPropertiesAsync();
    // console.log(JSON.stringify(dgp));
    lastIrreversibleBlockNum = dgp.last_irreversible_block_num;

    const txs = await smokejs.api.getAccountHistoryAsync(config.tracking_account, stop, 1);
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
    try {
      await con.release();
    } catch (e) {
      // do nothing
    }
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
      await utils.sleep(2 * 60 * 1000);
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