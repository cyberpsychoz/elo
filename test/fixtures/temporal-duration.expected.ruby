(raise "Assertion failed" unless Date.parse('2024-01-15') + ActiveSupport::Duration.parse('P1D') > Date.parse('2024-01-15'); true)
(raise "Assertion failed" unless Date.parse('2024-01-15') + ActiveSupport::Duration.parse('P1D') < Date.parse('2024-01-17'); true)
(raise "Assertion failed" unless Date.parse('2024-01-15') - ActiveSupport::Duration.parse('P1D') < Date.parse('2024-01-15'); true)
(raise "Assertion failed" unless Date.parse('2024-01-15') - ActiveSupport::Duration.parse('P1D') > Date.parse('2024-01-13'); true)
