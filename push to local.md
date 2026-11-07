# Pushing Updates to Your VPS Without Losing Adopted Routers, Leads, or Gateways (`push to local.md`)

## 1. If Your VPS Is Currently Stuck on the `git stash pop` Conflict Right Now

When you ran `sudo git stash`, your live VPS `data/server-portal-store.json` (containing your adopted routers, captured guest leads, and transactions) was safely saved inside `stash@{0}`.

Run this **one-time recovery command** on your VPS (`wydmav@vmi3475343:/opt/t-connect-hotspot/hotspot-rollout2`) to restore your live VPS data from `stash@{0}`, clear the Git conflict, and rebuild Docker:

```bash
sudo git checkout stash@{0} -- data/server-portal-store.json && sudo git reset HEAD && sudo git stash drop && sudo docker compose up -d --build
```

---

## 2. Your Permanent Copy-Paste Command for Every Future Code Change

Whenever you make changes in AI Studio, push to GitHub, and want to update your VPS **without ever getting a merge conflict on `data/server-portal-store.json` and without losing any adopted routers, leads, uploaded ad images, or payment gateways**, copy and paste this single command:

```bash
sudo cp -a data /tmp/tconnect-data-safe && sudo git fetch origin main && sudo git reset --hard origin/main && sudo cp -a /tmp/tconnect-data-safe/. data/ && sudo docker compose up -d --build
```

### What This Command Does Step-by-Step:
1. **`sudo cp -a data /tmp/tconnect-data-safe`** — Backs up your entire live `/opt/t-connect-hotspot/hotspot-rollout2/data/` directory (all adopted routers, guest leads, transactions, portal builder configs, and uploaded photos/videos) to `/tmp/tconnect-data-safe`.
2. **`sudo git fetch origin main && sudo git reset --hard origin/main`** — Pulls 100% of the latest code from GitHub cleanly with **zero merge conflicts**.
3. **`sudo cp -a /tmp/tconnect-data-safe/. data/`** — Immediately restores your live VPS `data/` files right back into `data/` so no routers, leads, or ads are ever lost.
4. **`sudo docker compose up -d --build`** — Rebuilds and restarts the container. On startup, `server.ts` preserves all your routers and leads while automatically enforcing your live **PayLesotho** (`T-Connect`, M-Pesa `62915`, EcoCash `63165430`, Bearer token loaded from `.env` `PAYLESOTHO_BEARER_TOKEN`) and **16-Digit OTT Voucher** gateways.
