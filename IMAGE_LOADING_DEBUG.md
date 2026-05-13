# Image Loading Debug Guide - CORRECTED URLS

## Updated Test URLs (Use These!)

The images are served from `/uploads/{id}` **NOT** `/api/uploads/{id}`

### 1. Check if proof exists in database
```
https://zemen-exchange.onrender.com/uploads/cmp4etsux000de62mrf4t1bn8/debug
```

Expected: JSON response showing image size and type

---

### 2. Test if image loads directly (no auth)
```
https://zemen-exchange.onrender.com/uploads/cmp4etsux000de62mrf4t1bn8/test
```

Expected: Image displays in browser

---

### 3. Check order's proof link (requires login)
```
https://zemen-exchange.onrender.com/api/p2p/orders/{orderId}/debug
```

Should show `proofId` is set and `proof` object exists

---

### 4. Try loading proof from order view (requires login)
```
https://zemen-exchange.onrender.com/api/p2p/orders/{orderId}/proof
```

Should display the image

---

## Simple Test Right Now

**Get an order ID from your PAID orders**, then:

1. Replace `{proofId}` in test URL:
```
https://zemen-exchange.onrender.com/uploads/{proofId}/debug
```

2. **Copy the response** (what you see in the browser) and send it to me

This will instantly show what's wrong!

