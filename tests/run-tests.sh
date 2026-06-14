#!/bin/bash
# AUTO-SMART — chạy test suite
# Cách dùng: bash tests/run-tests.sh [URL]
# Mặc định: http://localhost:3000

BASE="${1:-http://localhost:3000}"
PASS=0
FAIL=0
FAIL_LIST=()

GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

ok()   { echo -e "${GREEN}✅ $1${NC}"; ((PASS++)); }
fail() { echo -e "${RED}❌ $1${NC}"; ((FAIL++)); FAIL_LIST+=("$1"); }
head() { echo -e "${YELLOW}\n━━━ $1 ━━━${NC}"; }

ADMIN_COOKIE="user_role=ADMIN; active_branch_id=1"
BRANCH_ID=""
USER_ID=""
PRODUCT_ID=""
VEHICLE_ID=""
TECH_ID=""

req() {
  local method="$1" path="$2" body="$3" cookie="${4:-$ADMIN_COOKIE}"
  if [ -n "$body" ]; then
    curl -s -o /tmp/api_resp.json -w "%{http_code}" -X "$method" \
      -H "Content-Type: application/json" \
      -H "Cookie: $cookie" \
      -d "$body" \
      "$BASE$path"
  else
    curl -s -o /tmp/api_resp.json -w "%{http_code}" -X "$method" \
      -H "Content-Type: application/json" \
      -H "Cookie: $cookie" \
      "$BASE$path"
  fi
}

json() { cat /tmp/api_resp.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('$1',''))" 2>/dev/null; }
json_arr() { cat /tmp/api_resp.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('$1',[])))" 2>/dev/null; }

# ─── AUTH ───────────────────────────────────────────────────
head "AUTH"

STATUS=$(req POST "/api/auth/login" '{"email":"admin@autosmart.vn","password":"admin123"}' "")
[ "$STATUS" = "200" ] && ok "Đăng nhập đúng → 200" || fail "Đăng nhập đúng → 200 (got $STATUS)"

STATUS=$(req POST "/api/auth/login" '{"email":"admin@autosmart.vn","password":"wrong"}' "")
[ "$STATUS" = "401" ] && ok "Đăng nhập sai password → 401" || fail "Đăng nhập sai password → 401 (got $STATUS)"

STATUS=$(req POST "/api/auth/login" '{"email":"notexist@x.vn","password":"x"}' "")
[ "$STATUS" = "401" ] && ok "Email không tồn tại → 401" || fail "Email không tồn tại → 401 (got $STATUS)"

# ─── BRANCHES ───────────────────────────────────────────────
head "BRANCHES"

STATUS=$(req GET "/api/branches")
[ "$STATUS" = "200" ] && ok "GET /api/branches → 200" || fail "GET /api/branches → 200 (got $STATUS)"

TS=$(date +%s)
STATUS=$(req POST "/api/branches" "{\"name\":\"Test Branch $TS\",\"address\":\"123 Test\",\"phone\":\"0900000000\"}")
BRANCH_ID=$(json "id")
[ "$STATUS" = "201" ] && ok "POST /api/branches → 201" || fail "POST /api/branches → 201 (got $STATUS)"

if [ -n "$BRANCH_ID" ] && [ "$BRANCH_ID" != "None" ]; then
  STATUS=$(req PATCH "/api/branches/$BRANCH_ID" '{"name":"Test Branch Updated"}')
  [ "$STATUS" = "200" ] && ok "PATCH /api/branches/$BRANCH_ID → 200" || fail "PATCH /api/branches → 200 (got $STATUS)"
  
  STATUS=$(req DELETE "/api/branches/$BRANCH_ID")
  [ "$STATUS" = "200" ] && ok "DELETE /api/branches/$BRANCH_ID → 200" || fail "DELETE /api/branches → 200 (got $STATUS)"
fi

# ─── USERS ──────────────────────────────────────────────────
head "USERS"

STATUS=$(req GET "/api/users")
[ "$STATUS" = "200" ] && ok "GET /api/users → 200" || fail "GET /api/users → 200 (got $STATUS)"

TS=$(date +%s)
STATUS=$(req POST "/api/users" "{\"name\":\"Test User\",\"email\":\"test_${TS}@test.vn\",\"password\":\"test123\",\"role\":\"CRM\",\"branchIds\":[1]}")
USER_ID=$(json "id" 2>/dev/null || cat /tmp/api_resp.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('user',{}).get('id',''))" 2>/dev/null)
[ "$STATUS" = "201" ] && ok "POST /api/users → 201" || fail "POST /api/users → 201 (got $STATUS)"

if [ -n "$USER_ID" ] && [ "$USER_ID" != "None" ] && [ "$USER_ID" != "" ]; then
  STATUS=$(req PATCH "/api/users/$USER_ID" '{"name":"Test User Updated"}')
  [ "$STATUS" = "200" ] && ok "PATCH /api/users → 200" || fail "PATCH /api/users → 200 (got $STATUS)"
  STATUS=$(req DELETE "/api/users/$USER_ID")
  [ "$STATUS" = "200" ] && ok "DELETE /api/users → 200" || fail "DELETE /api/users → 200 (got $STATUS)"
fi

# ─── INVENTORY ──────────────────────────────────────────────
head "INVENTORY"

STATUS=$(req GET "/api/inventory")
TOTAL_PAGES=$(cat /tmp/api_resp.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('totalPages','MISSING'))" 2>/dev/null)
[ "$STATUS" = "200" ] && ok "GET /api/inventory → 200" || fail "GET /api/inventory → 200 (got $STATUS)"
[ "$TOTAL_PAGES" != "MISSING" ] && ok "Phân trang: totalPages tồn tại ($TOTAL_PAGES)" || fail "Phân trang: thiếu totalPages"

STATUS=$(req GET "/api/inventory?page=1&limit=5")
PROD_COUNT=$(cat /tmp/api_resp.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('products',[])))" 2>/dev/null)
CUR_PAGE=$(cat /tmp/api_resp.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('currentPage',''))" 2>/dev/null)
[ "$STATUS" = "200" ] && [ "$PROD_COUNT" -le 5 ] 2>/dev/null && ok "Phân trang ?page=1&limit=5 → ≤5 items" || fail "Phân trang limit=5 không hoạt động (nhận $PROD_COUNT)"
[ "$CUR_PAGE" = "1" ] && ok "currentPage = 1" || fail "currentPage phải là 1 (got $CUR_PAGE)"

TS=$(date +%s)
STATUS=$(req POST "/api/inventory" "{\"sku\":\"TEST-$TS\",\"name\":\"Lọc Test $TS\",\"category\":\"Lọc\",\"unit\":\"Cái\",\"stockCount\":10,\"stockMin\":2,\"stockMax\":50,\"prices\":[{\"type\":\"RETAIL\",\"amount\":120000},{\"type\":\"WHOLESALE\",\"amount\":100000},{\"type\":\"INSURANCE\",\"amount\":110000}]}")
PRODUCT_ID=$(json "id")
[ "$STATUS" = "201" ] && ok "POST /api/inventory → 201" || fail "POST /api/inventory → 201 (got $STATUS)"

if [ -n "$PRODUCT_ID" ] && [ "$PRODUCT_ID" != "None" ]; then
  STATUS=$(req PATCH "/api/inventory/$PRODUCT_ID" '{"stockMin":3}')
  [ "$STATUS" = "200" ] && ok "PATCH /api/inventory → 200" || fail "PATCH /api/inventory → 200 (got $STATUS)"
  STATUS=$(req DELETE "/api/inventory/$PRODUCT_ID")
  [ "$STATUS" = "200" ] && ok "DELETE /api/inventory → 200" || fail "DELETE /api/inventory → 200 (got $STATUS)"
fi

# ─── CRM ────────────────────────────────────────────────────
head "CRM"

STATUS=$(req GET "/api/crm")
[ "$STATUS" = "200" ] && ok "GET /api/crm → 200" || fail "GET /api/crm → 200 (got $STATUS)"

TS=$(date +%s)
STATUS=$(req POST "/api/crm" "{\"type\":\"customer\",\"name\":\"KH Test\",\"phone\":\"090${TS: -7}\",\"source\":\"WALKIN\"}")
CUST_ID=$(json "id")
[ "$STATUS" = "201" ] && ok "POST /api/crm (customer) → 201" || fail "POST /api/crm (customer) → 201 (got $STATUS)"

TS=$(date +%s)
STATUS=$(req POST "/api/crm" "{\"type\":\"lead\",\"name\":\"Lead Test\",\"phone\":\"091${TS: -7}\",\"source\":\"FACEBOOK\",\"interest\":\"Camry\"}")
LEAD_ID=$(json "id")
[ "$STATUS" = "201" ] && ok "POST /api/crm (lead) → 201" || fail "POST /api/crm (lead) → 201 (got $STATUS)"

if [ -n "$LEAD_ID" ] && [ "$LEAD_ID" != "None" ]; then
  STATUS=$(req PATCH "/api/crm/$LEAD_ID" '{"type":"lead","status":"POTENTIAL"}')
  [ "$STATUS" = "200" ] && ok "PATCH lead status → 200" || fail "PATCH lead status → 200 (got $STATUS)"
  STATUS=$(req DELETE "/api/crm/$LEAD_ID" '{"type":"lead"}')
  [ "$STATUS" = "200" ] && ok "DELETE lead → 200" || fail "DELETE lead → 200 (got $STATUS)"
fi
if [ -n "$CUST_ID" ] && [ "$CUST_ID" != "None" ]; then
  STATUS=$(req DELETE "/api/crm/$CUST_ID" '{"type":"customer"}')
  [ "$STATUS" = "200" ] && ok "DELETE customer → 200" || fail "DELETE customer → 200 (got $STATUS)"
fi

# ─── WORKSHOP ───────────────────────────────────────────────
head "WORKSHOP"

STATUS=$(req GET "/api/workshop")
[ "$STATUS" = "200" ] && ok "GET /api/workshop → 200" || fail "GET /api/workshop → 200 (got $STATUS)"

STATUS=$(req GET "/api/workshop/99999")
[ "$STATUS" = "404" ] && ok "GET /api/workshop/99999 → 404" || fail "GET /api/workshop/99999 → 404 (got $STATUS)"

# Test GET single RO (nếu có)
RO_ID=$(cat /tmp/api_resp.json | python3 -c "import sys,json; d=json.load(sys.stdin); ros=d.get('repairOrders',[]); print(ros[0]['id'] if ros else '')" 2>/dev/null)
STATUS=$(req GET "/api/workshop")
RO_ID=$(cat /tmp/api_resp.json | python3 -c "import sys,json; d=json.load(sys.stdin); ros=d.get('repairOrders',[]); print(ros[0]['id'] if ros else '')" 2>/dev/null)
if [ -n "$RO_ID" ] && [ "$RO_ID" != "" ]; then
  STATUS=$(req GET "/api/workshop/$RO_ID")
  BRANCH_FIELD=$(cat /tmp/api_resp.json | python3 -c "import sys,json; d=json.load(sys.stdin); print('ok' if 'branch' in d else 'missing')" 2>/dev/null)
  ITEMS_FIELD=$(cat /tmp/api_resp.json | python3 -c "import sys,json; d=json.load(sys.stdin); print('ok' if 'items' in d else 'missing')" 2>/dev/null)
  [ "$STATUS" = "200" ] && ok "GET /api/workshop/$RO_ID → 200 (invoice data)" || fail "GET /api/workshop/$RO_ID → 200 (got $STATUS)"
  [ "$BRANCH_FIELD" = "ok" ] && ok "Invoice API: branch field có mặt" || fail "Invoice API: thiếu branch field"
  [ "$ITEMS_FIELD" = "ok" ] && ok "Invoice API: items field có mặt" || fail "Invoice API: thiếu items field"
fi

# ─── TECHNICIANS ────────────────────────────────────────────
head "TECHNICIANS"

STATUS=$(req GET "/api/technicians")
[ "$STATUS" = "200" ] && ok "GET /api/technicians → 200" || fail "GET /api/technicians → 200 (got $STATUS)"

TS=$(date +%s)
STATUS=$(req POST "/api/technicians" "{\"code\":\"KTV-$TS\",\"name\":\"KTV Test\",\"phone\":\"0909000001\",\"commissionRate\":10,\"status\":\"IDLE\"}")
TECH_ID=$(json "id")
[ "$STATUS" = "201" ] && ok "POST /api/technicians → 201" || fail "POST /api/technicians → 201 (got $STATUS)"

if [ -n "$TECH_ID" ] && [ "$TECH_ID" != "None" ]; then
  STATUS=$(req PATCH "/api/technicians/$TECH_ID" '{"commissionRate":12}')
  COMM=$(cat /tmp/api_resp.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('commissionRate',''))" 2>/dev/null)
  [ "$STATUS" = "200" ] && ok "PATCH technician commissionRate → 200" || fail "PATCH technician → 200 (got $STATUS)"
  [ "$COMM" = "12.0" ] || [ "$COMM" = "12" ] && ok "commissionRate cập nhật đúng = 12" || fail "commissionRate sai = $COMM"
  STATUS=$(req DELETE "/api/technicians/$TECH_ID")
  [ "$STATUS" = "200" ] && ok "DELETE technician → 200" || fail "DELETE technician → 200 (got $STATUS)"
fi

# ─── SALES ──────────────────────────────────────────────────
head "SALES — Kho xe"

STATUS=$(req GET "/api/sales")
[ "$STATUS" = "200" ] && ok "GET /api/sales → 200" || fail "GET /api/sales → 200 (got $STATUS)"

TS=$(date +%s)
STATUS=$(req POST "/api/sales" "{\"vin\":\"VIN-TEST-$TS\",\"model\":\"Toyota Test\",\"variant\":\"1.5G\",\"color\":\"Đen\",\"year\":2024,\"listPrice\":800000000,\"floorPrice\":750000000,\"status\":\"AVAILABLE\"}")
VEHICLE_ID=$(json "id")
[ "$STATUS" = "201" ] && ok "POST /api/sales → 201" || fail "POST /api/sales → 201 (got $STATUS)"

if [ -n "$VEHICLE_ID" ] && [ "$VEHICLE_ID" != "None" ]; then
  STATUS=$(req PATCH "/api/sales/$VEHICLE_ID" '{"status":"RESERVED"}')
  VEH_STATUS=$(json "status")
  [ "$STATUS" = "200" ] && ok "PATCH vehicle status → 200" || fail "PATCH vehicle → 200 (got $STATUS)"
  [ "$VEH_STATUS" = "RESERVED" ] && ok "Vehicle status = RESERVED" || fail "Vehicle status sai = $VEH_STATUS"
  STATUS=$(req DELETE "/api/sales/$VEHICLE_ID")
  [ "$STATUS" = "200" ] && ok "DELETE vehicle → 200" || fail "DELETE vehicle → 200 (got $STATUS)"
fi

# ─── CONFIG / SETTINGS ──────────────────────────────────────
head "SETTINGS — Cấu hình hệ thống"

STATUS=$(req GET "/api/config")
CONF_EXISTS=$(cat /tmp/api_resp.json | python3 -c "import sys,json; d=json.load(sys.stdin); c=d.get('config',{}); print('ok' if 'zns_template' in c and 'lease_rate' in c else 'missing')" 2>/dev/null)
[ "$STATUS" = "200" ] && ok "GET /api/config → 200" || fail "GET /api/config → 200 (got $STATUS)"
[ "$CONF_EXISTS" = "ok" ] && ok "Config có đủ keys (zns_template, lease_rate)" || fail "Config thiếu keys"

STATUS=$(req POST "/api/config" '{"lease_rate":"8.5","points_rate":"2","zns_template":"Template [NAME] [PLATE]"}')
[ "$STATUS" = "200" ] && ok "POST /api/config (Admin) → 200" || fail "POST /api/config → 200 (got $STATUS)"

STATUS=$(req GET "/api/config")
LEASE=$(cat /tmp/api_resp.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('config',{}).get('lease_rate',''))" 2>/dev/null)
[ "$LEASE" = "8.5" ] && ok "Settings persist: lease_rate = 8.5 ✓" || fail "Settings không persist: lease_rate = $LEASE"

STATUS=$(req POST "/api/config" '{"lease_rate":"99"}' "user_role=CRM; active_branch_id=1")
[ "$STATUS" = "403" ] && ok "POST /api/config với role CRM → 403 ✓" || fail "Role protection: status=$STATUS (nên 403)"

# Khôi phục
req POST "/api/config" '{"lease_rate":"7.9","points_rate":"1"}' > /dev/null

# ─── BRANCH ISOLATION ───────────────────────────────────────
head "BRANCH ISOLATION"

STATUS=$(req GET "/api/inventory" "" "user_role=WAREHOUSE; active_branch_id=1")
WRONG=$(cat /tmp/api_resp.json | python3 -c "import sys,json; d=json.load(sys.stdin); prods=d.get('products',[]); wrong=[p for p in prods if p.get('branchId') and p['branchId']!=1]; print(len(wrong))" 2>/dev/null)
[ "$WRONG" = "0" ] && ok "Inventory isolation: branch 1 chỉ thấy data branch 1" || fail "Inventory isolation: lộ $WRONG sản phẩm sai branch"

STATUS=$(req GET "/api/crm" "" "user_role=CRM; active_branch_id=1")
WRONG=$(cat /tmp/api_resp.json | python3 -c "import sys,json; d=json.load(sys.stdin); custs=d.get('customers',[]); wrong=[c for c in custs if c.get('branchId') and c['branchId']!=1]; print(len(wrong))" 2>/dev/null)
[ "$WRONG" = "0" ] && ok "CRM isolation: branch 1 chỉ thấy khách hàng branch 1" || fail "CRM isolation: lộ $WRONG khách sai branch"

STATUS=$(req GET "/api/technicians" "" "user_role=WORKSHOP; active_branch_id=1")
WRONG=$(cat /tmp/api_resp.json | python3 -c "import sys,json; d=json.load(sys.stdin); techs=d.get('technicians',[]); wrong=[t for t in techs if t.get('branchId') and t['branchId']!=1]; print(len(wrong))" 2>/dev/null)
[ "$WRONG" = "0" ] && ok "Technician isolation: branch 1 chỉ thấy KTV branch 1" || fail "Technician isolation: lộ $WRONG KTV sai branch"

# ─── DASHBOARD & REPORTS ────────────────────────────────────
head "DASHBOARD & REPORTS"

STATUS=$(req GET "/api/dashboard")
[ "$STATUS" = "200" ] && ok "GET /api/dashboard → 200" || fail "GET /api/dashboard → 200 (got $STATUS)"

STATUS=$(req GET "/api/reports")
MONTHLY=$(cat /tmp/api_resp.json | python3 -c "import sys,json; d=json.load(sys.stdin); print('ok' if isinstance(d.get('monthlyRevenue'), list) else 'missing')" 2>/dev/null)
[ "$STATUS" = "200" ] && ok "GET /api/reports → 200" || fail "GET /api/reports → 200 (got $STATUS)"
[ "$MONTHLY" = "ok" ] && ok "Reports có monthlyRevenue" || fail "Reports thiếu monthlyRevenue"

STATUS=$(req GET "/api/search?q=test")
[ "$STATUS" = "200" ] && ok "GET /api/search → 200" || fail "GET /api/search → 200 (got $STATUS)"

# ─── KẾT QUẢ ────────────────────────────────────────────────
TOTAL=$((PASS + FAIL))
echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "\x1b[1mKẾT QUẢ TỔNG: $PASS/$TOTAL tests passed\x1b[0m"
if [ $FAIL -gt 0 ]; then
  echo -e "${RED}$FAIL tests FAILED:${NC}"
  for f in "${FAIL_LIST[@]}"; do
    echo -e "  ${RED}• $f${NC}"
  done
  exit 1
else
  echo -e "${GREEN}Tất cả $PASS tests PASSED ✅${NC}"
fi
