#!/bin/bash

# Local acceptance tests - runs .expected.{ruby,js} files directly
# This avoids Docker dependencies for most tests

set -e

TEST_DIR="test"
FAILED=0
PASSED=0

# Files that require variables - skip for local testing
SKIP_FILES=("member-access" "variables")

should_skip() {
    local file=$1
    for skip in "${SKIP_FILES[@]}"; do
        if [[ $(basename "$file") == "$skip"* ]]; then
            return 0
        fi
    done
    return 1
}

echo "Running local acceptance tests..."
echo ""

# Test Ruby files
echo "Ruby Tests:"
for file in "$TEST_DIR"/*.expected.ruby; do
    if should_skip "$file"; then
        echo "  ⊘ $(basename "$file") (skipped - requires variables)"
        continue
    fi

    if ruby "$file" 2>/dev/null; then
        echo "  ✓ $(basename "$file")"
        ((PASSED++))
    else
        echo "  ✗ $(basename "$file")"
        ((FAILED++))
    fi
done

echo ""

# Test JavaScript files
echo "JavaScript Tests:"
for file in "$TEST_DIR"/*.expected.js; do
    if should_skip "$file"; then
        echo "  ⊘ $(basename "$file") (skipped - requires variables)"
        continue
    fi

    # Run each line separately to avoid IIFE issues
    if while IFS= read -r line; do
        [ -n "$line" ] && echo "$line" | node - || exit 1
    done < "$file" 2>/dev/null; then
        echo "  ✓ $(basename "$file")"
        ((PASSED++))
    else
        echo "  ✗ $(basename "$file")"
        ((FAILED++))
    fi
done

echo ""
echo "Results: $PASSED passed, $FAILED failed"

if [ $FAILED -gt 0 ]; then
    exit 1
fi
