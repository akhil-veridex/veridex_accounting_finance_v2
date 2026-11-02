require('dotenv').config();
const mongoose = require('mongoose');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  const collJ = mongoose.connection.collection('journals');
  const collJE = mongoose.connection.collection('journal_entries');
  const collAcc = mongoose.connection.collection('ledger_accounts');

  const strId = '6ae5850c0c359c85e5373bb2';
  const objId = new mongoose.Types.ObjectId(strId);

  const jStr = await collJ.find({ tenant_id: strId }).toArray();
  const jObj = await collJ.find({ tenant_id: objId }).toArray();

  console.log(`Journals for string ID: ${jStr.length}, for ObjectId: ${jObj.length}`);

  const jeStr = await collJE.find({ tenant_id: strId }).toArray();
  const jeObj = await collJE.find({ tenant_id: objId }).toArray();
  console.log(`JournalEntries for string ID: ${jeStr.length}, for ObjectId: ${jeObj.length}`);

  const accStr = await collAcc.find({ tenant_id: strId }).toArray();
  const accObj = await collAcc.find({ tenant_id: objId }).toArray();
  console.log(`LedgerAccounts for string ID: ${accStr.length}, for ObjectId: ${accObj.length}`);

  if (accStr.length > 0) {
    console.log('--- accStr balances ---');
    accStr.forEach(a => console.log(a.account_code, a.account_name, a.current_balance ? a.current_balance.toString() : 0));
  }
  if (accObj.length > 0) {
    console.log('--- accObj balances ---');
    accObj.forEach(a => console.log(a.account_code, a.account_name, a.current_balance ? a.current_balance.toString() : 0));
  }

  await mongoose.disconnect();
}
test().catch(console.error);
