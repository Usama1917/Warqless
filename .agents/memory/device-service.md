---
name: Device service and one-device-only login
description: How device locking is implemented in the mobile app (MVP/demo only)
---

Device lock is in `artifacts/mobile/services/deviceService.ts`.

- `getCurrentDeviceId()` — generates or retrieves UUID from AsyncStorage (`warqless_device_id`)
- `registerPrimaryDevice(userId)` — stores device→user mapping at key `warqless_primary_device_<userId>`
- `verifyPrimaryDevice(userId)` — compares current UUID to stored; returns `{ allowed: true }` or `{ allowed: false, reason: "different_device" }`

**AppContext login flow:** `login()` returns `"ok" | "invalid" | "device_blocked"` (NOT a boolean anymore — auth screen updated accordingly).

**Why:** Demo device lock using AsyncStorage is simple and runs without a backend. Real production must use backend registration with signed device tokens.

**How to apply:** Call `registerPrimaryDevice` on first login, `verifyPrimaryDevice` on session restore and subsequent logins. Block with `"device_blocked"` result if mismatch.
