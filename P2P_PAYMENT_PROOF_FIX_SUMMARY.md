# P2P Payment Proof System - Fix Summary

## Root Causes Identified & Fixed

### 1. ✅ **Route Parameter Naming Issue**
**Problem**: Backend route used `:id` instead of `:orderId`
```ts
// BEFORE
router.post("/orders/:id/paid", ...)
const { id } = req.params;

// AFTER
router.post("/orders/:orderId/paid", ...)
const { orderId } = req.params;
```
**Impact**: Less clear parameter naming, inconsistent with REST conventions
**Fix**: Changed to `:orderId` for clarity

---

### 2. ✅ **Missing Proof Validation**
**Problem**: Backend didn't verify proof exists before marking order as paid
```ts
// BEFORE
const order = await tx.p2POrder.findUnique({ where: { id } });
// ... no proof validation

// AFTER
const proof = await tx.attachment.findUnique({ where: { id: proofId } });
if (!proof) throw new Error("Proof not found");
```
**Impact**: Could update order status without valid proof attachment
**Fix**: Added explicit proof existence check

---

### 3. ✅ **Frontend Proof State Leak**
**Problem**: Global `proofFile` and `proofPreview` state persisted across order switches
- User uploads proof for Order A
- User switches to Order B without clearing state
- User marks Order B as paid → wrong proof attached to wrong order
```ts
// BEFORE
const [proofFile, setProofFile] = useState<File | null>(null);
const [proofPreview, setProofPreview] = useState<string | null>(null);

// AFTER
const [orderProofs, setOrderProofs] = useState<{ 
  [orderId: string]: { file: File | null; preview: string | null } 
}>({});
```
**Impact**: Proof files could be attached to wrong orders
**Fix**: Changed to per-order proof state with orderId as key

---

### 4. ✅ **Missing Admin Proof Endpoint**
**Problem**: No endpoint for admins to view/retrieve proofs by order
```ts
// ADDED
router.get("/orders/:orderId/proof", authenticate, async (req, res) => {
  // Verify user is order participant or admin
  // Return proof image with proper Content-Type header
});
```
**Impact**: Admin couldn't retrieve proof images from orders
**Fix**: Added dedicated endpoint with proper access control

---

### 5. ✅ **Missing Content-Type in Upload Response**
**Problem**: Upload endpoint didn't return contentType in response
```ts
// BEFORE
res.json({
  id: attachment.id,
  url: `/uploads/${attachment.id}`,
});

// AFTER
res.json({
  id: attachment.id,
  url: `/uploads/${attachment.id}`,
  contentType,
});
```
**Impact**: Frontend couldn't determine proper image MIME type for display
**Fix**: Return contentType in upload response

---

### 6. ✅ **Proof Image Display Using Wrong Endpoint**
**Problem**: Frontend tried to display proofs using old `/uploads/:id` endpoint
```ts
// BEFORE
src={getImageUrl(order.paymentProof)}  // Constructs old path

// AFTER
src={`${axios.defaults.baseURL}/api/p2p/orders/${order.id}/proof`}
```
**Impact**: Proof images couldn't be displayed even if uploaded
**Fix**: Use new order-specific proof retrieval endpoint

---

## Complete Data Flow (Now Fixed)

### Upload Flow
```
1. User selects image → Frontend stores in orderProofs[orderId]
2. User clicks "Mark Paid" → Frontend uploads to /api/upload
3. Backend saves to DB as Attachment (BYTEA)
4. Backend returns proofId
5. Frontend sends proofId to /api/p2p/orders/:orderId/paid
```

### Mark as Paid Flow
```
1. Backend receives { proofId }
2. Validates proof exists in DB
3. Validates user is buyer
4. Updates order: status=PAID, proofId=proofId
5. Sets paymentProof=/uploads/:proofId (for backwards compat)
6. Returns { success: true }
```

### Image Retrieval Flow
```
1. Seller views PAID order
2. Image src points to /api/p2p/orders/:orderId/proof
3. Backend verifies user is order participant or admin
4. Returns image buffer with correct Content-Type header
5. Browser displays image
```

---

## Files Modified

### Backend
- `backend/routes/p2p.ts`
  - Fixed route parameter: `:id` → `:orderId`
  - Added proof existence validation
  - Added new endpoint: `GET /api/p2p/orders/:orderId/proof`

- `backend/routes/upload.ts`
  - Added contentType to response
  - Improved error handling

### Frontend
- `frontend/src/pages/P2PPage.tsx`
  - Replaced global proof state with per-order state: `orderProofs[orderId]`
  - Updated `onFileChange` to accept orderId parameter
  - Updated `handleMarkPaid` to use per-order proof
  - Updated image display to use new order-specific endpoint
  - Removed unused global state variables

---

## Testing Checklist

- [ ] User uploads payment proof for order A
- [ ] Proof preview shows in UI for order A
- [ ] User switches to order B (proof preview disappears)
- [ ] User uploads different proof for order B
- [ ] Proof preview shows in UI for order B (different from A)
- [ ] User clicks "Mark Paid" on order B
- [ ] Request sent to `/api/p2p/orders/{orderId}/paid` with correct proofId
- [ ] Order status changes to PAID
- [ ] Proof image displays in PAID order view
- [ ] Proof image opens in new tab when clicked
- [ ] Admin can view proof through endpoint
- [ ] CORS allows image retrieval from Vercel frontend

---

## API Endpoints Summary

### Upload Proof
```
POST /api/upload
Body: { image: File }
Response: { id, url, contentType }
Auth: Required
```

### Mark Order as Paid
```
POST /api/p2p/orders/:orderId/paid
Body: { proofId: string }
Response: { success: true }
Auth: Required (buyer only)
```

### Retrieve Proof Image
```
GET /api/p2p/orders/:orderId/proof
Response: Image buffer (Content-Type: image/*)
Auth: Required (participant/admin)
```

---

## Environment Variables Required

- `FRONTEND_URL` - Vercel frontend URL (for CORS)
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Token signing secret

