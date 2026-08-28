# Supabase security baseline

Последнее обновление: 28 августа 2026 года.

## Итерация 1 — tenant isolation hardening

Миграция: `supabase/migrations/00003_security_hardening.sql`.

Закрытые критические риски:

- пользователь больше не может менять `email` или `global_role` через update собственного профиля;
- удалены политики, позволявшие авторизованному пользователю напрямую создать APC и добавить себя `association_admin` в произвольную организацию;
- создание APC и первого администратора выполняется одной транзакционной RPC `create_organization`;
- принятие приглашения проверяет пользователя, email, статус и срок, затем атомарно создаёт membership и закрывает invitation;
- raw audit writer больше не доступен `anon`/`authenticated`; управленческий wrapper проверяет `can_manage_org`;
- составные tenant foreign keys запрещают связывать квартиру, голос, вариант, обращение или комментарий с родителем из другой APC;
- автор обращения не может перенести обращение в другую APC через update;
- уведомления ограничены самим пользователем либо активным членом той же APC при наличии management role;
- скачивание из приватных buckets требует не только tenant-папку, но и существующую запись документа либо зарегистрированное вложение обращения.

## Автоматическая проверка

`supabase/tests/database/tenant_isolation.test.sql` выполняется внутри транзакции и завершается `ROLLBACK`.

Покрыто 14 проверок:

- наличие безопасных RPC;
- запрет прямого raw audit;
- SELECT isolation организаций и зданий;
- запрет self-promotion до `super_admin`;
- запрет прямого создания APC;
- запрет самоназначения администратором чужой APC;
- успешное атомарное создание APC;
- блокировка cross-tenant foreign key;
- блокировка audit spoofing;
- наличие усиленных Storage policies.

Запуск:

```bash
supabase test db --linked supabase/tests/database/tenant_isolation.test.sql
```

## Оставшиеся обязательные работы

Это базовая граница безопасности, а не завершённый security audit.

1. Ввести `file_objects` и granular ACL: board, accountant, auditor, specific unit, legal restricted.
2. Перенести вложения обращений из JSONB в нормализованную таблицу и проверять объект файла по FK.
3. Добавить tenant tests для каждой таблицы и каждой операции INSERT/UPDATE/DELETE, включая Storage upload/delete.
4. Проверить все SECURITY DEFINER функции: фиксированный `search_path`, минимальные grants, validation и audit.
5. Добавить rate limiting, upload scanning, MIME verification и limits на уровне приложения и Storage.
6. Включить MFA для привилегированных ролей и разработать break-glass/support access.
7. Настроить PITR/backup и провести документированный restore drill.
8. Реализовать privacy lifecycle по Закону №195/2024 и журнал доступа к чувствительным документам.
9. Добавить CI с временной Supabase-базой; linked production не должен быть обычным test target.
10. Ротировать ранее опубликованный database password.

