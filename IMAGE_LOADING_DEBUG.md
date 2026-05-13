# Image Loading Debug Guide

## Quick Test Steps

### 1. Check if proof exists in database
Visit this debug endpoint (replace `{proofId}` with actual ID from order):
```
GET https://zemen-exchange.onrender.com/api/uploads/{proofId}/debug
```

Expected response:
```json
{
  "id": "...",
  "contentType": "image/jpeg",
  "createdAt": "...",
  "contentLength": 102400,
  "canServe": true
}
```

**Issue if**: `contentLength: 0` or `canServe: false` → Image wasn't uploaded correctly

---

### 2. Test direct image retrieval (bypasses auth)
Visit:
```
GET https://zemen-exchange.onrender.com/api/uploads/{proofId}/test
```

Expected: Image loads in browser

**Issue if**: Returns JSON error → Problem with image data or headers

---

### 3. Test order debug endpoint
Visit (requires login):
```
GET https://zemen-exchange.onrender.com/api/p2p/orders/{orderId}/debug
```

Expected response:
```json
{
  "orderId": "...",
  "status": "PAID",
  "proofId": "cmp4euni...",
  "proof": {
    "id": "cmp4euni...",
    "contentType": "image/jpeg",
    "exists": true
  },
  "attachmentUrl": "/api/p2p/orders/{orderId}/proof"
}
```

**Issue if**: 
- `proofId: null` → Proof wasn't linked when marking order as paid
- `proof: null` → Proof record doesn't exist in database

---

### 4. Test order proof endpoint (with auth)
Visit in logged-in session:
```
GET https://zemen-exchange.onrender.com/api/p2p/orders/{orderId}/proof
```

Expected: Image loads

**Issue if**: Returns JSON error → Check the error message

---

## Common Issues & Solutions

### ❌ Error: "No proof attached to this order"
**Problem**: `proofId` is null on the order
**Solution**: When marking as paid, ensure proofId is being sent and saved

Check order table - look for orders with:
- `status = "PAID"`
- `proofId = NULL` ← This is the problem

---

### ❌ Error: "Proof content is empty"
**Problem**: Attachment exists but content field is empty/null
**Solution**: Re-upload the proof

This means the image buffer wasn't saved correctly to database.

---

### ❌ Returns broken image or 404
**Problem**: Endpoint returns JSON error instead of image binary
**Likely cause**: One of these errors:
1. "Order not found" → OrderId is wrong
2. "Unauthorized" → User not authenticated or not participant
3. "No proof attached" → proofId is null

**Solution**: Check the error message in browser console (F12 → Network tab)

---

### ❌ Image loads but shows blank/corrupted
**Problem**: Content-Type header is wrong or content is corrupted
**Solution**: Check the debug endpoint response for contentType

---

## Where to Check Logs

On Render dashboard:
1. Go to your backend service
2. Click "Logs"
3. Search for `[PROOF]` to see proof retrieval attempts
4. Search for `[UPLOAD-TEST]` to see test endpoint calls

---

## Manual Database Check

If you have database access, run this SQL:
```sql
-- Check if attachments exist
SELECT id, "contentType", length(content) as size, "createdAt" 
FROM "Attachment" 
LIMIT 10;

-- Check if orders have proofId set
SELECT id, "proofId", status 
FROM "P2POrder" 
WHERE status = 'PAID' 
LIMIT 10;

-- Check for mismatches
SELECT 
  p.id as order_id,
  p."proofId",
  a.id as attachment_id,
  a."contentType",
  length(a.content) as size
FROM "P2POrder" p
LEFT JOIN "Attachment" a ON p."proofId" = a.id
WHERE p.status = 'PAID'
LIMIT 10;
```

---

## Fix Priority Order

1. **First**: Run test #2 above - if image loads there, issue is with auth/endpoint
2. **Second**: Run test #3 above - check if proofId is actually linked to order
3. **Third**: Run test #1 above - check if image data exists
4. **Last**: Check database with SQL query above

---

## What to Report

Once you find the issue, let me know:
1. What error you see in the debug endpoints
2. What the database query shows
3. Whether the `/api/uploads/{proofId}/test` endpoint works or fails

This will pinpoint the exact problem!

