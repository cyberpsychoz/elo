CASE WHEN 42 = 42 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN 40 + 2 = 42 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN 42 <> 43 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN 3.14 = 3.14 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN 3 + 0.14 = 3.14 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN 3.14 <> 3.15 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN TRUE = TRUE THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN FALSE = FALSE THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN TRUE <> FALSE THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN 1 = 1 = TRUE THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN 'hello' = 'hello' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN 'hel' || 'lo' = 'hello' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN 'hello' <> 'world' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN DATE '2024-01-15' = DATE '2024-01-15' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN DATE '2024-01-14' + INTERVAL 'P1D' = DATE '2024-01-15' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN DATE '2024-01-15' <> DATE '2024-01-16' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN TIMESTAMP '2024-01-15 10:00:00' = TIMESTAMP '2024-01-15 10:00:00' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN TIMESTAMP '2024-01-15 09:00:00' + INTERVAL 'PT1H' = TIMESTAMP '2024-01-15 10:00:00' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN TIMESTAMP '2024-01-15 10:00:00' <> TIMESTAMP '2024-01-15 11:00:00' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN INTERVAL 'P1D' = INTERVAL 'P1D' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN INTERVAL 'P1D' + INTERVAL 'P1D' = INTERVAL 'P2D' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN 2 * INTERVAL 'P1D' = INTERVAL 'P2D' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN INTERVAL 'P2D' / 2 = INTERVAL 'P1D' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN INTERVAL 'P1D' <> INTERVAL 'P2D' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN INTERVAL 'PT1H' = INTERVAL 'PT1H' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN INTERVAL 'PT30M' + INTERVAL 'PT30M' = INTERVAL 'PT1H' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN INTERVAL 'PT1H' <> INTERVAL 'PT2H' THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
