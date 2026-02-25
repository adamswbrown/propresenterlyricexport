# Guest Network Access for Viewer/Proxy Apps

**Internal document - not linked from public documentation**

---

## The Problem

ProPresenter and the Viewer/Proxy apps run on the **main network**. Congregation tablets and viewer devices connect to a **UniFi guest network**. By default, UniFi guest network isolation blocks all traffic from guest clients to the main LAN, so tablets can't reach the viewer URL.

## Network Layout

```
Main Network (e.g. 192.168.1.0/24)
  ├── ProPresenter machine (192.168.1.x)
  │     ├── ProPresenter API (port 1025)
  │     ├── Viewer app (port XXXX)
  │     └── WebProxy app (port XXXX)
  └── Other LAN devices

Guest Network (e.g. 192.168.2.0/24) — UniFi guest VLAN
  ├── Tablet 1
  ├── Tablet 2
  └── ... (viewer devices)

┌─────────────┐         ╳ BLOCKED          ┌─────────────┐
│ Guest tablet │ ──────────────────────────→│ Viewer app  │
│ 192.168.2.x  │   (guest isolation)        │ 192.168.1.x │
└─────────────┘                             └─────────────┘
```

## Solution: UniFi Firewall Rule

Create a single firewall rule that allows guest network traffic to reach **only** the viewer/proxy app's IP and port. Everything else stays blocked.

### Steps (UniFi New UI)

1. Go to **Settings → Security → Firewall Rules** (or Network → Firewall & Security)
2. Create a new rule:

| Field | Value |
|---|---|
| **Name** | `Allow Guest to Viewer` |
| **Type** | LAN Local |
| **Action** | Allow |
| **Source** | Guest network (select your guest VLAN/network) |
| **Destination** | IP address of the ProPresenter machine |
| **Port** | Viewer/Proxy app port (check app settings) |
| **Protocol** | TCP |

3. **Rule ordering matters**: This rule must be placed **above** the default "Block Guest to LAN" rule. UniFi processes firewall rules top-to-bottom; the first match wins.

### Steps (UniFi Classic UI)

1. **Settings → Routing & Firewall → Firewall → Rules → LAN LOCAL**
2. Create new rule with the same settings as above

## Important: Use a Static IP

The ProPresenter machine must have a fixed IP address. If it gets a new IP via DHCP, the firewall rule breaks.

**Set a DHCP reservation in UniFi:**
1. Go to **Clients** → find the ProPresenter machine
2. Click on it → **Settings** (or the gear icon)
3. Enable **Fixed IP Address**
4. Set the IP (e.g. `192.168.1.100`)
5. The machine may need to reconnect to pick up the reservation

## Security Notes

- This rule allows traffic to **one IP and one port only**
- Guest devices cannot access any other LAN resources
- Guest-to-guest isolation (if enabled) still works
- No other network security is weakened

## Multiple Ports

If you're running both the Viewer app and the WebProxy on different ports, either:

1. Create two firewall rules (one per port), or
2. Use a port range in a single rule (e.g. `3000-3001`)

## Verification

From a tablet on the guest network, open a browser and navigate to:
```
http://<ProPresenter-machine-IP>:<viewer-port>
```

If it loads, the rule is working. If it times out, check:
- Rule ordering (must be above the block rule)
- Correct destination IP
- Correct port number
- That the viewer/proxy app is actually running

## Alternative Approaches (Not Recommended)

| Approach | Why not |
|---|---|
| Disable guest isolation entirely | Exposes your entire LAN to guest devices |
| Move ProPresenter to the guest network | Loses access to main network resources |
| Use a VPN between networks | Overly complex for this use case |
| Bridge the networks | Defeats the purpose of network segmentation |

The firewall rule approach is the simplest and most secure solution.
