/* =====================================================================
   THOMDUCK shared data layer  (used by dashboard.html, product.html, admin.html)

   All three pages read and write ONE shared data object:
     {
       customers:   [ {email,name,sex,code,referredBy,createdAt,...} ],
       payments:    [ {id,userEmail,productName,amount,profit,receipt,status,...} ],
       withdrawals: [ {id,userEmail,amount,bank,status,...} ],
       referrals:   [ {id,referrerEmail,newEmail,amount,credited,...} ],
       giftCodes:   [ {code,amount,maxUsers,disabled,claims:[{email,name,amount,ts}],createdAt} ],
       deleted:     [ {email,ts} ],   (accounts removed by admin)
       settings:    { bankName, accountName, bankAccount, whatsapp, telegram,
                      announcement:{id,title,message,ts}, products:{id:{price,profit}} }
     }

   WHERE THE DATA LIVES  (pick ONE provider below)
   ---------------------------------------------------------------------
   'local'    - this browser only. Good for testing on one computer.
                Customer phones and the admin will NOT see each other.
   'firebase' - RECOMMENDED. Free Firebase Realtime Database. Every phone
                and the admin share the same live data.
                1. console.firebase.google.com > create project
                2. Build > Realtime Database > Create database
                3. Copy the database URL into firebaseUrl below
                   e.g. https://thomduck-12345-default-rtdb.firebaseio.com
   'jsonbin'  - jsonbin.io works too, but its free bins are tiny (receipt
                images will not fit). Use firebase for real use.
   ===================================================================== */
window.THOMDUCK_CONFIG = Object.assign({
  provider: 'jsonbin',        // 'jsonbin' (GitHub Pages + JSONBin) | 'firebase' | 'local' (testing only)

  /* ---- JSONBin (fill these two in, nothing else is needed) ---- */
  binId: '6adb8e25ac6210605a4c86fb',                  // the Bin ID of your main bin (see README step 2)
  binKey: '$2a$10$KSO6MtjvO3Dy7jnRSIoymeZOoA8xg0MuYrvVpKRnDczwIb3YnKlWq',                 // your JSONBin ACCESS KEY (not the master key, see README)
  keyType: 'access',          // 'access' (recommended) or 'master'

  /* ---- how often pages check for news, in seconds. JSONBin's free plan only allows
         a small number of requests, so keep these long. People also get fresh data
         every time they open a page, tap a button, or come back to the tab. ---- */
  siteUrl: 'https://thomduck.github.io/agro-company.global/',   // base of every customer's referral link
  pollAdmin: 300,             // admin page checks for news every 5 minutes (tap the green pill for an instant refresh)
  pollCustomer: 120,
  idleAdminSeconds: 48,       // admin is signed out after this many seconds without touching the page
  heartbeatSeconds: 0,        // 0 = off (saves requests). Used for the admin "online" list.
  maxBytes: 95000,            // JSONBin free bins are limited to 100 KB

  firebaseUrl: '',            // firebase only
  firebasePath: 'thomduck'
}, window.THOMDUCK_CONFIG || {});

(function () {
  var C = window.THOMDUCK_CONFIG;
  var LIST_KEYS = ['customers', 'payments', 'withdrawals', 'referrals', 'giftCodes', 'deleted'];

  function toArr(x) { return Array.isArray(x) ? x : (x && typeof x === 'object' ? Object.keys(x).map(function (k) { return x[k]; }) : []); }

  /* make sure lists are always arrays (Firebase drops empty arrays) */
  function normalise(d) {
    d = (d && typeof d === 'object') ? d : {};
    LIST_KEYS.forEach(function (k) { d[k] = toArr(d[k]); });
    d.settings = (d.settings && typeof d.settings === 'object') ? d.settings : {};
    return d;
  }

  var JB = 'https://api.jsonbin.io/v3';
  function jbHeaders(extra) {
    var h = {}; h[C.keyType === 'master' ? 'X-Master-Key' : 'X-Access-Key'] = C.binKey;
    for (var k in (extra || {})) h[k] = extra[k];
    return h;
  }
  var cache = null;   /* short-lived read cache (JSONBin only) so several pages/tabs do not each spend a request */

  function fbUrl() { return C.firebaseUrl.replace(/\/+$/, '') + '/' + C.firebasePath + '.json'; }

  /* read; for Firebase also returns an ETag so a write can be refused if someone else wrote in between */
  async function rawFetchTag() {
    if (C.provider === 'firebase') {
      if (!C.firebaseUrl) throw new Error('firebaseUrl is not set in app.js');
      var r;
      try { r = await fetch(fbUrl(), { cache: 'no-store', headers: { 'X-Firebase-ETag': 'true' } }); }
      catch (e) { r = await fetch(fbUrl(), { cache: 'no-store' }); }
      if (!r.ok) throw new Error('Firebase ' + r.status);
      return { data: await r.json(), etag: r.headers.get('ETag') };
    }
    if (C.provider === 'jsonbin') {
      if (!C.binId || !C.binKey) throw new Error('binId / binKey are not set in app.js');
      var r2 = await fetch(JB + '/b/' + C.binId + '/latest', { headers: jbHeaders(), cache: 'no-store' });
      if (!r2.ok) throw new Error('JSONBin ' + r2.status);
      return { data: (await r2.json()).record, etag: null };
    }
    try { return { data: JSON.parse(localStorage.getItem('thomduck_data') || '{}'), etag: null }; } catch (e) { return { data: {}, etag: null }; }
  }
  async function rawFetch() { return (await rawFetchTag()).data; }

  async function rawSave(d, etag) {
    if (C.provider === 'firebase') {
      var h = { 'Content-Type': 'application/json' };
      if (etag) h['if-match'] = etag;
      var r;
      try { r = await fetch(fbUrl(), { method: 'PUT', headers: h, body: JSON.stringify(d) }); }
      catch (e) { if (!etag) throw e; r = await fetch(fbUrl(), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }); }
      if (r.status === 412) { var ce = new Error('conflict'); ce.conflict = true; throw ce; }
      if (!r.ok) throw new Error('Firebase ' + r.status);
      return true;
    }
    if (C.provider === 'jsonbin') {
      var body = JSON.stringify(d);
      if (body.length > (C.maxBytes || 95000)) { var fe = new Error('Database is full (JSONBin free limit is 100 KB)'); fe.full = true; throw fe; }
      var r2 = await fetch(JB + '/b/' + C.binId, { method: 'PUT', headers: jbHeaders({ 'Content-Type': 'application/json', 'X-Bin-Versioning': 'false' }), body: body });
      if (!r2.ok) throw new Error('JSONBin ' + r2.status);
      cache = null;
      return true;
    }
    localStorage.setItem('thomduck_data', JSON.stringify(d));
    return true;
  }

  /* read everything. Throws if the server cannot be reached. */
  window._fetchBin = async function () {
    if (C.provider === 'jsonbin' && cache && Date.now() - cache.t < 15000) return normalise(JSON.parse(cache.s));
    var d = await rawFetch();
    if (C.provider === 'jsonbin') cache = { t: Date.now(), s: JSON.stringify(d || {}) };
    return normalise(d);
  };

  /* Receipt photos: JSONBin bins are limited to 100 KB, so each receipt gets its own small bin
     and the main data only keeps its id. On other providers the photo stays inside the data. */
  window._storeReceipt = async function (dataUrl) {
    if (C.provider !== 'jsonbin') return { receipt: dataUrl };
    var r = await fetch(JB + '/b', { method: 'POST', headers: jbHeaders({ 'Content-Type': 'application/json', 'X-Bin-Private': 'true', 'X-Bin-Name': 'receipt' }), body: JSON.stringify({ img: dataUrl }) });
    if (!r.ok) throw new Error('JSONBin receipt ' + r.status);
    var j = await r.json();
    return { receiptBin: j.metadata.id };
  };
  window._getReceipt = async function (binId) {
    var r = await fetch(JB + '/b/' + binId + '/latest', { headers: jbHeaders(), cache: 'no-store' });
    if (!r.ok) throw new Error('JSONBin receipt ' + r.status);
    return (await r.json()).record.img || '';
  };

  /* write everything. Throws if it fails. */
  window._saveBin = async function (d) { return rawSave(d); };

  /* safest way to change data: read the latest, change it, write it back.
     fn(data) must change `data` and may return it. */
  window._updateBin = async function (fn) {
    for (var i = 0; i < 8; i++) {
      var snap = await rawFetchTag();
      var d = normalise(snap.data);
      var out = fn(d);
      if (out && typeof out === 'object') d = out;
      try { await rawSave(d, snap.etag); return d; }
      catch (e) { if (e && e.conflict) continue; throw e; }   /* someone else wrote first: re-read and redo */
    }
    throw new Error('Server busy, please try again');
  };

  window.THOMDUCK_toArr = toArr;
})();
