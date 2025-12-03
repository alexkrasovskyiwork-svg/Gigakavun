<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

Цей репозиторій містить все, що потрібно, щоб запустити ваш AI Studio застосунок як вебapp.

## Дуже прості кроки
1. **Розпакуйте проект** у зручну теку (наприклад, `Documents/ai-app`).
2. **Відкрийте термінал у цій теці.**
   - Windows: PowerShell / Command Prompt.
   - macOS: Terminal.
3. **Встановіть залежності:**
   ```bash
   npm install
   ```
4. **Створіть файл `.env.local` у корені проекту** (є приклад [.env.local.example](.env.local.example)) і додайте свій ключ Gemini:
   ```
   GEMINI_API_KEY=ваш_ключ
   ```
5. **Запустіть сервер розробки:**
   ```bash
   npm run dev
   ```
6. У терміналі з'явиться адреса (наприклад, `http://localhost:5173`). **Відкрийте її в браузері** на цьому ПК.

## Як підключити другий пристрій
- Якщо обидва пристрої в одній мережі Wi‑Fi/Ethernet, відкрийте адресу `http://IP_цього_ПК:порт`, де IP можна дізнатись через `ipconfig` (Windows) або `ifconfig` (macOS/Linux). Порт — той, що показує `npm run dev` (звичайно 5173 чи 3000).
- Якщо потрібно з'єднатися через інтернет, створіть тунель (наприклад, **ngrok** або **Cloudflare Tunnel**) і використайте видану адресу.

## Оновлення без втрати даних
- Не видаляйте `.env.local` і файли проекту; просто вносьте зміни в код і перезапускайте `npm run dev`.
- Для збереження історії змін ініціалізуйте Git і робіть коміти; це не обнуляє жодні локальні файли.

## Як додати ваш код на GitHub
1. Створіть новий порожній репозиторій на GitHub (кнопка **New repo**).
2. У терміналі в корені проекту виконайте:
   ```bash
   git init
   git add .
   git commit -m "Initial import from AI Studio"
   git branch -M main
   git remote add origin https://github.com/<ваш-акаунт>/<назва-репозиторію>.git
   git push -u origin main
   ```
3. Не додавайте у репозиторій файли з секретами (наприклад, `.env.local`). Замість цього тримайте шаблон `.env.local.example`.

## Run Locally (оригінальні інструкції)
1. Встановіть залежності: `npm install`
2. Додайте ключ `GEMINI_API_KEY` у [.env.local](.env.local)
3. Запустіть застосунок: `npm run dev`
