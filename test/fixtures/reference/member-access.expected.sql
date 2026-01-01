CASE WHEN $1.person.age = 25 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN $1.employee.salary > 50000 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN $1.customer.balance + 100 = 600 THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
CASE WHEN $1.student.gpa >= 3 AND $1.student.enrolled THEN TRUE ELSE (SELECT pg_terminate_backend(pg_backend_pid())) END
