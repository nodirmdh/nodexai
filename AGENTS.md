# Agent Rules (Supabase Mode)

Проект работает БЕЗ собственного backend.
Вся логика через Supabase.

## Перед изменениями читать:
- docs/requirements.md
- docs/domains.md
- docs/status.md
- docs/architecture.md
- docs/PLANS.md

---

# Основные правила

1. Не создавать NestJS/Express сервер.
2. Использовать Supabase JS SDK.
3. Логику ролей реализовывать через RLS.
4. Статусы валидировать:
   - либо через CHECK constraints
   - либо через Edge Functions.
5. Не добавлять лишние библиотеки.
6. Все enum значения брать из packages/shared.
7. Любое изменение статусов → обновить docs/status.md.

---

# Работа с БД

- Все изменения через SQL migrations.
- Никаких ручных правок в продакшене.
- Enum значения должны совпадать со shared.

---

# Definition of Done

- RLS политики корректны.
- Нет доступа к чужим данным.
- Статусы соответствуют docs/status.md.
- Mini App и Admin корректно работают через Supabase.