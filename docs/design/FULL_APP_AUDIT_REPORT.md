# 🔍 BasantMoney: Full Application UI/UX, Bug & Architectural Audit Report
**Council Review: 4 AI Models Evaluation | Hinglish Edition**
**Date:** 11 November 2026 | **Branch:** `visual-polish` | **Stack:** React 18, Vite, Tailwind CSS, Shadcn/Radix, Supabase

---

## 🏛️ 1. Council Review & Scorecard (4 Models)

| # | Council Model | Provider | Role | Score (/10) | Verdict Summary |
|---|---|---|---|:---:|---|
| 1 | **Antigravity (Gemini 3.8 Flash)** | Antigravity | Lead Inspector | **5.0 / 10** | Core ledger & hooks solid, but massive split-brain storage, missing global headers on 2 core pages, and fake settings controls ruin the user experience. |
| 2 | **OpenCode DeepSeek (v4.1 Flash)** | OpenCode | Reviewer | **5.5 / 10** | Destructive actions in Settings are silent no-ops against Supabase; receipts are captured and thrown away; Reports re-injects stale localStorage data. |
| 3 | **OpenCode Beam (Free)** | OpenCode | Reviewer | **5.0 / 10** | `localStorage.clear()` destroys login session; theme toggle doesn't apply classes; dead wallet code persists across Auth, Goals, and Audit copies. |
| 4 | **OpenCode GLM (5.3 Flash)** | OpenCode | Reviewer | **4.5 / 10** | Runtime errors due to dropped `user_wallets` tables in `interestService.ts`; broken currency grouping (mixed US vs Indian numbering); stranded navigation on `/reports`. |

**Council Average Score: 5.0 / 10** (Grade: *Needs Critical Refactoring Before Production*)

---

## 🚨 2. Top Critical / "Core" Problems (Miracle Killers)

Ye wo 5 critical problems hain jo app ke trust aur architecture ko todti hain:

1. **Split-Brain Storage & Fake Data Clear (Data Integrity Hazard):**
   - Income aur Expense Supabase DB mein save hote hain, lekin Payments (`/payments`), Goals (`/financial-goals`), Categories, Payment Methods aur User Settings sirf browser ke `localStorage` mein rehte hain.
   - Settings page par **"Clear All Transactions"** aur **"Reset All Data"** buttons sirf `localStorage` ko wipe karte hain. Supabase ke actual records delete hi nahi hote! User ko toast dikhta hai *"Transactions Cleared"*, par refresh karne par sab wapas aa jata hai.
   - Ulta `localStorage.clear()` karne se Supabase ka JWT auth token delete ho jata hai, jisse user forcibly logout ho jata hai!

2. **File Attachments Ka Silent Discard (Ghost Receipts):**
   - `/income` aur `/expense` pages par user receipt/bill select karta hai, input field file ka naam dikhata hai.
   - Lekin form submit hone par `attachment` file ko Supabase Storage mein upload karne ka koi code hi nahi hai! File silently dump kar di jaati hai aur toast aata hai *"Saved successfully"*. User samajhta hai receipt save ho gayi, jabki wo kahin exist nahi karti.

3. **Global Navigation Ka Gayab Hona (`/reports` & `/payments` Stranded Pages):**
   - `/reports` page par **koi Header nahi hai**. User agar `/reports` par chala gaya, to wahan na koi Home button hai, na Transactions, na Goals, na Logout. User page par trap ho jata hai.
   - `/payments` par bhi standard `<Header />` missing hai, wahan ek local arrow button hai jo sirf browser history back karta hai.

4. **Decommissioned Wallet System Ke Bhoot (Ghost Wallets & Crash Risk):**
   - App ne pehle wallet system (Main, Needs, Wants) hata kar direct Bank Ledger banaya tha.
   - Lekin `/auth` par abhi bhi bada banner likha hai: *"Smart Wallet System - Organize into saving, needs and wants"*.
   - `/financial-goals` mein user se pucha ja raha hai *"Wallet Source: saving, needs, wants"*.
   - Sabse dangerous: `interestService.ts` abhi bhi `user_wallets` aur `user_subwallets` tables ko update karne ki koshish karta hai jo database migration mein DROP ho chuki hain!

5. **Fake Theme & Currency Settings:**
   - Settings mein **Dark Mode Switch** toggle karne par localStorage mein value update hoti hai, lekin `document.documentElement.classList.add('dark')` karne wala **ThemeProvider poori app mein kahi mount hi nahi hai**! Dark mode switch user ke liye ek useless toy hai.
   - Currency symbol input box bhi exist karta hai, lekin poore app mein `₹` hardcoded hai; setting ka value code mein kahi read hi nahi hota.
