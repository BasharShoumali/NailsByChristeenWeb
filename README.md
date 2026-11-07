# Lacquer Salon Book (MongoDB version)

Christeen's salon app: calendar, clients, check-out and income stats.
React front end + a small Node/Express server that saves everything in MongoDB.
Christeen signs in with a password and stays signed in for 60 days on each device.

## 1. Create the database (free, about 5 minutes)
1. Sign up at https://www.mongodb.com/cloud/atlas and create a free **M0** cluster.
2. **Database Access** → add a database user with a username and password.
3. **Network Access** → add `0.0.0.0/0` (allow from anywhere, needed for hosting).
4. **Connect → Drivers** → copy the connection string. Put your user's password in it
   and add `lacquer` as the database name before the `?`, like:
   `mongodb+srv://christeen:PASSWORD@cluster0.abcde.mongodb.net/lacquer?retryWrites=true&w=majority`

## 2. Run it on your computer
1. Install Node.js (LTS) from https://nodejs.org
2. Copy `.env.example` to `.env` and fill in `MONGODB_URI` and `OWNER_PASSWORD`.
3. In this folder run:
   ```
   npm install
   npm run build
   npm start
   ```
4. Open http://localhost:3000 and sign in with the password.

## 3. Put it online on Vercel (free)
The database lives on MongoDB Atlas (step 1). Vercel hosts the app and its API, so nothing else is needed.
1. Upload this folder to a GitHub repository (`.env` is ignored on purpose, so the passwords stay private).
2. On https://vercel.com → **Add New → Project** → import the repo. Leave the framework as **Other**;
   `vercel.json` already sets the build (`npm run build`) and output folder (`dist`).
3. Under **Environment Variables** add:
   - `MONGODB_URI`: your Atlas connection string
   - `OWNER_PASSWORD`: Christeen's password
   - `OWNER_NAME`: `Christeen`
4. Click **Deploy**. Open the link on her phone and iPad, sign in, then "Add to Home Screen".
5. Optional: Project → Settings → Functions → set the region to **Frankfurt (fra1)**, next to your Atlas cluster.

After changing an environment variable on Vercel, use **Deployments → Redeploy** for it to take effect.
Every push to GitHub deploys the newest version automatically.

(Prefer Render? Build command `npm install && npm run build`, start command `npm start`, same variables.)

## What's in MongoDB
| Collection     | What it holds                                                       |
|----------------|---------------------------------------------------------------------|
| `clients`      | name, phone, birthday, notes                                        |
| `appointments` | client, services, date, start, length, price, tip, status, payment  |
| `services`     | name, length, price, calendar colour                                |
| `settings`     | salon name, owner name, currency, opening hours                     |

## Editing the code
Run `npm run dev:server` in one terminal and `npm run dev` in another, then open the link Vite prints.
