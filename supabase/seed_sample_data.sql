-- ============================================================
-- FinOpsAi — Sample Data Seed
-- ============================================================
-- HOW TO USE:
--   1. Sign up / log in at http://localhost:3000
--   2. Open Supabase Dashboard → SQL Editor → New Query
--   3. Paste this entire file → Run
--
-- All rows are scoped to the FIRST user in auth.users.
-- Run once per test account. Safe to re-run (uses ON CONFLICT DO NOTHING).
-- ============================================================

DO $$
DECLARE
  uid          UUID;
  session_mar  UUID;
  session_apr  UUID;
  pair_1       UUID;
  pair_2       UUID;
  pair_3       UUID;
  pair_4       UUID;
  pair_5       UUID;
  pair_6       UUID;
  pair_7       UUID;
  pair_8       UUID;
BEGIN

-- ─── Resolve user ────────────────────────────────────────────────────────────
SELECT id INTO uid FROM auth.users ORDER BY created_at LIMIT 1;
IF uid IS NULL THEN
  RAISE EXCEPTION 'No user found in auth.users. Sign up first, then re-run this seed.';
END IF;
RAISE NOTICE 'Seeding data for user: %', uid;

-- ─── 1. Profile ──────────────────────────────────────────────────────────────
UPDATE profiles SET
  full_name           = 'Alex Mercer',
  company_name        = 'Apex Ventures Inc.',
  role                = 'owner',
  subscription_tier   = 'growth',
  subscription_status = 'active',
  industry            = 'Technology',
  fiscal_year_end     = 'December 31',
  base_currency       = 'USD'
WHERE id = uid;

-- Add missing profile columns gracefully
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS industry        TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS fiscal_year_end TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS base_currency   TEXT;

UPDATE profiles SET
  industry        = 'Technology',
  fiscal_year_end = 'December 31',
  base_currency   = 'USD'
WHERE id = uid;

-- ─── 2. Reconciliation Sessions ──────────────────────────────────────────────
INSERT INTO reconciliation_sessions (
  id, user_id, name, period_start, period_end,
  status, close_confidence_score,
  total_bank_transactions, total_invoice_transactions,
  matched_count, unmatched_count, flagged_count, duplicate_count,
  total_matched_amount, total_unmatched_amount
) VALUES
  (
    uuid_generate_v4(), uid,
    'March 2026 Bank Reconciliation',
    '2026-03-01', '2026-03-31',
    'complete', 91,
    42, 38, 35, 4, 2, 1,
    187432.50, 12340.00
  ),
  (
    uuid_generate_v4(), uid,
    'April 2026 Bank Reconciliation',
    '2026-04-01', '2026-04-15',
    'complete', 74,
    18, 14, 10, 5, 2, 1,
    63210.00, 28900.00
  )
ON CONFLICT DO NOTHING;

-- Grab session IDs for FK references
SELECT id INTO session_mar FROM reconciliation_sessions
  WHERE user_id = uid AND name = 'March 2026 Bank Reconciliation' LIMIT 1;
SELECT id INTO session_apr FROM reconciliation_sessions
  WHERE user_id = uid AND name = 'April 2026 Bank Reconciliation' LIMIT 1;

-- ─── 3. Match Pairs (Review queue) ───────────────────────────────────────────
-- 3a. Unmatched — AWS charges
pair_1 := uuid_generate_v4();
INSERT INTO match_pairs (
  id, session_id, user_id,
  bank_transaction, invoice_transaction,
  status, confidence, match_method,
  explanation, suggested_action, gl_category, flags
) VALUES (
  pair_1, session_apr, uid,
  '{"id":"bt-001","date":"2026-04-03","amount":4823.12,"description":"AWS AMAZON WEB SERVICES","vendor":"AWS","source":"bank","currency":"USD"}',
  NULL,
  'unmatched', 0, 'fuzzy_ai',
  'No matching invoice found for this AWS charge. Amount is 23% higher than last month.',
  'Request invoice from AWS or match to a pending PO.',
  'Cloud Infrastructure',
  '[{"type":"amount_deviation","severity":"medium","message":"Amount 23% above 30-day average of $3,920"},{"type":"missing_invoice","severity":"high","message":"No invoice on file for this period"}]'
) ON CONFLICT DO NOTHING;

-- 3b. Flagged — Duplicate payment suspicion
pair_2 := uuid_generate_v4();
INSERT INTO match_pairs (
  id, session_id, user_id,
  bank_transaction, invoice_transaction,
  status, confidence, match_method,
  explanation, suggested_action, gl_category, flags
) VALUES (
  pair_2, session_apr, uid,
  '{"id":"bt-002","date":"2026-04-05","amount":1250.00,"description":"STRIPE PAYOUT","vendor":"Stripe","source":"bank","currency":"USD"}',
  '{"id":"inv-002","date":"2026-04-04","amount":1250.00,"description":"Stripe payout transfer","vendor":"Stripe","source":"stripe","currency":"USD"}',
  'flagged', 78, 'fuzzy_ai',
  'Possible duplicate payout detected. A $1,250 Stripe transfer was processed on both Apr 4 and Apr 5.',
  'Verify with Stripe dashboard — one entry may be a duplicate.',
  'Payment Processing',
  '[{"type":"duplicate","severity":"high","message":"Matching $1,250 Stripe payout found within 24 hours"}]'
) ON CONFLICT DO NOTHING;

-- 3c. Flagged — Timing anomaly
pair_3 := uuid_generate_v4();
INSERT INTO match_pairs (
  id, session_id, user_id,
  bank_transaction, invoice_transaction,
  status, confidence, match_method,
  explanation, suggested_action, gl_category, flags
) VALUES (
  pair_3, session_apr, uid,
  '{"id":"bt-003","date":"2026-04-08","amount":9500.00,"description":"VENDOR PMT - DESIGN CO","vendor":"DesignCo","source":"bank","currency":"USD"}',
  '{"id":"inv-003","date":"2026-03-15","amount":9500.00,"description":"INV-2026-034 Design retainer","vendor":"DesignCo","source":"invoice","currency":"USD"}',
  'flagged', 85, 'exact',
  'Payment matches invoice INV-2026-034 but was paid 24 days after invoice date, exceeding Net-15 terms.',
  'Book as late payment. Note in audit trail.',
  'Design & Creative',
  '[{"type":"timing_anomaly","severity":"medium","message":"Payment 24 days after invoice date (Net-15 terms)"}]'
) ON CONFLICT DO NOTHING;

-- 3d. Suggested — AI recommends match
pair_4 := uuid_generate_v4();
INSERT INTO match_pairs (
  id, session_id, user_id,
  bank_transaction, invoice_transaction,
  status, confidence, match_method,
  explanation, suggested_action, gl_category, flags
) VALUES (
  pair_4, session_apr, uid,
  '{"id":"bt-004","date":"2026-04-10","amount":320.00,"description":"ADOBE INC SUBSCRIPTION","vendor":"Adobe","source":"bank","currency":"USD"}',
  '{"id":"inv-004","date":"2026-04-10","amount":320.00,"description":"Adobe Creative Cloud annual renewal","vendor":"Adobe Inc.","source":"invoice","currency":"USD"}',
  'suggested', 94, 'fuzzy_ai',
  'High-confidence match between bank debit and Adobe Creative Cloud renewal invoice. Vendor names differ slightly (Adobe vs Adobe Inc.) but amount and date are exact.',
  'Approve — vendor name variation is known.',
  'Software Subscriptions',
  '[]'
) ON CONFLICT DO NOTHING;

-- 3e. Duplicate
pair_5 := uuid_generate_v4();
INSERT INTO match_pairs (
  id, session_id, user_id,
  bank_transaction, invoice_transaction,
  status, confidence, match_method,
  explanation, suggested_action, gl_category, flags
) VALUES (
  pair_5, session_apr, uid,
  '{"id":"bt-005","date":"2026-04-11","amount":750.00,"description":"OFFICE SUPPLIES - STAPLES","vendor":"Staples","source":"bank","currency":"USD"}',
  '{"id":"inv-005","date":"2026-04-10","amount":750.00,"description":"Office supplies bulk order","vendor":"Staples","source":"invoice","currency":"USD"}',
  'duplicate', 97, 'exact',
  'This transaction appears to be an exact duplicate of an entry already approved on April 9th.',
  'Reject — duplicate of approved transaction MP-APR-009.',
  'Office Supplies',
  '[{"type":"duplicate","severity":"high","message":"Exact duplicate of approved match from April 9"}]'
) ON CONFLICT DO NOTHING;

-- 3f. Unmatched — payroll
pair_6 := uuid_generate_v4();
INSERT INTO match_pairs (
  id, session_id, user_id,
  bank_transaction, invoice_transaction,
  status, confidence, match_method,
  explanation, suggested_action, gl_category, flags
) VALUES (
  pair_6, session_apr, uid,
  '{"id":"bt-006","date":"2026-04-15","amount":48200.00,"description":"GUSTO PAYROLL 04-15","vendor":"Gusto","source":"bank","currency":"USD"}',
  NULL,
  'unmatched', 0, 'fuzzy_ai',
  'Payroll disbursement via Gusto. No invoice exists for payroll — this should be matched to the payroll journal entry.',
  'Create or link payroll journal entry for April 15 payroll run.',
  'Payroll',
  '[{"type":"missing_invoice","severity":"low","message":"Payroll entries do not have invoices — normal behavior"}]'
) ON CONFLICT DO NOTHING;

-- 3g. Suggested — recurring SaaS
pair_7 := uuid_generate_v4();
INSERT INTO match_pairs (
  id, session_id, user_id,
  bank_transaction, invoice_transaction,
  status, confidence, match_method,
  explanation, suggested_action, gl_category, flags
) VALUES (
  pair_7, session_mar, uid,
  '{"id":"bt-007","date":"2026-03-01","amount":599.00,"description":"SALESFORCE.COM","vendor":"Salesforce","source":"bank","currency":"USD"}',
  '{"id":"inv-007","date":"2026-03-01","amount":599.00,"description":"Salesforce Professional monthly","vendor":"Salesforce","source":"invoice","currency":"USD"}',
  'suggested', 99, 'exact',
  'Perfect match — recurring Salesforce monthly subscription, same amount and date as prior months.',
  'Approve.',
  'CRM & Sales Tools',
  '[]'
) ON CONFLICT DO NOTHING;

-- 3h. Already approved (for Reports readiness demo)
pair_8 := uuid_generate_v4();
INSERT INTO match_pairs (
  id, session_id, user_id,
  bank_transaction, invoice_transaction,
  status, confidence, match_method,
  explanation, suggested_action, gl_category, flags,
  resolution, reviewed_at
) VALUES (
  pair_8, session_mar, uid,
  '{"id":"bt-008","date":"2026-03-15","amount":2400.00,"description":"RENT - 455 MARKET ST","vendor":"Market Street LLC","source":"bank","currency":"USD"}',
  '{"id":"inv-008","date":"2026-03-01","amount":2400.00,"description":"March 2026 office rent","vendor":"Market Street LLC","source":"invoice","currency":"USD"}',
  'matched', 100, 'exact',
  'Exact match on amount, vendor, and period.',
  NULL,
  'Rent & Facilities',
  '[]',
  'approved', NOW() - INTERVAL '10 days'
) ON CONFLICT DO NOTHING;

-- ─── 4. Uploads (Inbox) ──────────────────────────────────────────────────────
INSERT INTO uploads (
  user_id, filename, file_size_bytes, mime_type,
  classification, classification_confidence,
  classification_reasoning, detected_entity,
  suggested_period_start, suggested_period_end,
  transactions_count, status
) VALUES
  -- Classified — bank statement
  (uid, 'bofa_march_2026.csv', 48320, 'text/csv',
   'bank_statement', 97,
   'CSV contains date/amount/description columns matching bank statement format. Detected entity: Bank of America.',
   'Bank of America',
   '2026-03-01', '2026-03-31',
   42, 'classified'),
  -- Classified — invoice
  (uid, 'aws_invoice_apr2026.pdf', 142080, 'application/pdf',
   'invoice', 91,
   'PDF contains AWS invoice number, line items for EC2 and S3, billing period April 2026.',
   'Amazon Web Services',
   '2026-04-01', '2026-04-30',
   8, 'classified'),
  -- Confirmed — payroll
  (uid, 'gusto_payroll_apr15.csv', 22016, 'text/csv',
   'payroll', 99,
   'Gusto export format detected. Contains employee names, gross/net pay, tax withholdings.',
   'Gusto Payroll',
   '2026-04-15', '2026-04-15',
   14, 'confirmed'),
  -- Classified — expense report
  (uid, 'expense_report_q1.xlsx', 36864, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
   'expense_report', 88,
   'Excel file with employee, category, amount, date columns. Pattern matches expense report template.',
   NULL,
   '2026-01-01', '2026-03-31',
   67, 'classified'),
  -- Error — unsupported format
  (uid, 'board_deck.pptx', 2097152, 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
   NULL, NULL,
   NULL, NULL, NULL, NULL,
   0, 'error')
ON CONFLICT DO NOTHING;

UPDATE uploads SET error_message = 'Unsupported file type. Please upload CSV, XLSX, or PDF files only.'
WHERE user_id = uid AND filename = 'board_deck.pptx';

-- ─── 5. Journal Entries (Close → Journal tab) ────────────────────────────────
INSERT INTO journal_entries (
  user_id, session_id, date, description,
  lines, total_amount, status,
  ai_generated, ai_reasoning
) VALUES
  -- Draft — depreciation
  (uid, session_mar, '2026-03-31', 'March 2026 — Depreciation Expense',
   '[{"account":"6100 Depreciation Expense","description":"Monthly depreciation — equipment","debit":1840.00},{"account":"1500 Accumulated Depreciation","description":"Monthly depreciation — equipment","credit":1840.00}]',
   1840.00, 'draft', TRUE,
   'Calculated straight-line depreciation on $110,400 of equipment over 5 years (60 months).'),
  -- Pending approval — accrued payroll
  (uid, session_apr, '2026-04-15', 'April 15 Payroll Accrual',
   '[{"account":"6000 Salaries & Wages","description":"April 15 payroll run","debit":48200.00},{"account":"2100 Accrued Payroll","description":"April 15 payroll run","credit":43380.00},{"account":"2110 Payroll Tax Payable","description":"Employer FICA/FUTA","credit":4820.00}]',
   48200.00, 'pending_approval', TRUE,
   'AI drafted from Gusto payroll export: $48,200 gross, $43,380 net, $4,820 employer taxes. Payroll account matches GL code 6000.'),
  -- Draft — prepaid expense amortization
  (uid, session_apr, '2026-04-30', 'April Prepaid Insurance Amortization',
   '[{"account":"6200 Insurance Expense","description":"Monthly prepaid amortization","debit":625.00},{"account":"1300 Prepaid Insurance","description":"Monthly prepaid amortization","credit":625.00}]',
   625.00, 'draft', TRUE,
   'Annual D&O policy of $7,500 amortized monthly ($625/mo) over 12-month policy term.')
ON CONFLICT DO NOTHING;

-- ─── 6. Close Checklist (April 2026) ─────────────────────────────────────────
INSERT INTO close_checklists (
  user_id, period_start, period_end,
  tasks, signed_off
) VALUES (
  uid, '2026-04-01', '2026-04-30',
  '[
    {"id":"t1","title":"Reconcile main checking account","category":"reconciliation","status":"complete","is_recurring":true},
    {"id":"t2","title":"Reconcile Stripe payouts","category":"reconciliation","status":"complete","is_recurring":true},
    {"id":"t3","title":"Reconcile credit card statements","category":"reconciliation","status":"not_started","is_recurring":true},
    {"id":"t4","title":"Review and approve AI journal entries","category":"journal_entries","status":"not_started","is_recurring":false},
    {"id":"t5","title":"Post depreciation journal entries","category":"journal_entries","status":"not_started","is_recurring":true},
    {"id":"t6","title":"Accrue unpaid vendor invoices","category":"journal_entries","status":"not_started","is_recurring":true},
    {"id":"t7","title":"Review AP aging","category":"review","status":"not_started","is_recurring":false},
    {"id":"t8","title":"Review AR aging","category":"review","status":"not_started","is_recurring":false},
    {"id":"t9","title":"Variance analysis vs. prior month","category":"review","status":"not_started","is_recurring":true},
    {"id":"t10","title":"CFO review and sign-off","category":"approval","status":"not_started","is_recurring":true,"depends_on":["t1","t2","t3","t4","t5","t6"]}
  ]',
  FALSE
) ON CONFLICT DO NOTHING;

-- ─── 7. Audit Log ────────────────────────────────────────────────────────────
INSERT INTO audit_log (
  user_id, entity_type, entity_id, action,
  changes, ai_involved, ip_address, created_at
) VALUES
  (uid, 'reconciliation_session', session_mar, 'created',
   '{"name":"March 2026 Bank Reconciliation","matched":35,"unmatched":4,"flagged":2}',
   TRUE, '127.0.0.1', NOW() - INTERVAL '14 days'),
  (uid, 'match_pair', pair_7, 'approve',
   '{"resolution":"approved","gl_category":"CRM & Sales Tools"}',
   FALSE, '127.0.0.1', NOW() - INTERVAL '13 days'),
  (uid, 'match_pair', pair_8, 'approve',
   '{"resolution":"approved","gl_category":"Rent & Facilities"}',
   FALSE, '127.0.0.1', NOW() - INTERVAL '10 days'),
  (uid, 'reconciliation_session', session_apr, 'created',
   '{"name":"April 2026 Bank Reconciliation","matched":10,"unmatched":5,"flagged":2}',
   TRUE, '127.0.0.1', NOW() - INTERVAL '2 days'),
  (uid, 'upload', uid, 'classified',
   '{"filename":"bofa_march_2026.csv","classification":"bank_statement","confidence":97,"rows_parsed":42}',
   TRUE, '127.0.0.1', NOW() - INTERVAL '5 days'),
  (uid, 'upload', uid, 'classified',
   '{"filename":"aws_invoice_apr2026.pdf","classification":"invoice","confidence":91,"rows_parsed":8}',
   TRUE, '127.0.0.1', NOW() - INTERVAL '3 days'),
  (uid, 'journal_entry', pair_1, 'ai_explanation_generated',
   '{"explanation":"AI generated depreciation entry for March 2026"}',
   TRUE, '127.0.0.1', NOW() - INTERVAL '12 days'),
  (uid, 'match_pair', pair_2, 'add_note',
   '{"note":"Checking with Stripe — possible duplicate payout"}',
   FALSE, '127.0.0.1', NOW() - INTERVAL '1 day'),
  (uid, 'profile', uid, 'profile_updated',
   '{"company_name":"Apex Ventures Inc.","industry":"Technology"}',
   FALSE, '127.0.0.1', NOW() - INTERVAL '30 days'),
  (uid, 'close_checklist', uid, 'task_updated',
   '{"task_id":"t1","status":"complete"}',
   FALSE, '127.0.0.1', NOW() - INTERVAL '1 day')
ON CONFLICT DO NOTHING;

-- ─── 8. Vendor Rules (Settings → Rules tab) ──────────────────────────────────
INSERT INTO vendor_rules (
  user_id, vendor_pattern, gl_category,
  auto_approve, auto_approve_threshold,
  created_from, times_applied, last_applied
) VALUES
  (uid, 'aws',        'Cloud Infrastructure',    TRUE,  95, 'learned',  18, NOW() - INTERVAL '3 days'),
  (uid, 'salesforce', 'CRM & Sales Tools',       TRUE,  90, 'learned',  12, NOW() - INTERVAL '14 days'),
  (uid, 'adobe',      'Software Subscriptions',  FALSE, 90, 'manual',    6, NOW() - INTERVAL '5 days'),
  (uid, 'gusto',      'Payroll',                 FALSE, 90, 'learned',   4, NOW() - INTERVAL '1 day'),
  (uid, 'stripe',     'Payment Processing',      FALSE, 85, 'manual',   22, NOW() - INTERVAL '2 days')
ON CONFLICT (user_id, vendor_pattern) DO NOTHING;

RAISE NOTICE '✓ Sample data seeded for user %', uid;
RAISE NOTICE '  • 2 reconciliation sessions';
RAISE NOTICE '  • 8 match pairs (Review queue)';
RAISE NOTICE '  • 5 uploads (Inbox)';
RAISE NOTICE '  • 3 journal entries (Close)';
RAISE NOTICE '  • 1 close checklist (April 2026)';
RAISE NOTICE '  • 10 audit log entries';
RAISE NOTICE '  • 5 vendor rules (Settings)';

END $$;
