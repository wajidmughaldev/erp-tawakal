# GitHub se Hostinger par deploy (git pull wala tareeqa)

Yeh guide simple Roman Urdu mein hai. **Bold** mein jo likha hai wo aap ko khud karna hai. (Zip upload wala purana tareeqa `DEPLOY.md` mein hai; dono mein se ek hi istemal karein.)

## Poora flow ek nazar mein

```
Aap ka PC  --git push-->  GitHub (main branch)
                              |
                              |  GitHub Actions khud website build karta hai
                              v
                         web-build branch  (tayyar static website)

Hostinger (SSH):  update-server.sh
   |-- ems-repo/ (main branch)  -> Laravel code, composer install, migrate
   `-- web-build branch         -> public_html/ems mein copy
```

- **Laravel** ka code `main` branch se aata hai.
- **Website** ko build karne ke liye Node.js chahiye, jo shared hosting par nahi hota. Isliye GitHub Actions usay build karke `web-build` branch mein rakh deta hai, aur server sirf wahan se files copy karta hai.
- `.env`, `vendor/` aur `storage/` (photos, documents) git mein nahi hote, isliye `git pull` unhein kabhi nahi chhedta.

## Abhi ki halat (maine check ki)

- **Remote `origin`:** `https://github.com/wajidmughaldev/erp-tawakal.git`
- **Current branch:** `fix/checkpoint5-acceptance-hardening`
- `main` branch mein sirf pehla "Initial import" commit hai. Ab tak ka saara kaam (150 se zyada files) abhi **commit hi nahi hua**.
- Private files (`.env`, employees ki photos/documents) git mein jaane se ignore hoti hain, check kar liya.

## Hissa 1: apne PC se GitHub par bhejna

**1. Agar git "dubious ownership" ka error de to ek baar yeh chalayein:**

```
git config --global --add safe.directory "E:/Clients WOrk/TawakalENT/employee-management"
```

**2. Project folder mein dekhein kya commit hoga (koi `.env` ya password wali file nazar na aaye):**

```
git status
```

**3. Sab kuch commit karein:**

```
git add -A
git commit -m "Employee ID portal: production-ready build and deploy kit"
```

**4. Apni branch GitHub par bhejein:**

```
git push origin fix/checkpoint5-acceptance-hardening
```

**5. Is branch ko `main` mein merge karein** (server `main` se pull karega). GitHub par Pull Request bana kar merge kar sakte hain, ya terminal se:

```
git checkout main
git merge fix/checkpoint5-acceptance-hardening
git push origin main
```

**6. GitHub par repository → Actions tab kholein.** "Build website" ka run green hona chahiye. Is ke baad repository mein `web-build` naam ki nayi branch nazar aayegi.

- Agar run nahi chala: Actions → "Build website" → **Run workflow**.
- Repository ko **Private** rakhein (Settings → General → Danger Zone).
- Agar site ka address alag ho to Settings → Secrets and variables → Actions → Variables mein `SITE_URL` banayein (default `https://ems.tawakalent.com`).

## Hissa 2: server par pehli baar (SSH)

**1. SSH se connect karein.** hPanel → Advanced → **SSH Access** mein host, port (aam tor par `65002`) aur username milta hai:

```
ssh -p 65002 u123456789@SERVER_IP
```

**2. Check karein PHP aur Composer maujood hain:**

```
php -v
composer -V
```

`php -v` mein 8.3 ya us se naya hona chahiye. Agar purana dikhe to hPanel → PHP Configuration mein version 8.3 chunein aur dobara SSH karein; phir bhi purana ho to mujhe bata dein.

**3. GitHub ke liye deploy key banayein** (server sirf parh sakega, likh nahi sakega):

```
ssh-keygen -t ed25519 -f ~/.ssh/ems_deploy -N "" -C "hostinger-ems"
cat ~/.ssh/ems_deploy.pub
```

**4. Jo public key print hui usay copy karein:** GitHub repo → Settings → **Deploy keys** → Add deploy key → title "hostinger", key paste karein, "Allow write access" **tick na karein**.

**5. Server par ssh ka config likhein:**

```
cat >> ~/.ssh/config <<'EOF'
Host github-ems
  HostName github.com
  User git
  IdentityFile ~/.ssh/ems_deploy
  IdentitiesOnly yes
EOF
chmod 600 ~/.ssh/config
ssh -T git@github-ems
```

Aakhri command "Hi wajidmughaldev/erp-tawakal! You've successfully authenticated" jaisa kuch kahe to sab theek hai (yeh normal hai ke wo shell nahi deta).

**6. Repository clone karein** (domain ke folder mein, `public_html` ke bahar):

```
cd ~/domains/tawakalent.com
git clone git@github-ems:wajidmughaldev/erp-tawakal.git ems-repo
cd ems-repo
git checkout main
```

(`git clone` wahi kaam karta hai jo `git init` + `git remote add` + `git pull` karte hain, bas ek command mein.)

**7. Laravel ki pehli setting:**

```
cd ~/domains/tawakalent.com/ems-repo/laravel-backend
composer install --no-dev --optimize-autoloader
cp ../deploy/env.production.example .env
nano .env
```

`.env` mein har `CHANGE` wali value bharein. Secret keys apne PC par `node deploy/make-keys.mjs` se banayein (`APP_KEY`, `EMPLOYEE_LOOKUP_KEY`), aur inhein password manager mein mehfooz rakhein.

**8. Database aur pehla superadmin:**

```
php artisan migrate --force
php artisan db:seed --force
chmod -R 775 storage bootstrap/cache
nano .env
```

Aakhri `nano .env` mein se `SUPERADMIN_*` wali 3 lines **hata dein**.

**9. Website copy karein (yeh `update-server.sh` karta hai):**

```
bash ~/domains/tawakalent.com/ems-repo/deploy/update-server.sh
```

Yeh `web-build` branch utha kar `public_html/ems` mein rakhta hai. Wahan ki purani default files hat jati hain.

**10. Check karein:** `https://ems.tawakalent.com/up` khule, phir `https://ems.tawakalent.com` par login karein, aur foran apna password badal lein.

## Hissa 3: baad mein har update

**1. PC par:** kaam commit karke `main` par push karein (merge ya pull request).

**2. GitHub → Actions mein "Build website" green hone ka intezar karein** (1 se 2 minute).

**3. Server par:**

```
ssh -p 65002 u123456789@SERVER_IP
bash ~/domains/tawakalent.com/ems-repo/deploy/update-server.sh
```

Yeh khud: naya code laata hai, `composer install`, `migrate`, cache saaf karta hai, aur nayi website copy karta hai.

## Zaroori batein

- **`.env` kabhi git mein na dalein.** Wo sirf server par rehti hai (`ems-repo/laravel-backend/.env`).
- **Scheduler ka cron** (agar lagana ho) ab is raaste par hoga:
  `/usr/bin/php /home/u123456789/domains/tawakalent.com/ems-repo/laravel-backend/artisan schedule:run`
- **Backup:** `ems-repo/laravel-backend/storage/app/private` (photos, documents) aur database ka export regular download karein, aur `.env` ki alag copy rakhein.
- **Agar sirf Laravel git se chalana ho aur website zip se:** website ka `ems-web.zip` (`npm run release`) `public_html/ems` mein extract karein; `api.php` khud `ems-repo/laravel-backend` dhoond leta hai.
- **Hostinger ka web server** `.htaccess` ko kaise samajhta hai, yeh pehli baar live par hi pata chalega. Koi masla aaye to error mujhe bhej dein.

## Masle aur hal

| Masla | Hal |
|---|---|
| `Permission denied (publickey)` | Deploy key GitHub par add nahi hui, ya `~/.ssh/config` mein `Host github-ems` ghalat hai. Step 3 se 5 dobara dekhein. |
| `Remote branch web-build not found` | Actions ka run abhi chala hi nahi. Actions → Build website → Run workflow. |
| `composer: command not found` | Hostinger plan mein Composer na ho to PC par `npm run release` chala kar `ems-laravel.zip` istemal karein (`DEPLOY.md`). |
| PHP ka purana version | hPanel → PHP Configuration mein 8.3 chunein; phir bhi na ho to mujhe `php -v` ka output bhejein. |
| Update ke baad site khaali / 500 | `ems-repo/laravel-backend/storage/logs/` ki latest file dekhein. |
