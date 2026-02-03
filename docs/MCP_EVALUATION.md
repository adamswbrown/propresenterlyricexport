# ProPresenter MCP Package Evaluation

**Date:** February 2026
**Package Evaluated:** [@alxpark/propresenter-mcp](https://www.npmjs.com/package/@alxpark/propresenter-mcp) v1.0.1
**Repository:** https://github.com/alxpark/propresenter-mcp

---

## Executive Summary

After thorough analysis, the recommendation is **(c) Use only as a reference** - the MCP package should not be adopted directly but serves as useful documentation for understanding ProPresenter's full API surface. The current implementation is well-suited for this Electron application's needs.

---

## Current Implementation Overview

### Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                     Electron Main Process                    │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                    IPC Handlers                        │  │
│  │  (connection:test, playlists:list, export:start, etc) │  │
│  └───────────────────────┬───────────────────────────────┘  │
│                          │                                   │
│  ┌───────────────────────▼───────────────────────────────┐  │
│  │              ProPresenterClient                        │  │
│  │  (src/propresenter-client.ts)                         │  │
│  │  - Connection management                               │  │
│  │  - Playlist/presentation discovery                     │  │
│  │  - Real-time status updates                            │  │
│  └───────────────────────┬───────────────────────────────┘  │
│                          │                                   │
│  ┌───────────────────────▼───────────────────────────────┐  │
│  │         renewedvision-propresenter (npm)               │  │
│  │  (Thin HTTP wrapper for ProPresenter API)              │  │
│  └───────────────────────┬───────────────────────────────┘  │
└──────────────────────────┼──────────────────────────────────┘
                           │ HTTP REST
                           ▼
                  ┌─────────────────┐
                  │  ProPresenter 7 │
                  │   Network API   │
                  └─────────────────┘
```

### Key Files
| File | Purpose |
|------|---------|
| `src/propresenter-client.ts` | Wrapper around `renewedvision-propresenter`, typed interfaces |
| `src/lyrics-extractor.ts` | Domain-specific lyrics parsing with heuristics |
| `src/services/playlist-exporter.ts` | Batch playlist collection with progress events |
| `src/services/playlist-builder.ts` | Service playlist assembly from PDF parsing |
| `electron/main/index.ts` | IPC handlers connecting GUI to ProPresenter |

### Current API Coverage (Used)
| Endpoint Category | Methods Used |
|-------------------|--------------|
| Version/Status | `version()`, `statusSlide()` |
| Playlists | `playlistsGet()`, `playlistPlaylistIdGet()`, `playlistActiveGet()`, `playlistFocusedGet()` |
| Presentations | `presentationActiveGet()`, `presentationFocusedGet()`, `presentationUUIDGet()`, `presentationSlideIndexGet()` |
| Libraries | `libraryGet()`, `libraryGetById()` |
| Status Updates | `registerCallbacksForStatusUpdates()` |
| Direct HTTP | `POST /v1/playlists`, `PUT /v1/playlist/{id}` |

**Total: ~15 endpoints** (focused on read operations + playlist creation)

---

## MCP Package Overview

### Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    MCP Server Process                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │            @modelcontextprotocol/sdk                   │  │
│  │         (Tool registration, message handling)          │  │
│  └───────────────────────┬───────────────────────────────┘  │
│                          │                                   │
│  ┌───────────────────────▼───────────────────────────────┐  │
│  │           18 Client Modules                            │  │
│  │  (AnnouncementClient, AudioClient, CaptureClient,     │  │
│  │   LibraryClient, LookClient, MacroClient, etc.)       │  │
│  └───────────────────────┬───────────────────────────────┘  │
│                          │ HTTP REST                         │
└──────────────────────────┼──────────────────────────────────┘
                           ▼
                  ┌─────────────────┐
                  │  ProPresenter 7 │
                  │   Network API   │
                  └─────────────────┘
```

### API Coverage
- **231 endpoints** across 27 API groups
- Complete ProPresenter API specification implementation
- Modular client classes for each domain

### Key Dependencies
```json
{
  "@modelcontextprotocol/sdk": "^1.0.4",
  "typescript": "^5.7.3"
}
```

---

## Comparison Table

| Aspect | Current Implementation | MCP Package |
|--------|----------------------|-------------|
| **API Coverage** | ~15 endpoints (focused) | 231 endpoints (complete) |
| **Architecture** | Direct in-process calls | Separate server process |
| **Integration Model** | IPC + async/await | MCP protocol (stdin/stdout) |
| **Primary Use Case** | Desktop app, lyrics export | AI assistant tool calling |
| **Runtime Dependency** | `renewedvision-propresenter` | `@modelcontextprotocol/sdk` |
| **Process Model** | Single Electron process | Separate Node.js process |
| **Latency** | Minimal (direct HTTP) | Higher (IPC + HTTP) |
| **Memory Overhead** | Shared with app | Separate process ~50-100MB |
| **Type Safety** | Full TypeScript | Full TypeScript |
| **Error Handling** | Domain-specific | Generic MCP errors |
| **Progress Events** | Custom event system | Not applicable |
| **Testability** | Easy (mock client) | Requires MCP test harness |
| **Debugging** | Standard Node debugging | Requires MCP debugging setup |

---

## Detailed Analysis

### 1. API Surface Coverage

**Current Implementation Gaps:**
The current implementation covers only the endpoints needed for lyrics export:
- Playlists (read + create)
- Presentations (read)
- Libraries (read)
- Status (read)

**Not Currently Used (from MCP package):**
- Audio/media control (play, pause, volume)
- Announcements
- Captures/recordings
- Timers
- Macros
- Props
- Stage displays
- Messages
- Themes
- Masks
- Transport controls
- Triggers

**Assessment:** Current coverage is sufficient. Unused endpoints are for live show control, not relevant to lyrics export functionality.

### 2. Architectural Differences

**Current Approach (Direct REST):**
```typescript
// Electron main process
const client = new ProPresenterClient({ host, port });
await client.connect();
const playlists = await client.getPlaylists();
```

Pros:
- Single process, no IPC overhead
- Direct error handling and retry logic
- Custom progress events for UI feedback
- Familiar async/await patterns

Cons:
- Manual endpoint additions as needed
- No standardized control surface

**MCP Approach (Abstraction Layer):**
```typescript
// Requires separate MCP server process
// Communication via MCP protocol
const result = await mcpClient.callTool('get_playlists', {});
```

Pros:
- Complete API coverage out of the box
- Standardized interface for all operations
- Could enable AI-assisted operations in future

Cons:
- Requires managing separate process lifecycle
- Additional IPC layer (stdout/stdin + HTTP)
- Not designed for real-time progress callbacks
- Overkill for simple CRUD operations

### 3. Electron App Integration Considerations

**Process Lifecycle:**
- MCP server would need to be spawned as child process
- Must handle startup, health checks, and graceful shutdown
- Port conflicts possible with multiple instances
- Additional complexity in app packaging

**IPC Overhead:**
```
GUI → Electron Main → MCP Client → MCP Server → HTTP → ProPresenter
         vs
GUI → Electron Main → ProPresenterClient → HTTP → ProPresenter
```

The MCP approach adds 2 extra layers of serialization/deserialization.

**Real-time Updates:**
Current implementation supports WebSocket-like status callbacks:
```typescript
client.registerStatusUpdates({
  onSlideChange: (data) => { ... },
  onPresentationChange: (data) => { ... }
});
```

MCP protocol is request/response only - real-time subscriptions would require additional plumbing.

### 4. Maintainability

**Current Implementation:**
- ~460 lines in `propresenter-client.ts`
- Well-typed interfaces matching ProPresenter API
- Easy to extend when needed
- Dependencies: 1 package (`renewedvision-propresenter`)

**MCP Package:**
- Would add: `@modelcontextprotocol/sdk` + process management
- 18 client modules to understand
- External dependency on package maintainer
- Risk: Package abandonment (v1.0.1, single maintainer)

### 5. Testability

**Current Implementation:**
```typescript
// Easy to mock
jest.mock('../propresenter-client');
const mockClient = { getPlaylists: jest.fn().mockResolvedValue([...]) };
```

**MCP Approach:**
- Requires MCP test infrastructure
- Process spawning in tests
- More complex integration test setup

### 6. Future Considerations

**AI Integration (if ever needed):**
The MCP package is designed for AI assistants. If this app later needed Claude integration for:
- "Create a playlist for next Sunday"
- "Find all songs with 'Amazing' in the title"

...then MCP could provide value. However, this is explicitly not the current goal.

---

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| MCP package abandoned | Would need to fork/maintain | Medium | Use as reference only |
| Added complexity | Slower development | High (if adopted) | Keep current approach |
| Performance regression | User experience | Medium | Benchmark before adopting |
| Breaking changes in MCP SDK | Upgrade burden | Low | Version lock, test thoroughly |
| Missing custom features | Feature parity loss | High | Keep domain-specific code |

---

## Recommendation

### Decision: **(c) Use only as a reference**

### Rationale

1. **Architectural Mismatch:** MCP is designed for AI tool calling, not desktop application integration. The protocol overhead provides no benefit for this use case.

2. **Sufficient Coverage:** Current ~15 endpoints cover all lyrics export needs. The additional 216 endpoints are for live show control features not relevant to this application.

3. **Unnecessary Complexity:** Adding process management, MCP client, and protocol translation adds complexity without tangible benefits.

4. **Performance:** Direct HTTP calls are faster than MCP protocol wrapping.

5. **Progress Events:** Current implementation has rich progress callbacks for UI feedback; MCP is request/response only.

6. **Dependency Risk:** Single-maintainer npm package (v1.0.1) is a maintenance risk.

### Value as Reference

The MCP package provides value as documentation:
- Complete endpoint enumeration (231 endpoints)
- TypeScript type definitions for API responses
- Example patterns for additional endpoints if needed

### Next Steps

1. **No changes required** to current architecture
2. **Document endpoint discovery:** If new endpoints are needed, reference MCP package's client modules for API shapes
3. **Monitor package:** If MCP becomes standard for ProPresenter integrations, reassess
4. **Consider if AI features needed:** Only revisit if AI assistant integration becomes a requirement

---

## Alternative: Partial Adoption

If more API coverage is eventually needed, consider:

1. **Copy endpoint definitions** from MCP package into current client
2. **Extend `ProPresenterClient`** with new methods as needed
3. **Do not adopt MCP protocol** - use direct HTTP

Example of extending current client:
```typescript
// Add to propresenter-client.ts when needed
async getTimers(): Promise<TimerInfo[]> {
  const result = await this.client.timerGet();
  if (!result.ok) throw new Error(`Failed: ${result.status}`);
  return this.parseTimerData(result.data);
}
```

This preserves the current architecture while benefiting from MCP's API documentation.

---

## Appendix: MCP Package API Groups (for reference)

1. Announcement
2. Audio
3. Capture
4. Clear
5. Library
6. Look
7. Macro
8. Mask
9. Media
10. Message
11. Playlist
12. Presentation
13. Prop
14. Stage
15. Status
16. Theme
17. Timer
18. Transport
19. Trigger
20. Video Input
21. ...and 7 more

Full documentation: https://openapi.propresenter.com/

---

## Sources

- [ProPresenter MCP GitHub Repository](https://github.com/alxpark/propresenter-mcp)
- [@alxpark/propresenter-mcp npm package](https://www.npmjs.com/package/@alxpark/propresenter-mcp)
- [ProPresenter OpenAPI Documentation](https://openapi.propresenter.com/)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
