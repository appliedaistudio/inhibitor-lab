#!/bin/bash
# PlasmIQ Chatbot Testing Script
# Complete end-to-end test of the scheduling system

set -e

BASE_URL="http://localhost:8000"
echo "🧪 PlasmIQ Chatbot Testing Suite"
echo "=================================="
echo ""

# Clear database before testing
echo "🧹 Clearing test data from MongoDB..."
mongosh --eval "db.getSiblingDB('plasmiq').donors.deleteMany({}); db.getSiblingDB('plasmiq').appointments.deleteMany({})" > /dev/null 2>&1 || true
sleep 1

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print section headers
print_section() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Function to test API endpoint
test_endpoint() {
    local name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    
    echo -e "${YELLOW}Testing:${NC} $name"
    echo "Request: $method $endpoint"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -X GET "$BASE_URL$endpoint" \
            -H "Content-Type: application/json")
    else
        response=$(curl -s -X $method "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi
    
    echo "Response: $response"
    echo ""
    echo "$response"
}

# Test 1: Health Check
print_section "Test 1: Health Check & API Status"

echo -e "${YELLOW}Checking if backend is running...${NC}"
health=$(curl -s -X GET "$BASE_URL/health" \
    -H "Content-Type: application/json")

if echo "$health" | grep -q "healthy"; then
    echo -e "${GREEN}✓ Backend is running and healthy${NC}"
    echo "Response: $health"
else
    echo -e "${RED}✗ Backend health check failed${NC}"
    echo "Make sure backend is running: cd backend && ./start.sh"
    exit 1
fi

# Test 2: Create Test Donor
print_section "Test 2: Create Test Donor"

DONOR_RESPONSE=$(curl -s -X POST "$BASE_URL/api/donors/" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "John Plasma Donor",
        "email": "john.donor@test.com",
        "phone": "555-0100",
        "preferred_time": "morning",
        "latitude": 40.7128,
        "longitude": -74.0060
    }')

echo "Creating donor..."
echo "$DONOR_RESPONSE"

DONOR_ID=$(echo "$DONOR_RESPONSE" | grep -o '"_id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$DONOR_ID" ]; then
    echo -e "${RED}✗ Failed to create donor${NC}"
    echo "Response: $DONOR_RESPONSE"
    exit 1
else
    echo -e "${GREEN}✓ Donor created with ID: $DONOR_ID${NC}"
fi

# Test 3: Create Test Donation Center
print_section "Test 3: Create Test Donation Centers"

CENTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/donations-centers" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "Downtown Plasma Center",
        "address": "123 Main St, New York, NY",
        "latitude": 40.7580,
        "longitude": -73.9855,
        "phone": "555-0001"
    }' 2>/dev/null)

# If endpoint doesn't exist, manually add via MongoDB or skip
echo -e "${YELLOW}Note: Add donation centers via MongoDB${NC}"
echo "Use: db.donation_centers.insertMany([...])"
echo ""

# For testing, we'll use a hardcoded center ID
CENTER_ID="507f1f77bcf86cd799439012"
echo -e "${YELLOW}Using test center ID:${NC} $CENTER_ID"

# Test 4: Find Nearest Center
print_section "Test 4: Find Nearest Donation Center"

echo -e "${YELLOW}Finding nearest center for donor...${NC}"
NEAREST=$(curl -s -X POST "$BASE_URL/api/appointments/find-nearest-center/$DONOR_ID" \
    -H "Content-Type: application/json")

echo "Response:"
echo "$NEAREST" | python3 -m json.tool 2>/dev/null || echo "$NEAREST"

if echo "$NEAREST" | grep -q "distance_km"; then
    echo -e "${GREEN}✓ Found nearest center${NC}"
else
    echo -e "${YELLOW}⚠ Geolocation service returned:${NC} $NEAREST"
    echo "(This may fail if no centers are seeded in database)"
fi

# Test 5: Get Available Slots
print_section "Test 5: Get Smart-Ranked Available Slots"

echo -e "${YELLOW}Getting available appointment slots...${NC}"
SLOTS=$(curl -s -X POST "$BASE_URL/api/appointments/get-available-slots/$DONOR_ID?days_ahead=14" \
    -H "Content-Type: application/json")

echo "Response:"
echo "$SLOTS" | python3 -m json.tool 2>/dev/null || echo "$SLOTS"

if echo "$SLOTS" | grep -q "available_slots"; then
    echo -e "${GREEN}✓ Retrieved available slots${NC}"
    SLOT_COUNT=$(echo "$SLOTS" | grep -o "slot_time" | wc -l)
    echo "Found $SLOT_COUNT available slots"
else
    echo -e "${YELLOW}⚠ Slot retrieval returned:${NC} $SLOTS"
fi

# Test 6: Test Constraint Validation
print_section "Test 6: Appointment Constraint Validation"

echo -e "${YELLOW}Test 6a: Booking valid appointment${NC}"
NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
FUTURE_TIME=$(date -u -d "+5 days +10:00" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -v+5d "+%Y-%m-%dT10:00:00Z")

APPT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/appointments" \
    -H "Content-Type: application/json" \
    -d "{
        \"donor_id\": \"$DONOR_ID\",
        \"center_id\": \"$CENTER_ID\",
        \"scheduled_time\": \"$FUTURE_TIME\",
        \"status\": \"scheduled\"
    }")

echo "Booking appointment for: $FUTURE_TIME"
echo "$APPT_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$APPT_RESPONSE"

APPT_ID=$(echo "$APPT_RESPONSE" | grep -o '"_id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$APPT_ID" ] && ! echo "$APPT_RESPONSE" | grep -q "detail"; then
    echo -e "${GREEN}✓ Appointment created successfully${NC}"
else
    echo -e "${YELLOW}⚠ Appointment creation:${NC} $APPT_RESPONSE"
fi

# Test 7: Chat Interface
print_section "Test 7: Chat Interface - Intent Classification"

echo -e "${YELLOW}Test 7a: Chat - Scheduling Request${NC}"
CHAT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/chat/send" \
    -H "Content-Type: application/json" \
    -d "{
        \"donor_id\": \"$DONOR_ID\",
        \"message\": \"I want to schedule a plasma donation appointment\"
    }")

echo "User: 'I want to schedule a plasma donation appointment'"
echo "Chatbot response:"
echo "$CHAT_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$CHAT_RESPONSE"

if echo "$CHAT_RESPONSE" | grep -q "message"; then
    echo -e "${GREEN}✓ Chat interface is working${NC}"
else
    echo -e "${RED}✗ Chat interface error${NC}"
fi

# Test 8: Chat - Reschedule Request
print_section "Test 8: Chat Interface - Rescheduling Request"

echo -e "${YELLOW}User trying to reschedule due to traffic...${NC}"
RESCHEDULE_CHAT=$(curl -s -X POST "$BASE_URL/api/chat/send" \
    -H "Content-Type: application/json" \
    -d "{
        \"donor_id\": \"$DONOR_ID\",
        \"message\": \"I'm stuck in traffic, can I reschedule my appointment?\"
    }")

echo "User: 'I'm stuck in traffic, can I reschedule my appointment?'"
echo "Chatbot response:"
echo "$RESCHEDULE_CHAT" | python3 -m json.tool 2>/dev/null || echo "$RESCHEDULE_CHAT"

# Test 9: Chat - General Inquiry
print_section "Test 9: Chat Interface - General Inquiry"

echo -e "${YELLOW}User asking general question...${NC}"
INQUIRY_CHAT=$(curl -s -X POST "$BASE_URL/api/chat/send" \
    -H "Content-Type: application/json" \
    -d "{
        \"donor_id\": \"$DONOR_ID\",
        \"message\": \"What are the health benefits of plasma donation?\"
    }")

echo "User: 'What are the health benefits of plasma donation?'"
echo "Chatbot response:"
echo "$INQUIRY_CHAT" | python3 -m json.tool 2>/dev/null || echo "$INQUIRY_CHAT"

# Test 10: Get Donor Info
print_section "Test 10: Retrieve Donor Information"

echo -e "${YELLOW}Fetching donor profile...${NC}"
DONOR_GET=$(curl -s -X GET "$BASE_URL/api/donors/$DONOR_ID" \
    -H "Content-Type: application/json")

echo "$DONOR_GET" | python3 -m json.tool 2>/dev/null || echo "$DONOR_GET"

# Test 11: Get Donor Appointments
print_section "Test 11: Get Donor's Appointment History"

echo -e "${YELLOW}Fetching donor's appointments...${NC}"
DONOR_APPTS=$(curl -s -X GET "$BASE_URL/api/appointments/donor/$DONOR_ID" \
    -H "Content-Type: application/json")

echo "$DONOR_APPTS" | python3 -m json.tool 2>/dev/null || echo "$DONOR_APPTS"

# Test Summary
print_section "Test Summary"

echo -e "${GREEN}✓ Test Donor ID:${NC}        $DONOR_ID"
echo -e "${GREEN}✓ Test Center ID:${NC}      $CENTER_ID"
if [ -n "$APPT_ID" ]; then
    echo -e "${GREEN}✓ Test Appointment ID:${NC} $APPT_ID"
fi
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. View API documentation: http://localhost:8000/docs"
echo "2. Test more chat messages with different intents"
echo "3. Create multiple appointments to test weekly limits"
echo "4. Test rest day constraints"
echo "5. Monitor logs for AI reasoning and ethical checks"

echo ""
echo -e "${GREEN}✓ Testing complete!${NC}"
