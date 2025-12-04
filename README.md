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
5. **Додайте Supabase ключі** у `.env.local` (див. приклад [.env.local.example](.env.local.example)):
   ```
   VITE_SUPABASE_URL=https://<project>.supabase.co
   VITE_SUPABASE_ANON_KEY=ваш_anon_ключ
   ```
6. **Запустіть сервер розробки:**
   ```bash
   npm run dev
   ```
7. У терміналі з'явиться адреса (наприклад, `http://localhost:5173`). **Відкрийте її в браузері** на цьому ПК.

## Як увімкнути збереження в Supabase (без свого сервера)
- Створи таблицю `collections` у Supabase з полями `name` (primary key, text) і `data` (JSON/JSONB). Додай два рядки: `name=niches`, `data=[]` і `name=projects`, `data=[]`.
- Увімкни RLS і політики, що дозволяють читати та оновлювати ці два рядки потрібним користувачам.
- У `.env.local` пропиши `VITE_SUPABASE_URL` і `VITE_SUPABASE_ANON_KEY` (див. крок 5 вище). Фронтенд напряму читає/пише в Supabase і продовжує кешувати дані в `localStorage` як резерв.

### Налаштування Auth та RLS у Supabase
1. Увімкни **Email** (password) у вкладці **Authentication → Providers**. Для тесту створити два акаунти можна через **Authentication → Users → Add user**.
2. Перевір, що в таблиці `collections` увімкнено **RLS**.
3. Додай політики (SQL) для ролі `authenticated`:
   ```sql
   create policy "Authenticated can read collections"
     on public.collections for select
     using (auth.role() = 'authenticated');

   create policy "Authenticated can insert collections"
     on public.collections for insert
     with check (auth.role() = 'authenticated');

   create policy "Authenticated can update collections"
     on public.collections for update
     using (auth.role() = 'authenticated')
     with check (auth.role() = 'authenticated');
   ```
   > Якщо потрібне розмежування доступу, додавай фільтр `auth.uid()` або поле власника.
4. Переконайся, що без входу запити до `collections` повертають 401/403 (RLS блокує), а з різними акаунтами видно тільки дозволені дані.

### Як увійти у фронтенді
- Додай ключі `VITE_SUPABASE_URL` і `VITE_SUPABASE_ANON_KEY` у `.env.local`.
- Відкрий застосунок і заповни форму входу/реєстрації (Email/Password). Сесія зберігається, тому після перезавантаження дані з Supabase тягнуться автоматично.
- Без входу додаток працює лише з локальним кешем і відмовляє у записі в Supabase.

## Як підключити другий пристрій
- Якщо обидва пристрої в одній мережі Wi‑Fi/Ethernet, відкрийте адресу `http://IP_цього_ПК:порт`, де IP можна дізнатись через `ipconfig` (Windows) або `ifconfig` (macOS/Linux). Порт — той, що показує `npm run dev` (звичайно 5173 чи 3000).
- Якщо потрібно з'єднатися через інтернет, створіть тунель (наприклад, **ngrok** або **Cloudflare Tunnel**) і використайте видану адресу.
- **Сталий варіант:** задеплойте фронтенд (Vercel/Netlify) і використовуйте Supabase як БД+API. Після деплою у `.env` фронтенду залиште `VITE_SUPABASE_URL` і `VITE_SUPABASE_ANON_KEY` — отримаєте стабільне посилання, що працює без вашого ПК.

## Оновлення без втрати даних
- Не видаляйте `.env.local` і файли проекту; просто вносьте зміни в код і перезапускайте `npm run dev`.
- Для збереження історії змін ініціалізуйте Git і робіть коміти; це не обнуляє жодні локальні файли.

## Деплой і стабільна адреса
- **Фронтенд**: найпростіше викласти на Vercel/Netlify. Після заливки отримаєте постійний URL виду `https://your-app.vercel.app`.
- **База й логіка**: якщо використовуєш лише Supabase, дані живуть на їхньому Postgres і доступні через постійний REST/Functions URL. Окремий сервер не потрібен.
- **ENV**: у налаштуваннях хостингу фронтенду задайте змінні (`GEMINI_API_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). На локальній машині використовуйте `.env.local`, у продакшені — панель керування хостингу.

### Де взяти `SUPABASE_URL` і `SUPABASE_ANON_KEY`
- У консолі Supabase відкрийте **Settings → API**.
- У блоці **Project URL** скопіюйте значення — це `SUPABASE_URL` (воно буде вигляду `https://<project>.supabase.co`).
- На цій самій сторінці у розділі **Project API keys** скопіюйте **anon public** ключ — це `SUPABASE_ANON_KEY` (його додають у фронтенд).
- Занесіть обидва значення у `.env.local` за ключами `VITE_SUPABASE_URL` і `VITE_SUPABASE_ANON_KEY` (див. приклад [.env.local.example](.env.local.example)) або додайте їх у панелі хостингу фронтенду.

## Як безпечно вносити оновлення, щоб «нічого не ламалось»
1. **Працюйте в Git-гілці.** Перед змінами створюйте нову гілку (`git checkout -b feature/...`), коміться невеликими порціями.
2. **Перед пушем запускайте локально `npm run dev`** і перевіряйте основні сценарії в браузері.
3. **Не коміть секрети.** Використовуйте `.env.local.example` як шаблон і додавайте реальні ключі тільки у `.env.local` чи в ENV хостингу.
4. **Оновлення залежностей робіть обережно.** Після `npm install <pkg>@latest` обов'язково перевіряйте застосунок.
5. **Бекап БД перед деплоєм.** Якщо БД на хостингу, використовуйте вбудовані бекапи або експортуйте дамп (наприклад, `pg_dump` для PostgreSQL).
6. **Деплой через CI/CD або вручну.** Після успішного тесту зливайте гілку у основну та деплойте. Якщо щось зламалось — відкотіться на попередній коміт.
7. **Слідкуйте за логами продакшену.** На Render/Fly/Railway є вкладка Logs. Перевіряйте помилки після кожного релізу.

Так ви матимете постійну адресу для користувачів, захищені секрети та процес оновлень із мінімальним ризиком поломок.

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
