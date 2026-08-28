# Дорожная карта Asociatii

Roadmap ориентирован на снижение риска. Даты и коммерческие обещания назначаются после discovery и оценки этапа. Нельзя ускорять запуск, пропуская безопасность денег, данных или юридических решений.

## Этап 0 — Product discovery и нормативная валидация

Результат: подтверждённая карта процессов APC Молдовы и выбранный пилотный сегмент.

- Интервью: администраторы, бухгалтеры, цензоры/аудиторы, юрист, поставщики и собственники.
- Собрать реальные обезличенные артефакты: реестр объектов, квитанция, бюджет, выписка, invoice поставщика, протокол, доверенность, годовой отчёт, обращение.
- Юридическая матрица Закона №187/2022 после изменений 2026: органы, сроки, кворумы, виды решений, системы голосования, публикация и хранение.
- Бухгалтерская матрица: взносы, фонды, услуги, VAT/e-Factura, зарплата, касса, банк, отчётность и сроки хранения.
- Подтвердить требования Закона №195/2024 с privacy counsel.
- Выбрать 2–3 пилотные APC разного размера и зафиксировать baseline ручной работы.
- Получить условия MPay, MIA/банков и бухгалтерских интеграций.

Exit criteria: юрист и бухгалтер подписали матрицы; есть пилотные партнёры и приоритизированные реальные сценарии.

## Этап 1 — Secure foundation и корректная модель собственности

Результат: безопасный tenant foundation, пригодный для реальных данных, но ещё не денег и юридического голосования.

- Threat model, data classification, retention, incident response и DPA/subprocessors.
- Перестроить модель: APC → condominium/community → building/entrance → cadastral unit → ownership periods/shares → occupants/mandates.
- Разделить membership, employment/office role, residence и ownership.
- Role/permission matrix с scoped grants и separation of duties.
- Закрытый `file_objects` слой и granular document ACL.
- RLS/integration тесты с двумя tenant; тесты IDOR и cross-tenant foreign keys.
- MFA для привилегированных ролей; support access через time-bound impersonation с причиной.
- Backup/PITR, restore drill, audit completeness и secret rotation.
- Импорт/экспорт Excel/CSV с validation report и rollback.

Exit criteria: security review не имеет critical/high проблем; восстановление проверено; пилотные реестры импортируются без потери истории.

## Этап 2 — Операционная работа APC

Результат: администратор и собственники ведут повседневную работу без общих чатов и разрозненных таблиц.

- Кабинеты по ролям и мультиязычность RO/RU.
- Обращения, SLA, аварии, назначения, комментарии и связь с объектом/активом.
- Активы, осмотры, дефекты, preventive maintenance, подрядчики и гарантии.
- Документный архив: версии, ACL, preview, поиск, журнал доступа.
- Официальные объявления, сегменты получателей, delivery/read receipts и reminders.
- Тематические чаты отдельно от официального канала; модерация и retention.
- Onboarding/offboarding собственника, жителя, сотрудника и подрядчика.

Exit criteria: пилотная APC ведёт обращения, документы и уведомления в системе минимум один полный месяц.

## Этап 3 — Собрания и юридически воспроизводимые решения

Результат: полный пакет собрания можно независимо пересчитать и проверить.

- Конструктор повестки и типов решений с юридическими правилами.
- Snapshot собственников, долей, прав голоса и правил на момент созыва.
- Каналы уведомлений и доказательства доставки.
- Очное, video, correspondence и mixed участие согласно подтверждённой матрице.
- Регистрация, доверенности, конфликт интересов, special-interest meetings.
- Кворум, повторное собрание и разные пороги большинства.
- Тайна голоса там, где она требуется, без потери проверяемости.
- Протокол, приложения, подписи/временная метка и неизменяемый evidence package.
- Решение → задача/бюджет/договор с контролем исполнения.

Exit criteria: юрист воспроизводит три разных собрания из export package и подтверждает корректность.

## Этап 4 — Начисления, фонды и прозрачность денег

Результат: собственник понимает каждый MDL, администратор закрывает период, бухгалтер сверяет данные.

- Double-entry subledger, chart mapping, periods, corrections and approvals.
- Бюджет, версии, plan/fact и решения-основания.
- Фонд ремонта и развития, иные целевые фонды и ограничения расходования.
- Тарифы/формулы: площадь, доля, объект, человек, счётчик, fixed, custom approved rule.
- Поставщики, договоры, purchase request, offers, approval, invoice, payment.
- Monthly billing run, preview, review, publish, notices, partial payments, advance, debt, penalty and installment plan.
- Касса с кассовыми документами, если нужна пилотам; приоритет безналичным операциям.
- Банковский импорт и reconciliation с exception queue.
- Dashboard: остатки счетов и фондов, доходы/расходы, обязательства, долги и drill-down до документа.
- Экспорт бухгалтеру и сверка контрольных итогов.

Exit criteria: параллельный расчёт двух периодов совпадает с утверждённым учётом пилота; accountant signs reconciliation.

## Этап 5 — Коммунальные услуги и автоматизация бухгалтерии

Результат: полный цикл показаний, распределения и документов поставщиков.

- Meter registry, tariff periods, readings, photos, validation and anomaly detection.
- Общедомовые/индивидуальные различия и версии формул распределения.
- Импорт invoice поставщиков с human-reviewed OCR.
- e-Factura integration, если подтверждены обязанность, полномочия и API.
- 1C/выбранная accounting integration: master-data mapping, export/import, retry and reconciliation.
- Автоматические акты сверки, закрывающие документы и годовая отчётная выборка.
- Payroll/HR либо интеграция — только после отдельного решения build vs integrate.

Exit criteria: бухгалтер закрывает период без повторного ручного ввода ключевых документов.

## Этап 6 — Платежи и банковская автоматизация

Результат: безопасная оплата и автоматическая сверка без хранения средств SaaS-платформой.

- Выбранный MPay/MIA/PSP flow и договорная модель.
- Unique payment reference/QR, webhook signatures, idempotency, refunds and exception handling.
- Разделение account per APC; никакого смешивания средств клиентов.
- Open Banking через лицензированного партнёра либо bank API после правовой проверки.
- Consent lifecycle, SCA, connection health and audit.
- Fraud monitoring и reconciliation до bank statement.

Exit criteria: финансовый и security аудит; контрольные платежи и возвраты сходятся до банковского счёта и ledger.

## Этап 7 — Регуляторные интеграции, аналитика и масштабирование

Результат: repeatable SaaS onboarding и подготовка обязательной отчётности.

- e-Condominiu export/API и публичная сводка без PII.
- MSign/MPass или trust-provider интеграция.
- ASP/cadastru workflow, если появится официальный API/соглашение.
- Portfolio mode для управляющих компаний и внешних бухгалтеров.
- Energy-efficiency projects, grants, tenders and long-term capital plan.
- SLA/SLO, disaster recovery, penetration test, privacy audit и cost controls.
- Self-service onboarding только после безопасного assisted onboarding.

Exit criteria: стандартизированный onboarding новой APC, независимый audit и подтверждённая unit economics.

## Сквозные workstreams каждого этапа

- Security/privacy review и миграции данных.
- RO/RU UX, accessibility и mobile/PWA.
- Automated tests: unit, integration, RLS, E2E, financial invariants and document snapshots.
- Observability, support runbooks and audit logs.
- Documentation, data exports and training administrators.
- Legal/accounting change watch с ежеквартальным пересмотром источников.

## Ближайший рабочий backlog

1. Ротировать опубликованный database password и обновить секреты окружений.
2. Создать interview guide и шаблоны process/legal/accounting matrices.
3. Провести security audit текущей миграции, особенно RLS, storage policies, organization creation и SECURITY DEFINER functions.
4. Написать автоматические cross-tenant RLS tests до добавления новых таблиц.
5. Подготовить ERD целевой модели собственности и ADR миграции с текущей схемы.
6. Уточнить у юриста правила голосования после Закона №70/2026.
7. Уточнить у бухгалтера реальный monthly close и получить обезличенные образцы.
8. Получить коммерческие/технические условия MPay, двух банков/PSP и двух бухгалтерских систем.
9. Выбрать пилотные APC и определить измеримые KPI: время закрытия месяца, доля сверенных платежей, срок заявки, участие в собрании и количество спорных начислений.

## Решения, которые нельзя принимать без обсуждения

- финансовый контур: полный accounting ERP или hybrid subledger + integration;
- MPay, MIA/bank или PSP;
- MSign/MPass/trust provider и какие действия юридически подписываются;
- Supabase/Vercel или другая инфраструктура после privacy/region/cost review;
- PWA или native mobile после пилота;
- поставщик SMS/push/email;
- 1C и конкретные альтернативы бухгалтерского ПО;
- Open Banking партнёр и лицензированная модель доступа.

Подробный контекст: [docs/PROJECT_CONTEXT.md](docs/PROJECT_CONTEXT.md). Исследование и источники: [docs/RESEARCH_MOLDOVA.md](docs/RESEARCH_MOLDOVA.md). Архитектурные варианты: [docs/ARCHITECTURE_DECISIONS.md](docs/ARCHITECTURE_DECISIONS.md).
