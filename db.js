const Database = require('sqlite-async');
const fs = require('fs');
const config = require('config.json')('./config.json');

const SQLITE_OPEN_READONLY =        0x00000001;  /* Ok for sqlite3_open_v2() */
const SQLITE_OPEN_READWRITE =       0x00000002;  /* Ok for sqlite3_open_v2() */
const SQLITE_OPEN_CREATE =          0x00000004;  /* Ok for sqlite3_open_v2() */
const SQLITE_OPEN_DELETEONCLOSE =   0x00000008;  /* VFS only */
const SQLITE_OPEN_EXCLUSIVE =       0x00000010;  /* VFS only */
const SQLITE_OPEN_AUTOPROXY =       0x00000020;  /* VFS only */
const SQLITE_OPEN_URI =             0x00000040;  /* Ok for sqlite3_open_v2() */
const SQLITE_OPEN_MEMORY =          0x00000080;  /* Ok for sqlite3_open_v2() */
const SQLITE_OPEN_MAIN_DB =         0x00000100;  /* VFS only */
const SQLITE_OPEN_TEMP_DB =         0x00000200;  /* VFS only */
const SQLITE_OPEN_TRANSIENT_DB =    0x00000400;  /* VFS only */
const SQLITE_OPEN_MAIN_JOURNAL =    0x00000800;  /* VFS only */
const SQLITE_OPEN_TEMP_JOURNAL =    0x00001000;  /* VFS only */
const SQLITE_OPEN_SUBJOURNAL =      0x00002000;  /* VFS only */
const SQLITE_OPEN_MASTER_JOURNAL =  0x00004000;  /* VFS only */
const SQLITE_OPEN_NOMUTEX =         0x00008000;  /* Ok for sqlite3_open_v2() */
const SQLITE_OPEN_FULLMUTEX =       0x00010000;  /* Ok for sqlite3_open_v2() */
const SQLITE_OPEN_SHAREDCACHE =     0x00020000;  /* Ok for sqlite3_open_v2() */
const SQLITE_OPEN_PRIVATECACHE =    0x00040000;  /* Ok for sqlite3_open_v2() */
const SQLITE_OPEN_WAL =             0x00080000;  /* VFS only */

let _db = null;

const init = async () => {
  try {
    if (fs.existsSync(config.DB_FILE_NAME)) {
      //file exists
      _db = await Database.open(config.DB_FILE_NAME, SQLITE_OPEN_READWRITE);
    } else {
      _db = await Database.open(config.DB_FILE_NAME, SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE);

      await _db.exec(`CREATE TABLE cronjob (datakey TEXT PRIMARY KEY, datavalue TEXT NOT NULL)`);
      await _db.run(`INSERT INTO cronjob VALUES ("${config.KEY_STOP}", "1")`);
      await _db.exec(`CREATE TABLE sponsor (accountname TEXT PRIMARY KEY, amount REAL NOT NULL, txdatetime INTEGER NOT NULL)`);
    }
  } catch (e) {
    console.log(e);

    await close();


    try {
      fs.unlinkSync(config.DB_FILE_NAME)
    } catch(err) {
      console.error(err)
    }

    process.exit(1);
  }

  return _db;
};

const close = async () => {
  try {
    _db.close();
  } catch (e) {
  }
};

module.exports = {
  init,
  getDB: () => {
    return _db;
  },
  close
};
