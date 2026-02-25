# Architecture (Supabase)

## Общая схема

Mini App / Admin
        ↓
Supabase JS SDK
        ↓
Postgres (RLS + Constraints)
        ↓
Edge Functions (если требуется логика)

---

## Аутентификация

Telegram WebApp → initData → Edge Function verify → Supabase session.

Пользователь создаётся в таблице users.

---

## Где логика?

Простые операции:
- SELECT
- INSERT
- UPDATE

Через Supabase SDK напрямую.

Сложная логика:
- Смена статусов
- Проверка ролей
- Проверка переходов

Через:
- Edge Functions
- или DB constraints

---

## Realtime

Использовать Supabase Realtime для:
- Обновления статусов заказов
- Обновления поездок

---

## Безопасность

- Все таблицы с включённым RLS.
- Нет публичного доступа.
- Политики строго по ролям.