# 🎮 GAME STARTER — Multiplayer Three.js Web Game

> ไฟล์กลางสำหรับเปิดโปรเจคเกมใหม่ทุกเกม
> วิธีใช้: ก๊อปไฟล์นี้ไปไว้ที่ root ของโปรเจคใหม่ (หรือเปลี่ยนชื่อเป็น `CLAUDE.md`) แล้วแปะ **Kickoff Prompt** ข้างล่างให้ Claude
> ใช้ได้กับทุกเกม · กฎเฉพาะของแต่ละเกมให้แนบเป็น spec แยก

---

## 0. Kickoff Prompt (แปะอันนี้ตอนเริ่มโปรเจค)

```text
อ่าน GAME-STARTER.md ทั้งไฟล์ แล้วสร้างโปรเจคเกมใหม่ตามนั้น

เกม: <ชื่อเกม> — <คำอธิบาย 1–2 บรรทัด>
ผู้เล่น: <min>–<max> คน · เล่นบน PC + มือถือผ่าน browser
กฎเฉพาะเกม: <แนบ spec หรือเขียนสรุปกติกา>

ขั้นตอน:
1. ทำ Phase 1 (โครง + lobby + ห้อง) ให้รันได้ก่อน ด้วย npm run dev แล้วเปิด 2 แท็บเล่นห้องเดียวกันได้
2. ทำ Phase 2 (rules engine ใน shared/ + test) โดยยังไม่ต้องมีภาพ 3D
3. ทำ Phase 3 (ฉาก 3D ฝั่ง client ต่อกับ state/event จาก server ให้เล่นได้ครบ flow)
4. ทำ Phase 4 (บอท, reconnect, mobile)
ยังไม่ต้องเชื่อม Nakamoto / แพลตฟอร์มใดๆ แต่ให้วาง PlatformAdapter ไว้ตามส่วนที่ 5
แต่ละ Phase จบให้รัน typecheck + test + เปิดเล่นจริงใน browser ยืนยันก่อนไปต่อ
```

---

## 1. Tech Stack (ล็อกไว้)

| ส่วน | ใช้ |
|---|---|
| ภาษา | TypeScript strict ทั้งโปรเจค (`tsc --noEmit` ต้องผ่านตลอด) |
| Client | **Three.js** + Vite · ไม่ใช้ React/framework |
| Server | Node ≥ 22 + `ws` · รันด้วย `tsx` · server ตัวเดียวเสิร์ฟทั้งหน้าเว็บ (`dist/`) และ WebSocket `/ws` |
| Dev | `concurrently` รัน server (watch) + Vite พร้อมกัน · Vite proxy `/ws` → server |
| Deploy | Render / Railway / Fly · region **Singapore** (ping จากไทย ~30–50ms) |

### package.json scripts มาตรฐาน
```json
{
  "dev": "concurrently -k -n server,client \"npm:dev:server\" \"npm:dev:client\"",
  "dev:server": "tsx watch server/index.ts --port 2567 --dev",
  "dev:client": "vite --port 5173 --strictPort",
  "build": "vite build",
  "start": "tsx server/index.ts",
  "typecheck": "tsc --noEmit",
  "test": "tsx --test \"shared/**/*.test.ts\" \"server/**/*.test.ts\"",
  "bots": "tsx scripts/bots.ts"
}
```

### vite.config.ts
```ts
export default defineConfig({
  root: 'client',
  envDir: '..',          // .env อยู่ที่ root
  base: './',            // แพลตฟอร์มมักเสิร์ฟเกมจาก subfolder (/<gameId>/)
  build: { outDir: '../dist', emptyOutDir: true },
  server: { host: true, port: 5173, proxy: { '/ws': { target: 'ws://localhost:2567', ws: true } } },
});
```
`host: true` = มือถือใน Wi-Fi เดียวกันเปิดทดสอบได้

---

## 2. โครงสร้างโฟลเดอร์

```
shared/            โค้ดที่ server + client ใช้ร่วมกัน (ห้าม import three / DOM / node)
  constants.ts     ตัวเลขปรับเกมทั้งหมดอยู่ที่นี่ที่เดียว (timer, จำนวนคน, คะแนน)
  protocol.ts      type ของทุกข้อความ ClientMsg / ServerMsg (discriminated union ด้วย `t`)
  rules.ts         rules engine แบบ pure function (state, action) → state ใหม่ + events
  *.test.ts        test ของ rules
server/
  index.ts         http (เสิร์ฟ dist) + WebSocketServer + RoomManager + game loop
  rooms.ts         RoomManager: สร้าง/หา/ลบห้อง, quick match, room code
  room.ts          Room: lobby → playing → ended, ที่นั่ง, host, ready, timer, reconnect
  bot.ts           บอทเล่นแทนคน / เติมที่ว่าง
  platform/        PlatformAdapter (ตอนนี้ = LocalAdapter, อนาคต = Naka)
client/
  index.html
  src/
    main.ts        boot: loading → lobby → game → result
    net.ts         WebSocket client + reconnect + ping
    lobby.ts       หน้าเมนู / สร้างห้อง / หาห้อง / ห้องรอ
    game.ts        state ฝั่ง client + รับ event จาก server มาแสดงผล
    input.ts       mouse/touch/keyboard รวมเป็น action เดียวกัน
    render/        ฉาก 3D (Three.js) แยกจาก logic เกม
  public/          ไฟล์ static
scripts/           bots.ts, check-*.ts, make-link.ts
docs/              game overview + gameplay (html/md)
```

**กฎ:** logic เกมอยู่ `shared/` เสมอ · server เป็นคนตัดสิน · client แค่แสดงผล + ส่ง input

---

## 3. Netcode & Server Rules

1. **Server-authoritative 100%** — client ส่งแค่ "อยากทำอะไร" (`{t:'play', cardId}`) server ตรวจว่าทำได้ไหม แล้ว broadcast ผล
2. **ห้ามเชื่อข้อมูลจาก client** — validate ทุก field (type, ช่วงค่า, เป็นตาเราไหม, การ์ดอยู่ในมือเราจริงไหม)
3. **ข้อมูลลับส่งเฉพาะคนที่ควรเห็น** — ของที่ผู้เล่นมองไม่เห็น server ไม่ส่งไปเลย · เกมการ์ด: ส่งมือของคนอื่นแค่ "จำนวนใบ"
4. **ข้อความสั้น** — key สั้นใน snapshot ที่ส่งบ่อย (`{id, n, h}`) เพื่อมือถือ
5. **Loop แบบ fixed-step + catch-up** (`setInterval` 4ms + accumulator) เพราะ timer Windows drift
   - เกม real-time: tick 30/s + client prediction + interpolation ~100ms
   - เกม turn-based (การ์ด): event-driven ก็พอ แต่ยังมี tick 10/s สำหรับ timer/บอท
6. `maxPayload` เล็ก (4096), parse JSON ใน try/catch, เช็ค `msg && typeof msg === 'object'`
7. `ping`/`pong` ทุก 2 วิ (วัด latency)
8. ทุกอย่างสุ่มบน server ด้วย `crypto.randomInt` (สับไพ่ = Fisher–Yates)

---

## 4. ระบบห้อง & Matchmaking (ยังไม่เชื่อม Naka)

### 4.1 หน้าเมนู (Main Menu)
- ช่องใส่ชื่อ (จำใน `localStorage`, ตัด `<>`, ยาวสุด 14 ตัว, ว่าง = `Guest####`)
- เลือก avatar/สี
- ปุ่ม: **Quick Play** · **Create Room** · **Join with Code**
- รองรับลิงก์เชิญ: `https://host/?room=ABCD` → เข้าห้องนั้นอัตโนมัติหลังใส่ชื่อ

### 4.2 โหมดเข้าห้อง
| โหมด | ทำงาน |
|---|---|
| `quick` | หาห้อง **public** ที่ยังเป็น `lobby` และไม่เต็ม (เลือกห้องที่คนเยอะสุดก่อน) ไม่มี → สร้างใหม่ |
| `create` | สร้างห้องใหม่ คนสร้าง = host · เลือก public/private, จำนวนที่นั่ง, กติกาเสริม |
| `code` | ใส่โค้ด 4 ตัว (A–Z ไม่มี I/O) ไม่เจอ → `Room not found` · เต็ม → `Room is full` · เริ่มแล้ว → `Game already started` |

```ts
function makeCode(): string {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code: string;
  do code = Array.from({ length: 4 }, () => A[crypto.randomInt(A.length)]).join('');
  while (rooms.has(code));
  return code;
}
```

### 4.3 ห้องรอ (Lobby Room)
- แสดง: โค้ดห้อง (ปุ่ม copy + copy invite link), ที่นั่งทั้งหมด (คน / ว่าง / บอท), ใครเป็น host 👑, ใคร ready ✅
- ผู้เล่น: ปุ่ม **Ready / Unready**, เปลี่ยน avatar, **Leave**
- Host: **Start** (กดได้เมื่อ ≥ min คนและทุกคน ready), **Kick**, **Add/Remove Bot**, ตั้งค่า (ที่นั่ง 2–8, กติกาเสริม, เวลาต่อตา), สลับ public/private
- Host ออก → โอน host ให้คนที่เข้ามานานสุด (host migration)
- Quick-play room: ไม่มี host ให้กด เริ่มเองเมื่อเต็ม หรือนับถอยหลัง `LOBBY_WAIT` (เช่น 20 วิ) หลังมีคนครบ min แล้วเติมบอทให้เต็ม
- ห้องว่าง (ไม่มีคนจริง) → ปิดทันที · lobby ค้างเกิน `LOBBY_MAX_WAIT` (3 นาที) → ปิด

### 4.4 State machine ห้อง
```
lobby ──start──▶ playing ──จบเกม──▶ ended ──rematch (host)──▶ lobby
  │                 │                   │
  └─ว่าง─▶ closed   └─คนหลุด─▶ reconnect window / บอทเล่นแทน   └─ timeout ─▶ closed
```

### 4.5 Reconnect (สำคัญมากสำหรับเกม turn-based / มือถือ)
- ตอน `welcome` server ส่ง `token` (random 16 bytes) → client เก็บใน `sessionStorage`
- socket หลุด: ที่นั่ง **ไม่ลบทันที** เก็บไว้ `RECONNECT_GRACE` (เช่น 30 วิ) ระหว่างนั้นถึงตาก็ให้ **บอทเล่นแทน/auto-draw เมื่อหมดเวลา**
- client reconnect อัตโนมัติ (backoff 0.5s → 1 → 2 → 4) ส่ง `{t:'resume', code, token}` → server ส่ง full state กลับ
- เกิน grace → บอทเล่นแทนถาวร (เกมไม่พังเพราะคนหลุด)

### 4.6 Protocol ห้อง (ตัวอย่าง)
```ts
type ClientMsg =
  | { t: 'join'; mode: 'quick' | 'create' | 'code'; name: string; avatar: number; code?: string; opts?: RoomOpts }
  | { t: 'resume'; code: string; token: string }
  | { t: 'ready'; v: boolean }
  | { t: 'host'; a: 'start' | 'kick' | 'addBot' | 'removeBot' | 'opts'; id?: number; opts?: RoomOpts }
  | { t: 'leave' }
  | { t: 'rematch' }
  | { t: 'chat'; e: number }                        // emote id เท่านั้น ไม่มี text chat (ไม่ต้อง moderate)
  | { t: 'ping'; c: number }
  | GameAction;                                     // action เฉพาะเกม

type ServerMsg =
  | { t: 'welcome'; you: number; token: string; code: string }
  | { t: 'room'; code: string; state: RoomState; host: number; players: PlayerInfo[]; seats: number; opts: RoomOpts; startsIn: number }
  | { t: 'kicked' }
  | { t: 'error'; msg: string }
  | { t: 'pong'; c: number }
  | GameServerMsg;                                  // state/event เฉพาะเกม
```

### 4.7 Rate limit / ความปลอดภัยพื้นฐาน
- จำกัดข้อความ/วิ ต่อ socket (เช่น 30) เกิน → ตัด
- จำกัดห้องต่อ IP (เช่น 3) กันสแปมสร้างห้อง
- path ไฟล์ static: `normalize` + เช็คว่าอยู่ใน `dist/` (กัน path traversal)
- ทุก request ที่ parse ไม่ได้ → 400 ไม่ให้ process ล่ม

---

## 5. PlatformAdapter (เผื่อเชื่อม Naka ทีหลัง — ตอนนี้ไม่ต้องทำ)

ทำ interface ไว้ แล้วใช้ `LocalAdapter` ไปก่อน ห้ามเขียนชื่อแพลตฟอร์มลงใน game logic

```ts
// server/platform/adapter.ts
export interface PlatformAdapter {
  /** แปลงข้อความ join เป็นตัวตนผู้เล่น (Local: ชื่อที่พิมพ์ / Naka: ถอดลิงก์ ?query=) */
  identify(join: JoinMsg): Promise<{ playerId: string; name: string; avatar?: number; roomHint?: string } | { error: string }>;
  /** อนุญาตให้เล่นไหม (Local: true / Naka: check-play) */
  canPlay(playerId: string, roomCode: string): Promise<boolean>;
  /** ส่งผลจบเกม (Local: log / Naka: save-game-all เข้ารหัส) */
  saveResult(roomCode: string, ranking: RankEntry[]): Promise<{ ok: boolean; retry: boolean }>;
}
```
- เลือก adapter ด้วย env `PLATFORM=local|naka`
- โหมด Naka ในอนาคต = ไม่มีเมนู/lobby, เข้าห้องจาก `room_id` ในลิงก์, รอทุกคน ready หรือ 30 วิ, เติมบอท, ห้องละ 1 แมตช์
- ดังนั้นออกแบบ Room ให้รองรับทั้ง 2 แบบ: "host กด start" และ "auto-start เมื่อพร้อม/หมดเวลา"

---

## 6. Dev Workflow & Quality

- **Phase ละ commit** ข้อความ commit ชัด · README อัปเดตทุกครั้งที่เพิ่มระบบ (ภาษาไทยได้)
- Test rules engine ใน `shared/` ด้วย `node:test` (ทุกกติกา + edge case)
- `scripts/bots.ts <code> <n>` → ส่งบอท n ตัวเข้าห้องเดียวกันผ่าน WebSocket จริง (ทดสอบ load + flow)
- `scripts/check-*.ts` ตรวจ invariant (เช่น จำนวนของในเกมรวมกันต้องคงที่เสมอ)
- ทดสอบ multiplayer: เปิด 2–4 แท็บ + มือถือจริง 1 เครื่อง (`http://<ip-เครื่อง>:5173`)
- `.env.example` มีทุกตัวแปรพร้อมคอมเมนต์ · `.env.local` ไม่ commit
- Deploy: Build `npm install && npm run build` · Start `npm start` (ฟัง `$PORT`)
- ห้ามมี secret ใน client bundle (ค่า `VITE_*` = public)

### Definition of Done ต่อ Phase
- [ ] `npm run typecheck` ผ่าน · `npm test` ผ่าน
- [ ] เปิด 2 แท็บ สร้างห้อง/เข้าด้วยโค้ด/quick play เล่นจนจบได้
- [ ] ปิดแท็บกลางเกม แล้วเปิดใหม่ → กลับเข้าเกมเดิมได้
- [ ] มือถือแนวนอน + แนวตั้ง ใช้งานได้ 60fps
- [ ] ไม่มี error ใน console ทั้ง client/server
