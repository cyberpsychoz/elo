require 'webrick'
require 'json'
require 'date'
require 'active_support/duration'
require 'active_support/core_ext/numeric/time'

server = WEBrick::HTTPServer.new(Port: 3001, BindAddress: '0.0.0.0')

server.mount_proc '/eval' do |req, res|
  begin
    data = JSON.parse(req.body)
    expression = data['expression']
    variables = data['variables'] || {}

    # Helper to deep convert hash keys to symbols
    def deep_symbolize_keys(obj)
      case obj
      when Hash
        obj.transform_keys(&:to_sym).transform_values { |v| deep_symbolize_keys(v) }
      when Array
        obj.map { |item| deep_symbolize_keys(item) }
      else
        obj
      end
    end

    # Define variables in the binding
    binding_context = binding
    variables.each do |key, value|
      symbolized_value = deep_symbolize_keys(value)
      binding_context.local_variable_set(key.to_sym, symbolized_value)
    end

    # Evaluate the expression
    result = binding_context.eval(expression)

    # Convert result to JSON-friendly format
    result_value = case result
    when Date
      result.iso8601
    when DateTime
      result.iso8601
    when ActiveSupport::Duration
      result.iso8601
    when TrueClass, FalseClass, Numeric, String
      result
    else
      result.to_s
    end

    res.status = 200
    res['Content-Type'] = 'application/json'
    res.body = { success: true, result: result_value }.to_json
  rescue => e
    res.status = 400
    res['Content-Type'] = 'application/json'
    res.body = { success: false, error: e.message }.to_json
  end
end

server.mount_proc '/health' do |req, res|
  res.status = 200
  res['Content-Type'] = 'application/json'
  res.body = { status: 'ok' }.to_json
end

trap('INT') { server.shutdown }

puts "Ruby evaluation server running on port 3001"
server.start
