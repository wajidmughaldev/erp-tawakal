# Hostinger par deploy karne ki guide (ems.tawakalent.com)

Yeh guide simple Roman Urdu mein hai. **Bold** mein jo likha hai wo aap ko khud karna hai.

> GitHub se `git pull` karke deploy karna chahte hon to [GIT-DEPLOY.md](GIT-DEPLOY.md) dekhein. Yeh guide zip upload wale tareeqe ki hai.

## Kaise kaam karta hai

Ek hi website (`https://ems.tawakalent.com`) par dono cheezein chalti hain:

- **Website ke pages** (login, dashboard wagera) sirf static files hain, jo `public_html/ems` mein rehti hain. Isko Node.js ki zaroorat nahi.
- **API aur database ka kaam** Laravel (PHP) karta hai. Laravel ka code `public_html` ke **bahar**, `ems-laravel` naam ke folder mein rehta hai, taake koi usay seedha na khol sake. `public_html/ems/api.php` sirf ek darwaza hai jo `/api` ki requests Laravel tak pohanchata hai.

```
(File Manager ka root)
├── public_html/
│   └── ems/            <- ems-web.zip yahan extract hoti hai
│       ├── .htaccess
│       ├── api.php
│       ├── login.html ...
│       └── _next/ ...
└── ems-laravel/        <- ems-laravel.zip yahan extract hoti hai
    ├── .env            <- aap banayenge (secrets yahan hain)
    ├── app/ vendor/ storage/ ...
```

## 1. Release files banana (apne computer par)

**1. Project folder mein terminal kholein aur chalayein:**

```
node deploy/build-release.mjs https://ems.tawakalent.com
```

Yeh `release/` folder mein 2 zip files banata hai:

- `release/ems-web.zip` (website, ~1 MB)
- `release/ems-laravel.zip` (API, ~8 MB, sirf production packages)

**2. Secret keys banayein aur kisi mehfooz jagah copy karke rakhein:**

```
node deploy/make-keys.mjs
```

> **Zaroori:** `APP_KEY` aur `EMPLOYEE_LOOKUP_KEY` kho jayein to employees ka mehfooz data parha nahi ja sakta. Inhein password manager mein alag se rakhein. Production mein inhein kabhi badalna nahi.

## 2. Hostinger (hPanel) mein pehle ki tayyari

**1. PHP version:** hPanel → Websites → `ems.tawakalent.com` → Advanced → **PHP Configuration** → PHP **8.3** (ya 8.4) chunein. Extensions mein `mbstring`, `openssl`, `pdo_mysql`, `fileinfo`, `curl`, `xml`, `tokenizer`, `ctype` on hon (aam tor par pehle se on hote hain).

**2. Database banayein:** Databases → **MySQL Databases** → naya database aur user banayein. Database ka naam, user ka naam aur password (aam tor par `u123456789_ems` jaisa) note kar lein.

**3. Email mailbox banayein** (password reset email ke liye): Emails → **Create email account** → `noreply@tawakalent.com`. Password note kar lein.

**4. SSL:** Security → **SSL** mein `ems.tawakalent.com` par SSL active hona chahiye (free SSL install ho jata hai). Bina HTTPS ke login nahi chalega.

## 3. Files upload karna

**1. Website upload karein:**

1. hPanel → Files → **File Manager** → `public_html/ems` kholein.
2. Wahan jo purani default files hon (jaise `default.php`, `index.php`) unhein delete karein.
3. **Upload** se `ems-web.zip` upload karein, phir us par right-click → **Extract** → "Extract here". Zip delete kar dein.
4. Check karein ke `public_html/ems/.htaccess` aur `api.php` maujood hain (File Manager mein "Show hidden files" on karna parta hai).

**2. Laravel upload karein:**

1. File Manager ke **root** par jayein (jahan `public_html` folder hai). Wahan naya folder **`ems-laravel`** banayein. Yeh `public_html` ke **andar nahi**, uske barabar hona chahiye.
2. `ems-laravel` mein `ems-laravel.zip` upload karke Extract karein. Zip delete kar dein.

**3. `.env` file banayein:**

1. `ems-laravel/env.production.example` ki copy banayein aur uska naam bilkul **`.env`** rakhein.
2. `.env` ko edit karein aur har `CHANGE` wali value bharein:
   - `APP_KEY` aur `EMPLOYEE_LOOKUP_KEY`: wo lines jo `make-keys.mjs` ne di thin.
   - `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`: step 2.2 wali values.
   - `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM_ADDRESS`: step 2.3 wala mailbox (`noreply@tawakalent.com`).
   - `SUPERADMIN_EMAIL` aur `SUPERADMIN_PASSWORD`: apna email aur **naya mazboot password** (kam se kam 8 characters, bade-chhote huroof aur number). Development wala password production mein dobara na rakhein.
3. Folders ki permission: `ems-laravel/storage` aur `ems-laravel/bootstrap/cache` (andar ke folders samet) writable hon (aam tor par 755 kaafi hai, na chale to 775).

## 4. Database tayyar karna aur pehla superadmin banana

Aap ke paas SSH ho to **A**, warna **B** istemal karein.

**A. SSH se (hPanel → Advanced → SSH Access):**

```
cd ~/domains/tawakalent.com/ems-laravel
php artisan migrate --force
php artisan db:seed --force
```

(Agar folder ka raasta alag ho to hPanel ka "SSH Access" page sahi raasta dikhata hai.)

**B. Bina SSH ke, Cron Job se:**

1. hPanel → Advanced → **Cron Jobs** → naya job. Command mein (apna `/home/u123456789` wala raasta lagayein):

   ```
   /usr/bin/php /home/u123456789/domains/tawakalent.com/ems-laravel/artisan migrate --force --seed
   ```

2. Time ko "har minute" par rakhein. 2 minute baad **job delete kar dein** (warna wo har minute chalta rahega).

**Phir:** `ems-laravel/.env` se `SUPERADMIN_NAME`, `SUPERADMIN_EMAIL`, `SUPERADMIN_PASSWORD` wali 3 lines **hata dein**.

## 5. Check karna

**1.** `https://ems.tawakalent.com/up` kholein: "200" ya khali safed page aana chahiye (matlab Laravel chal raha hai).

**2.** `https://ems.tawakalent.com` kholein: login page aana chahiye. Apne superadmin se login karein.

**3.** Foran **Change password** (sidebar mein neeche) se apna password badal lein.

**4.** Ek test manager banayein aur "Forgot password" try karein, taake pata chale email theek jati hai. Email na aaye to `.env` ki mail settings aur `ems-laravel/storage/logs/` mein dekhein.

**5.** Ek test employee banayein, photo aur document upload karein, ID card issue karein, QR scan karke `/verify` page check karein.

## 6. Roz ke kaam

**1. Scheduler (optional, purani notifications saaf karne ke liye):** Cron Jobs mein har minute ka job:

```
/usr/bin/php /home/u123456789/domains/tawakalent.com/ems-laravel/artisan schedule:run
```

(Is ke baghair bhi notifications list khulte waqt 30 din se purani hat jati hain.)

**2. Backup:**
- hPanel → Backups ke saath, **database ka export** (phpMyAdmin → Export) aur **`ems-laravel/storage/app/private`** folder (employees ki photos aur documents yahan hain) regular download karke rakhein.
- `.env` file ki alag copy mehfooz rakhein (khaas tor par `APP_KEY` aur `EMPLOYEE_LOOKUP_KEY`).

## 7. Naya version upload karna (baad mein)

1. Apne computer par `node deploy/build-release.mjs https://ems.tawakalent.com` chalayein.
2. `ems-web.zip` ko `public_html/ems` mein dobara extract karein (purani files overwrite hongi).
3. `ems-laravel.zip` ko `ems-laravel` mein extract karein. Is zip mein `.env` aur stored files **nahi** hoti, isliye wo mehfooz rehti hain.
4. Naye database changes hon to Step 4 ka `php artisan migrate --force` dobara chalayein.
5. Agar kabhi `config:cache` chalaya ho to `php artisan config:clear` bhi chalayein.

## Masle aur hal

| Masla | Wajah / hal |
|---|---|
| Login par "419" ya session ka error | `.env` mein `APP_URL`, `SANCTUM_STATEFUL_DOMAINS`, `FRONTEND_URL` bilkul `https://ems.tawakalent.com` / `ems.tawakalent.com` hon, aur site HTTPS par khul rahi ho. |
| `/employees` jaise pages "404" dein | `public_html/ems/.htaccess` upload nahi hui ya hidden file hone ki wajah se nazar nahi aayi. |
| `/api/...` par 500 error | `ems-laravel/storage/logs/` ki latest file dekhein. Aam wajah: `.env` ki koi value, ya `storage` ki permission. |
| "No application encryption key" | `.env` mein `APP_KEY` nahi bhara. |
| Photos / documents nahi khulte | `storage/app/private` mein files hain? Folder writable hai? |
| Email nahi jati | `MAIL_*` values aur mailbox ka password check karein; port 465 ke saath `MAIL_SCHEME=smtps`. |

## Apne computer par production build try karna

Upload se pehle dekhna ho to (API par `php artisan serve --port=8200` chal raha ho aur uska `.env` `SANCTUM_STATEFUL_DOMAINS=localhost:4000`, `APP_URL=http://localhost:4000` rakhta ho):

```
NEXT_EXPORT=1 NEXT_OUTPUT_DIR=.next-export NEXT_PUBLIC_API_BASE_URL=http://localhost:4000 npx next build
node deploy/local-preview.mjs .next-export 4000 http://127.0.0.1:8200
SMOKE_EMAIL=... SMOKE_PASSWORD=... node deploy/smoke.mjs
```

`smoke.mjs` ek asli browser se poora safar (login, manager, employee, card, verify, registration link, approval, notifications) khud chala kar dekhta hai.
