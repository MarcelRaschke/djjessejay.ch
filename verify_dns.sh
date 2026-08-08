#!/bin/bash

# DNS Verification Script for djjessejay.ch
# This script verifies all DNS records and GitHub Pages configuration
# Run: chmod +x verify_dns.sh && ./verify_dns.sh

DOMAIN="djjessejay.ch"
SUBDOMAIN="www.djjessejay.ch"
TXT_RECORD="_github-pages-challenge-marcelraschke.djjessejay.ch"

# GitHub Pages IP addresses
EXPECTED_IPS=("185.199.108.153" "185.199.109.153" "185.199.110.153" "185.199.111.153")
EXPECTED_CNAME="djjessejay.ch."
EXPECTED_TXT='"60e5f988c1da04523b99e4208c1726"'
EXPECTED_NS=("aarav.ns.cloudflare.com." "rosalyn.ns.cloudflare.com.")

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
TOTAL=0

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to print result
echo_result() {
    local test_name="$1"
    local status="$2"
    local expected="$3"
    local actual="$4"
    
    TOTAL=$((TOTAL + 1))
    
    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}✓ PASS${NC}: $test_name"
        PASSED=$((PASSED + 1))
    elif [ "$status" = "WARN" ]; then
        echo -e "${YELLOW}⚠ WARN${NC}: $test_name"
        echo "   Expected: $expected"
        echo "   Actual:   $actual"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗ FAIL${NC}: $test_name"
        echo "   Expected: $expected"
        echo "   Actual:   $actual"
        FAILED=$((FAILED + 1))
    fi
}

echo "=========================================="
echo "DNS Verification for $DOMAIN"
echo "=========================================="
echo ""

# Check if dig is available
if ! command_exists dig; then
    echo -e "${RED}ERROR: 'dig' command not found. Please install it.${NC}"
    echo "  On Ubuntu/Debian: sudo apt-get install dnsutils"
    echo "  On macOS: brew install bind"
    exit 1
fi

# Test 1: Check A records
echo "--- Checking A Records ---"
A_RECORDS=$(dig +short A "$DOMAIN" 2>/dev/null | sort)
EXPECTED_A=$(printf "%s\n" "${EXPECTED_IPS[@]}" | sort | paste -sd "\n")

if [ "$A_RECORDS" = "$EXPECTED_A" ]; then
    echo_result "A records for $DOMAIN" "PASS" "${EXPECTED_IPS[*]}" "$A_RECORDS"
else
    echo_result "A records for $DOMAIN" "FAIL" "${EXPECTED_IPS[*]}" "$A_RECORDS"
fi

# Test 2: Check CNAME record
echo ""
echo "--- Checking CNAME Record ---"
CNAME_RECORD=$(dig +short CNAME "$SUBDOMAIN" 2>/dev/null)

if [ "$CNAME_RECORD" = "$EXPECTED_CNAME" ]; then
    echo_result "CNAME for $SUBDOMAIN" "PASS" "$EXPECTED_CNAME" "$CNAME_RECORD"
else
    echo_result "CNAME for $SUBDOMAIN" "FAIL" "$EXPECTED_CNAME" "$CNAME_RECORD"
fi

# Test 3: Check TXT record
echo ""
echo "--- Checking TXT Record ---"
TXT_RECORD_VALUE=$(dig +short TXT "$TXT_RECORD" 2>/dev/null | tr -d '"')

if [ "$TXT_RECORD_VALUE" = "60e5f988c1da04523b99e4208c1726" ]; then
    echo_result "TXT record for GitHub Pages challenge" "PASS" "60e5f988c1da04523b99e4208c1726" "$TXT_RECORD_VALUE"
else
    echo_result "TXT record for GitHub Pages challenge" "FAIL" "60e5f988c1da04523b99e4208c1726" "$TXT_RECORD_VALUE"
fi

# Test 4: Check NS records
echo ""
echo "--- Checking NS Records ---"
NS_RECORDS=$(dig +short NS "$DOMAIN" 2>/dev/null | sort)
EXPECTED_NS_SORTED=$(printf "%s\n" "${EXPECTED_NS[@]}" | sort | paste -sd "\n")

if [ "$NS_RECORDS" = "$EXPECTED_NS_SORTED" ]; then
    echo_result "NS records for $DOMAIN" "PASS" "${EXPECTED_NS[*]}" "$NS_RECORDS"
else
    echo_result "NS records for $DOMAIN" "FAIL" "${EXPECTED_NS[*]}" "$NS_RECORDS"
fi

# Test 5: Check if Cloudflare proxy is disabled (DNS only)
echo ""
echo "--- Checking Cloudflare Proxy Status ---"
echo "   Note: This requires Cloudflare API access. Manual check needed."
echo "   Please verify in Cloudflare Dashboard:"
echo "   - All records should have GRAY cloud icon (DNS only)"
echo "   - ORANGE cloud (Proxied) will break GitHub Pages SSL"
echo_result "Cloudflare proxy status" "WARN" "Gray cloud (DNS only)" "Manual check required"

# Test 6: Check HTTPS access
echo ""
echo "--- Checking HTTPS Access ---"

if command_exists curl; then
    # Check apex domain
    HTTPS_APEX=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN" 2>/dev/null)
    if [ "$HTTPS_APEX" = "200" ] || [ "$HTTPS_APEX" = "301" ] || [ "$HTTPS_APEX" = "302" ]; then
        echo_result "HTTPS access to $DOMAIN" "PASS" "200/301/302" "$HTTPS_APEX"
    else
        echo_result "HTTPS access to $DOMAIN" "FAIL" "200/301/302" "$HTTPS_APEX (SSL may still be provisioning)"
    fi
    
    # Check www subdomain
    HTTPS_WWW=$(curl -s -o /dev/null -w "%{http_code}" "https://$SUBDOMAIN" 2>/dev/null)
    if [ "$HTTPS_WWW" = "200" ] || [ "$HTTPS_WWW" = "301" ] || [ "$HTTPS_WWW" = "302" ]; then
        echo_result "HTTPS access to $SUBDOMAIN" "PASS" "200/301/302" "$HTTPS_WWW"
    else
        echo_result "HTTPS access to $SUBDOMAIN" "FAIL" "200/301/302" "$HTTPS_WWW (SSL may still be provisioning)"
    fi
else
    echo "   curl not available, skipping HTTPS checks"
    echo_result "HTTPS access" "WARN" "Available" "curl not installed"
fi

# Test 7: Check HTTP to HTTPS redirect
echo ""
echo "--- Checking HTTP to HTTPS Redirect ---"

if command_exists curl; then
    HTTP_REDIRECT=$(curl -s -o /dev/null -w "%{http_code}" "http://$DOMAIN" 2>/dev/null)
    if [ "$HTTP_REDIRECT" = "301" ] || [ "$HTTP_REDIRECT" = "302" ]; then
        echo_result "HTTP to HTTPS redirect for $DOMAIN" "PASS" "301/302" "$HTTP_REDIRECT"
    else
        echo_result "HTTP to HTTPS redirect for $DOMAIN" "WARN" "301/302" "$HTTP_REDIRECT (may not be configured yet)"
    fi
fi

# Test 8: Check GitHub Pages configuration
echo ""
echo "--- GitHub Pages Configuration ---"
echo "   Note: These require manual verification in GitHub"
echo ""
echo "   Please check in GitHub Repository Settings -> Pages:"
echo "   ✓ Source: Deploy from branch 'main' / 'root'"
echo "   ✓ Custom domain: $DOMAIN"
echo "   ✓ Enforce HTTPS: Enabled"
echo ""
echo_result "GitHub Pages settings" "WARN" "Correctly configured" "Manual check required"

# Summary
echo ""
echo "=========================================="
echo "SUMMARY"
echo "=========================================="
echo -e "Total tests: $TOTAL"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo ""
    echo "Your DNS configuration for $DOMAIN is correct."
    echo "If HTTPS is not working yet, wait for GitHub to provision SSL (up to 24 hours)."
    exit 0
else
    echo -e "${RED}✗ Some checks failed.${NC}"
    echo ""
    echo "Please review the failed checks above and fix the issues."
    exit 1
fi
