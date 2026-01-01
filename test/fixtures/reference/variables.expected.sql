CASE WHEN $1.x + $1.y = 15 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN $1.price + $1.tax = 110 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN $1.user_age + $1.account_balance = 2525 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN $1.var1 + $1.var2 = 30 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
