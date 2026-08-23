#!/usr/bin/env ruby
# frozen_string_literal: true

require "json"
require "yaml"
require "set"

ERRORS = []

STATUS_VALUES_REQUIRED = %w[
  unreviewed
  possible
  probable
  supported
  verified
  contradicted
  deprecated
].freeze

REQUIRED_CLAIM_FIELDS = %w[
  id
  subject
  predicate
  status
  confidence
  sourceClass
  sources
  valid_time
  observed_time
  review_state
].freeze

REQUIRED_TIME_FIELDS = %w[start end precision].freeze


def error(message)
  ERRORS << message
end


def load_json(path)
  JSON.parse(File.read(path))
rescue JSON::ParserError => e
  error("#{path}: invalid JSON: #{e.message}")
  {}
end


def load_yaml(path)
  YAML.load_file(path)
rescue Psych::SyntaxError => e
  error("#{path}: invalid YAML: #{e.message}")
  {}
end

schema = load_yaml("archive/schema.yml")
provenance = load_json("website/provenance.json")

status_values = Array(schema["status_values"])
missing_statuses = STATUS_VALUES_REQUIRED - status_values
error("archive/schema.yml: missing status values: #{missing_statuses.join(', ')}") unless missing_statuses.empty?

source_classes = schema["source_classes"] || {}
source_class_keys = source_classes.keys
expected_source_order = %w[P0 P1 P2 P3 P4 P5 P6 P7 P8]
unless source_class_keys == expected_source_order
  error("archive/schema.yml: source_classes must be ordered #{expected_source_order.join(' -> ')}")
end

required_common = Array(schema.dig("required_archive_fields", "common"))
required_temporal = Array(schema.dig("required_archive_fields", "temporal"))
set_template = schema["set_template"] || {}
assertion_template = schema["assertion_template"] || {}

(required_common + required_temporal).each do |field|
  error("archive/schema.yml: set_template missing required field #{field}") unless set_template.key?(field)
end

%w[id type title assertion_id subject predicate value valid_time observed_time confidence status sources review_state].each do |field|
  error("archive/schema.yml: assertion_template missing field #{field}") unless assertion_template.key?(field)
end

[set_template, assertion_template].each do |template|
  next unless template.key?("valid_time")

  valid_time = template["valid_time"] || {}
  REQUIRED_TIME_FIELDS.each do |field|
    error("archive/schema.yml: #{template['type'] || 'template'} valid_time missing #{field}") unless valid_time.key?(field)
  end
end

policy_classes = provenance.dig("policy", "classes") || {}
unless policy_classes.keys == source_class_keys
  error("website/provenance.json: policy.classes must match archive/schema.yml source_classes")
end

claims = Array(provenance["claims"])
claim_ids = claims.map { |claim| claim["id"] }.compact.to_set

claims.each do |claim|
  id = claim["id"] || "<missing id>"

  REQUIRED_CLAIM_FIELDS.each do |field|
    error("website/provenance.json claim #{id}: missing #{field}") unless claim.key?(field)
  end

  status = claim["status"]
  error("website/provenance.json claim #{id}: invalid status #{status.inspect}") unless status_values.include?(status)

  confidence = claim["confidence"]
  unless confidence.is_a?(Numeric) && confidence >= 0.0 && confidence <= 1.0
    error("website/provenance.json claim #{id}: confidence must be a number between 0.0 and 1.0")
  end

  source_class = claim["sourceClass"]
  error("website/provenance.json claim #{id}: invalid sourceClass #{source_class.inspect}") unless source_class_keys.include?(source_class)

  sources = claim["sources"]
  unless sources.is_a?(Array) && !sources.empty?
    error("website/provenance.json claim #{id}: sources must be a non-empty array")
  end

  valid_time = claim["valid_time"]
  unless valid_time.is_a?(Hash)
    error("website/provenance.json claim #{id}: valid_time must be an object")
  else
    REQUIRED_TIME_FIELDS.each do |field|
      error("website/provenance.json claim #{id}: valid_time missing #{field}") unless valid_time.key?(field)
    end
  end

  observed_time = claim["observed_time"]
  unless observed_time.is_a?(String) && observed_time.match?(/\A\d{4}-\d{2}-\d{2}\z/)
    error("website/provenance.json claim #{id}: observed_time must be YYYY-MM-DD")
  end
end

claim_refs = provenance.dig("identity", "claimRefs") || {}
claim_refs.each do |name, ref|
  error("website/provenance.json identity.claimRefs.#{name}: unknown claim id #{ref}") unless claim_ids.include?(ref)
end

if ERRORS.empty?
  puts "Provenance semantic validation OK"
else
  warn ERRORS.map { |message| "- #{message}" }.join("\n")
  exit 1
end
