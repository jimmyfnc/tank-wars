# Tank Wars Enhancement Roadmap

## Priority 1 - Core Polish (Do First)
1. Trajectory preview line (dotted arc)
2. Particle effects (explosions, smoke trails, debris)
3. Sound effects and background music
4. Screen shake on impact
5. Damage numbers floating up

## Priority 2 - Gameplay Depth
6. Multiple weapon types (3-4 basic types)
7. Weapon selection UI
8. Limited ammo for special weapons
9. Water/lava death zone at bottom
10. Bouncing/ricochet shots

## Priority 3 - Quality of Life
11. Settings menu (volume, controls)
12. Pause menu
13. Score tracking and high scores
14. Turn timer option
15. Hot seat multiplayer (3-4 players)

## Priority 4 - Content Expansion
16. More AI personalities
17. Campaign mode with progression
18. Unlockable tank skins
19. Achievement system
20. Larger scrolling maps

## Priority 5 - Advanced Features
21. Tank movement phase
22. Weather effects
23. Replay system
24. Mobile touch controls
25. Team battles (2v2)

---

## Web Multiplayer Discussion

Adding real-time web multiplayer is a significant undertaking. Here's the breakdown:

### Architecture Options

| Approach | Pros | Cons |
|----------|------|------|
| **WebSockets + Node server** | Real-time, full control | Need to host server, handle scaling |
| **Peer-to-peer (WebRTC)** | No server costs, low latency | NAT traversal issues, needs signaling server |
| **Firebase Realtime DB** | Easy setup, handles sync | Latency, costs at scale |
| **Colyseus/Socket.io** | Game-focused framework | Learning curve, still need hosting |

### Why Turn-Based Games Are Easier

For a turn-based game like Tank Wars, multiplayer is actually more feasible than real-time games because:
- No need for lag compensation or rollback netcode
- Only need to sync: angle, power, fire events, and results
- Players take turns, so latency is less critical

### Recommended Approach

1. Use **Socket.io** with a simple Node.js server
2. Create a lobby system with room codes (like Jackbox games)
3. Host on Railway, Render, or Fly.io (free tiers available)

### Rough Implementation Scope

- Lobby system: ~2-3 sessions of work
- Game state sync: ~2-3 sessions
- Reconnection handling: ~1-2 sessions
- Polish and edge cases: ~2 sessions

### Alternative - Simpler First Step

Implement **"pass and play"** on the same device with a screen that says "Pass to Player 2" between turns. This tests the UX without server complexity.

---

## Completed Features

- [x] Basic tank movement and firing
- [x] Destructible terrain with crater carving
- [x] Health bars and damage system
- [x] Wind physics
- [x] Turn-based gameplay
- [x] Menu screen with game mode selection
- [x] AI opponent with trajectory simulation
- [x] Multiple AI personalities (Sharpshooter, Artillery, Drunk)
- [x] AI personality selection in menu
