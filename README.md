# Kungrad Super Bot — Supabase Architecture

Telegram Mini App для Кунграда.

## MVP v1
- Рестораны
- Заказы еды
- Доставка (наличные)
- Роли: client, restaurant, admin

## MVP v2
- Такси
- Водители
- Ручное назначение водителя
- Статусы поездок

---

# Архитектура

Frontend:
- React (Mini App)
- React (Admin Panel)

Backend:
- Supabase (Postgres + RLS + Realtime + Edge Functions)

Никакого собственного API сервера.

---

# Структура проекта

/apps
  /miniapp
  /admin
/packages
  /shared
/supabase
  /migrations
  /functions
/docs
README.md
AGENTS.md

---

# Основные технологии

- Supabase Postgres
- Row Level Security (RLS)
- Supabase Realtime
- Supabase Edge Functions
- Shared enums в /packages/shared

---

# Важно

- Вся бизнес-логика либо:
  - в SQL constraints
  - в RLS
  - в Edge Functions
- Никаких “магических строк” статусов
- Источник правды — docs/status.md