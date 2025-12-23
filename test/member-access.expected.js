(function() { if (!(person.age == 25)) throw new Error("Assertion failed"); return true; })()
(function() { if (!(employee.salary > 50000)) throw new Error("Assertion failed"); return true; })()
(function() { if (!(customer.balance + 100 == 600)) throw new Error("Assertion failed"); return true; })()
(function() { if (!(student.gpa >= 3 && student.enrolled)) throw new Error("Assertion failed"); return true; })()
