require 'date'
require 'active_support/all'

# Time injection for testing: set KLANG_NOW environment variable
# Example: KLANG_NOW="2025-12-01T19:34:00" ruby -r ./prelude.rb test.rb
if ENV['KLANG_NOW'] && !ENV['KLANG_NOW'].empty?
  KLANG_FIXED_TIME = DateTime.parse(ENV['KLANG_NOW'])

  class DateTime
    class << self
      alias_method :_original_now, :now
      def now
        KLANG_FIXED_TIME
      end
    end
  end

  class Date
    class << self
      alias_method :_original_today, :today
      def today
        KLANG_FIXED_TIME.to_date
      end
    end
  end

  class Time
    class << self
      alias_method :_original_now, :now
      def now
        KLANG_FIXED_TIME.to_time
      end
    end
  end
end
