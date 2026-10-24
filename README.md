# Thomduck: GitHub Pages + JSONBin

GitHub hosts the website. JSONBin stores the data. Nothing else.

## Already done for you
`app.js` already contains your JSONBin Bin ID and Access Key. Do not edit it unless you change bins.
(The Master Key is NOT in any file. Keep it that way.)

## Change the admin password (do this before uploading)
Open `admin.html`, find `let adminPassword = "..."` (near the top of the script) and set your own.
The repository is public, so use a long password you do not use anywhere else.

The admin is signed out automatically after 48 seconds without touching the page (`idleAdminSeconds` in app.js).

## 4. Upload to GitHub
1. github.com > New repository (Public) > upload all these files to the ROOT of the repo (keep `.nojekyll`).
2. Settings > Pages > Source: "Deploy from a branch" > Branch `main`, folder `/ (root)` > Save.
3. After about a minute your site is at `https://YOUR-NAME.github.io/REPO/`
   Customers use that link. Admin: `.../admin.html`

## 5. Test before announcing
1. Open admin.html and sign in (username `Thomduck147`). A red bar or "Offline" pill means the key/bin is wrong.
2. Sign up a customer on the main link, then tap the status pill at the top of admin to refresh.
3. Buy a product with a test receipt. In admin, "Load receipt" must show the photo. Approve it.
4. Generate a gift code and claim it from the customer side.
   If the receipt step fails with 401/403, the Access Key lacks permission on the bins it creates:
   tick Create/Read/Update, or set keyType to 'master' at your own risk.

## Limits of the free JSONBin plan (important)
- The request quota is small (about 10,000; check your JSONBin dashboard). The admin page checks every 5 minutes and customers every 2 minutes
  (`pollAdmin`, `pollCustomer` in app.js), plus whenever someone opens a page or taps refresh.
  Lower numbers = faster updates but you run out of requests sooner.
- The main data bin is limited to 100 KB: roughly 150 to 250 customers with their payments.
  The admin shows a warning bar at 70% full.
- Each receipt photo is stored in its own bin (shrunk to about 60 KB) and loaded only when you tap "Load receipt".
- Two people saving in the same split second can overwrite each other (JSONBin has no safe-write option). Rare at small scale.
- Customer accounts and balances live in each customer's browser. Logging in from another phone will not find the account.
- The key and admin password are visible to anyone who views the site's source. Do not hold large sums on this setup.
