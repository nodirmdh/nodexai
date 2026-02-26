# Status Source of Truth

## OrderStatus
new
accepted
preparing
ready
delivering
delivered
cancelled

Allowed transitions:
new → accepted | cancelled
accepted → preparing | cancelled
preparing → ready | cancelled
ready → delivering | cancelled
delivering → delivered

---

## RideStatus
searching
assigned
in_transit
completed
cancelled

Allowed transitions:
searching → assigned | cancelled
assigned → in_transit | cancelled
in_transit → completed