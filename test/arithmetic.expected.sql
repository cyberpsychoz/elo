CASE WHEN 2 + 3 = 5 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN 10 % 3 = 1 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
