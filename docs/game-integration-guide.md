# คู่มือเชื่อมเกมกับ NAKALITE (สำหรับทีมเกม)

> **คู่มือนี้เป็นแม่แบบสำหรับทุกเกม** ไม่ผูกกับเกมใดเกมหนึ่ง ทีมเกมใหม่ทำตาม 6 ขั้นด้านล่าง ใช้ไฟล์ใน [`game-kit/`](game-kit/README.md) (spec template + โค้ดสำเร็จรูปฝั่ง server และ client) ไม่ต้องเขียนส่วนเชื่อมต่อเองตั้งแต่ศูนย์

## 0. เริ่มจากตรงนี้: 6 ขั้นของเกมใหม่

| ขั้น | ทำอะไร | เครื่องมือ |
|---|---|---|
| 1 | **กรอก spec หน้าเดียว**: โหมด, จำนวนผู้เล่น, กติกาตัดสินอันดับ, ตัวเลขผลลัพธ์, rewards | [`game-kit/GAME-SPEC.template.md`](game-kit/GAME-SPEC.template.md) |
| 2 | **ขอ server key และค่าแวดล้อม** จากทีม platform (ดูหัวข้อ 8) | ส่ง spec ให้ทีม platform |
| 3 | **copy kit เข้าเกม**: `naka-platform.ts` ไปฝั่ง server, `naka-platform.client.ts` ไปฝั่ง client | [`game-kit/`](game-kit/README.md) |
| 4 | **เขียน 3 จุดของเกม**: (ก) ตอนผู้เล่นเข้า เรียก `identify` แล้วให้นั่งเฉพาะ roster (ข) ตอนเกมจบ เรียก `reportResult` ครั้งเดียว (ค) ฝั่ง client ส่ง `ready` / `ended` / `leave` | หัวข้อ 4-7 |
| 5 | **ทดสอบในเครื่อง** กับ platform จริงหรือจำลอง | หัวข้อ 11 |
| 6 | **ให้ platform team ลงทะเบียนเกมใน Admin** (Game address, ผู้เล่น min/max, reward) แล้วเช็คลิสต์ก่อนส่งงาน | หัวข้อ 8, 10 |

ตัวอย่างเกมที่เชื่อมแล้ว: Spore (`NakaLite-Spore-card-version-main`, ดู `docs/platform-integration.md` ของเกมนั้น) เป็นแค่ตัวอย่างหนึ่ง ไม่ใช่ข้อกำหนด

ข้อจำกัดตอนนี้: รองรับเกมที่จบด้วย**อันดับ** (`placement`) เท่านั้น เกมแบบเล่นเรื่อย ๆ ไม่มีแพ้ชนะ (`time_only`) ยังไม่ได้ทำ ดูหัวข้อ 14

เอกสารนี้บอกว่าเกมที่จะขึ้น NAKALITE ต้องมีอะไรบ้าง ฝั่ง platform ทำอะไรให้ และเกมต้องทำอะไรเอง
สถานะ: **FEWEB-1513 (ชุดแรก)** รองรับเกมแบบมีอันดับ (`placement`) เท่านั้น เกมแบบเล่นเรื่อย ๆ ไม่มีแพ้ชนะ (`time_only`) ยังไม่ได้ทำ ดู "ยังไม่มี" ท้ายเอกสาร
ภาพรวมการออกแบบทั้งหมดอยู่ที่ [reward-system-flow.html](reward-system-flow.html). ตัวอย่างเกมที่เชื่อมแล้ว: Spore (`NakaLite-Spore-card-version-main`, ดู `docs/platform-integration.md` ของเกมนั้น)

## 1. หลักการ (อ่านข้อนี้ข้อเดียวก็พอเข้าใจ)

- **เกมรายงานแค่ "ใครได้อันดับเท่าไหร่" ส่วนจะได้กี่เหรียญ platform เป็นคนตัดสินเอง** เกมไม่รู้จัก reward เลย
- ผู้เล่นมาจาก lobby ของ platform: ทุกคนกด Ready, host กด Start, platform สร้าง match แล้วเปิดเกมของคุณใน iframe ให้ทุกคนพร้อมกัน
- เกมไม่ต้องมีหน้า login, ห้อง, หรือปุ่ม "เล่นอีกรอบ" ของตัวเองในโหมดนี้ รายชื่อผู้เล่นมาจาก platform
- มี **สองช่องทางที่ห้ามปนกัน**:
  1. **server ↔ platform BE** (กำหนดเหรียญและอันดับ): ใช้ **server key ของเกม** (สร้างในหน้า Admin) ที่ห้ามถึง browser
  2. **iframe ↔ หน้า platform** (`postMessage`): ใช้ได้เฉพาะเรื่อง UI ห้ามส่งอะไรที่เป็นความลับหรือเกี่ยวกับเหรียญ

## 2. เกมต้องมีอะไรบ้าง (checklist)

| # | ต้องมี | ทำไม |
|---|---|---|
| 1 | หน้าเกมเป็น **https** และฝังใน iframe ได้ (ไม่ตั้ง `X-Frame-Options: DENY`, ถ้าใช้ CSP ให้ `frame-ancestors` มี origin ของ platform) | platform เปิดเกมใน iframe |
| 2 | อ่าน `session` จาก query และ **launch token จาก URL fragment** (`#token=...`) แล้ว **ลบ fragment ออกจาก address bar ทันที** | token ห้ามถูกส่งไป server อื่น, ห้ามอยู่ใน log/bookmark |
| 3 | game server ที่ **host แยก** (ต้องถือ WebSocket ค้าง) ที่เรียก API ของ platform ได้ | ตรวจ token, ขอรายชื่อผู้เล่น, ส่งผล |
| 4 | game server เก็บ **server key** (จาก Admin → Games → หน้าเกม → Game server key) ไว้ใน env ฝั่ง server เท่านั้น (`NAKA_SERVER_KEY`) | key นี้คือสิทธิ์ส่งผลเกม และใช้ได้เฉพาะเกมของมัน |
| 5 | เรียก `POST /internal/game-sessions/identify` ตอนผู้เล่นเข้า แล้วให้นั่งโต๊ะเฉพาะคนใน roster | กันคนนอก match |
| 6 | เริ่มเกมเองเมื่อ roster มาครบ (ไม่มีปุ่ม host กด Start) | platform เริ่มให้แล้ว |
| 7 | จบเกมแล้วเรียก `POST /internal/game-sessions/:id/result` **ครั้งเดียวต่อ match** พร้อมอันดับ **ทุกคน** | platform จ่ายเหรียญจากอันดับ |
| 8 | retry เมื่อส่งผลไม่สำเร็จ (5xx / เน็ตหลุด) และ**เก็บผลที่ยังส่งไม่ได้ลงดิสก์/DB** เพื่อไม่หายตอน server รีสตาร์ต (kit ทำให้: `reportResult` + `fileResultStore` + `flushPending`) | platform รับซ้ำได้อย่างปลอดภัย |
| 9 | ส่ง `postMessage` แบบ UI (`ready`, `ended`, `leave`) ไปหน้า platform (มีใน `naka-platform.client.ts`) | ซ่อน loading, กลับ lobby |
| 10 | จบรอบแล้วมีแค่ปุ่มกลับ ไม่มี "เล่นอีกรอบ" | รอบถัดไปเริ่มจาก lobby ของ platform |

## 3. Flow

```
Lobby (platform)        Platform BE                    Game client (iframe)      Game server
 host กด Start ───────▶ สร้าง GameSession
 ทุกคน POST /game-sessions ─▶ ออก launch token (อายุ 10 นาที)
 เปิด /play/<sessionId> ─▶ iframe: <launchUrl>?session=<id>#token=<jwt>
                                                        อ่าน #token แล้วลบ ──▶ WS: join {token}
                                                                                 │ POST /internal/game-sessions/identify {token}
                                                         ◀───────── roster + reward ◀┘
                                                        (roster มาครบ → เริ่มเกมเอง)
                                                        ... เล่น ...
                                                                                 │ POST /internal/game-sessions/:id/result
                        ตรวจผล, จ่ายเหรียญ (Ledger) ◀────────────────────────────┘
 socket `game:result` ◀─ แจ้งผู้เล่นแต่ละคน: อันดับ + เหรียญ
 การ์ดสรุปผล → กลับ lobby (party กลับเป็น open)
```

## 4. Launch URL และ token

platform ให้ URL รูปแบบนี้ (ผู้เล่นแต่ละคนได้ token ของตัวเอง):

```
https://<launchUrl ของเกม>?session=<sessionId>#token=<JWT>
```

- `session` อยู่ใน query ได้ (ไม่ใช่ความลับ). `token` อยู่หลัง `#` **เสมอ** เพราะ browser ไม่ส่ง fragment ให้ server, proxy, หรือ Referer
- token เป็น JWT อายุ 10 นาที ผูกกับผู้เล่นและ session นี้ (`sub` = userId, `sid` = sessionId) **ยังใช้ซ้ำได้จนหมดอายุ** (ยังไม่ใช่ one-time)
- ตัวอย่างโค้ดฝั่ง client:

```ts
const token = new URLSearchParams(location.hash.slice(1)).get('token');
if (token !== null) history.replaceState(null, '', location.pathname + location.search); // ลบทันที
```

- **ไม่ต้อง** verify JWT เอง ส่งให้ platform ตรวจ (ข้อ 5.1) game server ไม่ต้องรู้ secret ของ platform
- หลัง join สำเร็จ ให้ game server ออก session ของตัวเอง (เช่น resume token ของ WebSocket) เพื่อ reload หน้าได้โดยไม่ต้องใช้ launch token อีก

## 5. API ที่ game server เรียก (server-to-server)

ทุกตัวต้องมี header `Authorization: Bearer <server key ของเกม>` (หน้าตา `gsk_<gameId>_<secret>`) ใช้ผ่าน TLS เท่านั้น key ของเกมหนึ่งเข้าถึงได้เฉพาะ session ของเกมนั้น (session ของเกมอื่นจะได้ `404`)
Base URL: `<API>/api` (เช่น `https://api.example.com/api`) ตอบกลับเป็น `{ "status": true, "data": ... }` ส่วน error เป็น `{ "message": "..." }`
key ผิด/ถูกเพิกถอน/ถูกแทนที่แล้วได้ `401` (key เดิมของ env `GAME_SERVER_KEY` ที่ใช้ร่วมกันทุกเกมยังใช้ได้อยู่ เพื่อรันในเครื่อง ส่วน production ควรเลิกใช้เมื่อทุกเกมมี key ของตัวเองแล้ว)

### 5.1 `POST /internal/game-sessions/identify`: ใครถือ token นี้ และใครอยู่ใน match

```json
// request
{ "token": "<launch token จาก #token>" }

// 200
{
  "status": true,
  "data": {
    "player": { "userId": "67...", "username": "Kai", "avatar": "https://..." },
    "session": {
      "sessionId": "67...",
      "status": "launching",
      "game": { "slug": "spore", "title": "Spore", "players": { "min": 2, "max": 8 } },
      "partyId": "67...",
      "roster": [ { "userId": "67...", "username": "Kai" }, { "userId": "68...", "username": "Zed" } ],
      "reward": { "mode": "placement", "baseCoins": 10, "minDurationSec": 30 }
    }
  }
}
```

| สถานะ | ความหมาย | เกมควรทำ |
|---|---|---|
| 401 | token ปลอม/หมดอายุ | บอกผู้เล่นให้กลับไปกด Start ใหม่ |
| 403 | ผู้เล่นไม่อยู่ใน session | ปฏิเสธ |
| 409 | match จบแล้ว | ปฏิเสธ |

`roster` เรียงตามลำดับที่ platform ให้ ใช้เป็นลำดับที่นั่งได้. `reward` เป็น `null` ถ้าเกมนี้ยังไม่ได้ตั้งค่าจ่ายเหรียญ (ผลยังถูกบันทึก แค่ไม่จ่าย)

### 5.2 `GET /internal/game-sessions/:id`: ขอ roster ซ้ำ

ผลเหมือน `data.session` ของข้อ 5.1 ใช้เมื่อ game server restart หรืออยากเช็ค session อีกครั้ง

### 5.3 `POST /internal/game-sessions/:id/result`: ส่งผลเมื่อเกมจบ

```json
{
  "players": [
    { "userId": "67...", "rank": 1, "score": 0, "ko": 0, "xp": 0, "revives": 0, "hunts": 0, "playtimeSec": 312 },
    { "userId": "68...", "rank": 2, "score": 0, "ko": 0, "xp": 0, "revives": 0, "hunts": 0, "playtimeSec": 312 }
  ],
  "startedAt": "2026-11-11T10:00:00.000Z",
  "endedAt": "2026-11-11T10:05:12.000Z",
  "mode": "classic"
}
```

กฎของข้อมูล (ผิดกฎ = `400`):

- `rank` เป็นจำนวนเต็ม 1-64 **เริ่มที่ 1**. ผู้เล่นเสมอกันใช้ `rank` เท่ากัน (เช่น 1, 2, 2, 4) platform หารเหรียญของอันดับที่เสมอกันให้เท่ากัน
- **ต้องมีผู้เล่นทุกคนใน roster ครบ ไม่ซ้ำ** ถ้ารายงานไม่ครบ (หรือมีคนนอก roster) match ยังถูกบันทึก แต่ **ไม่มีใครได้เหรียญ**
- `score`, `ko`, `xp`, `revives`, `hunts` เป็นจำนวนเต็ม ≥ 0 (เกมที่ไม่มีค่าไหนก็ส่ง `0`). `xp` ตอนนี้ยังไม่แปลงเป็นเลเวล. `playtimeSec` 0-86400
- `startedAt`/`endedAt` เป็น ISO 8601, `endedAt` ห้ามก่อน `startedAt`. **platform ใช้ช่วงเวลานี้เทียบกับ `minDurationSec`** ถ้า match สั้นกว่าจะไม่จ่ายเหรียญ (กันออกเกมทันทีเพื่อฟาร์ม)
- ผู้เล่นที่ออกกลางเกม **ยังต้องอยู่ในรายชื่อผลลัพธ์** พร้อมอันดับตามจริง (เช่น ท้ายสุด)

```json
// 200
{
  "status": true,
  "data": {
    "sessionId": "67...",
    "status": "finished",
    "replayed": false,
    "payouts": [ { "userId": "67...", "rank": 1, "coins": 14 }, { "userId": "68...", "rank": 2, "coins": 6 } ]
  }
}
```

- **ส่งซ้ำได้ปลอดภัย**: ถ้า match นี้บันทึกแล้วจะตอบ `200` พร้อม `replayed: true` และ `payouts: []` (ไม่จ่ายซ้ำ) ดังนั้น retry ได้เสมอ
- กฎ retry ที่แนะนำ: `5xx`, `408`, `429`, เน็ตหลุด → รอแล้วลองใหม่ (เช่น 1s, 3s, 10s, 30s, 60s). `4xx` อื่น ๆ ไม่ต้อง retry เพราะข้อมูลผิด แก้ที่เกม
- เกมได้ `payouts` กลับมา แต่ **ผู้เล่นเห็นเหรียญจาก platform** (การ์ดสรุปผลของ platform) เกมจะโชว์เลขเหรียญเองก็ได้ แต่ห้ามถือว่าเป็นความจริง

### ตัวอย่างเหรียญ

ตั้ง `baseCoins` = 10 : กองกลาง = 10 × จำนวนผู้เล่น แบ่งตามอันดับ

| ผู้เล่น | เหรียญตามอันดับ 1, 2, 3, 4 |
|---|---|
| 2 คน | 14, 6 |
| 3 คน | 16, 10, 4 |
| 4 คน | 18, 12, 6, 4 |

ทุกคนได้อย่างน้อย 1 เหรียญ. ตัวเลขนี้ตั้งที่ platform ไม่ใช่ในเกม

## 6. กติกาที่เกมต้องทำตามในโหมด platform

- **นั่งได้เฉพาะ roster.** ห้ามมีห้องว่างที่คนอื่นเข้าด้วยรหัสห้อง ห้าม Quick Play ดึงคนนอกเข้า match
- **เริ่มเองเมื่อมาครบ**, ไม่มี host ใน match. ถ้ามีคนไม่มา ควรหมดเวลาแล้วปิดห้อง (อย่าเติมบอทแล้วจ่ายเหรียญ: ผลจะไม่ครบ roster อยู่แล้ว)
- **ผู้เล่นหลุดกลางเกม**: ให้เวลากลับเข้า (เช่น 30 วินาที) ถ้าไม่กลับ เกมจะให้บอท/ระบบเล่นแทนก็ได้ แต่ผู้เล่นคนนั้นยังต้องมีชื่อในผลลัพธ์
- **เปิดลิงก์ซ้ำ** (แท็บที่สอง/รีโหลด): คนเดิมได้ที่นั่งเดิม แท็บเก่าถูกปิด
- **เล่นรอบเดียว**: จบแล้วไม่มี "เล่นอีกรอบ" มีปุ่มกลับอย่างเดียว (`postMessage` `leave`) การเล่นรอบใหม่เริ่มจาก lobby ซึ่งสร้าง session ใหม่
- **ห้ามเชื่อ client**: ผลแพ้ชนะต้องตัดสินที่ game server ไม่ใช่ browser

## 7. `postMessage` ระหว่างเกมกับหน้า platform (เฉพาะ UI)

เกมส่งข้อความไปหน้า platform ด้วย `window.parent.postMessage({ source: 'nakalite-game', type, ... }, origin)`

| type | เมื่อไหร่ | platform ทำอะไร |
|---|---|---|
| `ready` | โต๊ะ/ฉากโหลดเสร็จ | ซ่อนหน้า "Loading" |
| `ended` | game server บอกว่ามีผู้ชนะ | เริ่ม poll ผลเป็น fallback (ผลจริงมาจาก socket `game:result`) |
| `leave` | ผู้เล่นกดปุ่มออก/กลับ | พากลับ lobby ของ party |

- ใช้ `document.referrer` เป็น `targetOrigin` ถ้ามี (ถ้าไม่มีค่อยใช้ `*`)
- platform ตรวจ `event.origin` ว่าตรงกับ origin ของ launch URL และตรวจ `source === 'nakalite-game'` ถ้าไม่ตรงจะเมิน
- **ห้ามใส่ token, เหรียญ, หรือข้อมูลที่ต้องเชื่อถือใน message นี้** ทุกคนที่ฝังเกมอ่านได้

## 8. ตั้งค่าบน platform (ผู้ดูแลทำใน Admin → Games)

| ช่อง | ค่า |
|---|---|
| Game address (`launchUrl`) | https ของ **หน้าเกม (client)** เช่น `https://spore.example.com/` |
| Players min / max | เกม multiplayer ตั้ง **min ≥ 2** (ถ้าผู้เล่นไม่ครบอย่างน้อย 2 คนจะไม่จ่ายเหรียญ) |
| Base coins per player (`reward.baseCoins`) | เหรียญต่อคน; 0 = ไม่จ่าย |
| Shortest paid match (`reward.minDurationSec`) | วินาทีขั้นต่ำของ match ที่จ่ายเหรียญ (เริ่มต้น 30) |

- Admin API: `POST/PATCH /admin/games` ส่ง `launchUrl` และ `reward: { mode: 'placement', baseCoins, minDurationSec }`
- เกมที่ไม่มี `reward` หรือ `baseCoins` = 0 ยังเล่นและบันทึกผลได้ เพียงแต่ไม่จ่ายเหรียญ
- **ขอ server key อย่างไร** (ทีมเกมไม่มีสิทธิ์ Admin): ส่ง spec (หัวข้อ 1 ของ `GAME-SPEC.template.md`) ให้ทีม platform; ผู้ดูแล Admin จะลงทะเบียนเกม แล้วส่ง key ให้ผ่านช่องทางส่วนตัว (ไม่ใช่แชทกลุ่มหรือ repo) พร้อมค่าต่อไปนี้ที่ทีมเกมต้องใช้ (กรอกก่อนแจกคู่มือนี้):
  - `NAKA_API_URL` ของ dev/staging: `https://naka-lite-api.naka.bot/api`  ของ production: `ยังไม่มี`
  - ผู้ติดต่อฝั่ง platform: `heart@kos.co.th/m@kos.co.th/aof@kos.co.th`
- **Server key**: กดปุ่ม Make key ในหน้าเกมของ Admin (การ์ด "Game server key") แล้ว **คัดลอกทันที เพราะแสดงครั้งเดียว** platform เก็บแค่ hash กดซ้ำ (Replace key) จะทำให้ key เก่าใช้ไม่ได้ทันที; Revoke key ถอนสิทธิ์เกมนั้น
- ตั้งค่าฝั่ง platform ต้องมี env `GAME_SESSION_SECRET` (ออก token) ส่วน `GAME_SERVER_KEY` ใน env เป็นตัวเลือก (key กลางใช้ร่วมกันทุกเกม ไว้รันในเครื่อง)
- **ฝั่ง FE ไม่ต้องตั้งอะไรต่อเกม:** FE ดึง origin ของเกมที่ live จาก `GET /api/games/frame-origins` (มาจาก Game address ที่ตั้งใน Admin, แคช 1 นาที) ไปใส่ใน CSP `frame-src` เอง หลังตั้ง Game address จึงรอได้สูงสุดราว 1 นาที (env `NAKA_GAME_ORIGINS` ยังใช้เพิ่ม origin ได้ถ้าจำเป็น)

## 9. ตั้งค่าฝั่งเกม (ตัวอย่าง env)

| env | ใช้ทำอะไร |
|---|---|
| `NAKA_API_URL` | base ของ platform API รวม `/api` |
| `NAKA_SERVER_KEY` | server key ของเกมนี้จากหน้า Admin (`gsk_...`) (**ฝั่ง server เท่านั้น**) |
| `PLATFORM=naka` | เปิดโหมดเชื่อม platform (ค่าอื่น = เล่นเดี่ยวแบบเดิม) |
| `VITE_WS_URL` | (เฉพาะกรณี client กับ server อยู่คนละ host) `wss://...` ของ game server |

**host:** client (static) ขึ้น Vercel ได้ แต่ **game server ที่ถือ WebSocket ค้างต้องอยู่ host ที่รันโปรเซสยาว ๆ ได้** (Render, Railway, Fly ฯลฯ) Vercel serverless รับ WebSocket ไม่ได้
ถ้า platform รันในเครื่อง (localhost) แล้ว game server อยู่บน cloud ให้ใช้ tunnel (เช่น cloudflared) ให้ game server เรียก `NAKA_API_URL` ได้ และ `launchUrl` ต้องเป็น https

## 9.1 Deploy game server บน Render (ขั้นตอนตัวอย่าง)

เกมที่ถือ WebSocket ค้างต้องรันเป็นโปรเซสยาว Render (Web Service) ใช้ได้ ขั้นตอนนี้ไม่ผูกกับเกมใด ใช้ได้กับเกมที่ server เสิร์ฟ client (`dist/`) และ WebSocket ในโปรเซสเดียว

1. **ขึ้น GitHub ก่อน** (Render ดึงจาก git): `git init -b main` → ใส่ `.gitignore` (`node_modules`, `dist`, `.env`, `*.zip`, ไฟล์ผลที่ค้าง เช่น `.naka-pending.json`) → commit → สร้าง repo (private ได้) แล้ว push. อย่า commit `.env` หรือ server key
2. **สร้าง Web Service** ที่ Render (Dashboard → New → Web Service → เลือก repo) หรือผ่านเครื่องมือของทีม
   - Runtime: Node · Region: ใกล้ผู้เล่น (เช่น Singapore)
   - Build command: `npm install --include=dev && npm run build` (ต้อง `--include=dev` เพราะ Render ตั้ง `NODE_ENV=production` แล้วข้าม devDependencies ซึ่งมี vite/tsx)
   - Start command: `npm start` (server ต้องฟังพอร์ตจาก `process.env.PORT`)
   - Plan: **Starter ขึ้นไปสำหรับใช้จริง** แผน Free หลับเมื่อไม่มีผู้ใช้ (ตื่นช้า ~1 นาที และตัด WebSocket) ใช้ทดสอบได้เท่านั้น
   - Auto-Deploy: เปิด (deploy ใหม่ทุกครั้งที่ push `main`)
3. **ตั้ง environment variables** (Dashboard → Environment; การแก้ env ทำให้ deploy ใหม่)

   | env | ค่า |
   |---|---|
   | `PLATFORM` | **`naka`** (ต้องตั้งทุกครั้งที่ขึ้น production ถ้าไม่ตั้งเกมจะอยู่โหมดเล่นเอง ไม่ต่อ platform) |
   | `NAKA_API_URL` | **ต้องตั้ง** dev/staging: `https://naka-lite-api.naka.bot/api` ส่วน production ถามทีม platform |
   | `NAKA_SERVER_KEY` | **ต้องตั้ง** `gsk_...` จาก Admin → Games → Game server key ใส่ใน Dashboard เท่านั้น ห้ามใส่ใน repo, client, log หรือแชท |
   | `NODE_VERSION` | เวอร์ชัน Node ที่เกมต้องการ (เช่น `22`) |
   | `TRUST_PROXY` | `1` เมื่อ server อ่าน IP ผู้ใช้จาก `x-forwarded-for` (Render อยู่หลัง proxy) |
   | `NAKA_PENDING_FILE` | ที่เก็บผลที่ส่งไม่สำเร็จ ระบบไฟล์ของ Render ล้างทุกครั้งที่ deploy/รีสตาร์ต ถ้าจะใช้จริงให้ติด Persistent Disk (แผนเสียเงิน) แล้วชี้มาที่ดิสก์ |

   ถ้าตั้ง `PLATFORM=naka` โดยไม่มี `NAKA_API_URL` หรือ `NAKA_SERVER_KEY` เกมจะ throw ตอนสตาร์ตและเว็บล่ม ให้ตั้ง **ครบทั้ง 3 ตัวพร้อมกัน**
4. **ตรวจหลัง deploy**: สถานะเป็น Live → เปิด `https://<service>.onrender.com/` ได้ → log มี `platform=naka` และไม่มี `[naka] SERVER KEY REJECTED` → WebSocket `wss://<service>.onrender.com/ws` ต่อได้
5. **ลงทะเบียนกับ platform**: ให้ทีม platform ตั้ง Game address เป็น `https://<service>.onrender.com/` (https, เกมต้อง live) และ players min/max ตาม spec (หัวข้อ 8) แล้วทดสอบตามเช็คลิสต์ท้ายหัวข้อ 10 จาก lobby ของ platform จริง
6. **client กับ server คนละ host** (เช่น client บน Vercel): ตั้ง `VITE_WS_URL=wss://<service>.onrender.com/ws` ตอน build client และให้ server ตรวจ `Origin` ของ WebSocket ให้ตรงกับ origin ของ client

ข้อควรระวัง: เสียง/ไฟล์ asset ขนาดใหญ่ทำให้ build และ deploy ช้า (ควรบีบอัด เช่น mp3/ogg แทน wav), การเปลี่ยน env ทุกครั้งทำให้ deploy ใหม่และตัดผู้เล่นที่กำลังเล่นอยู่ ควรทำตอนไม่มี match

## 10. ทดสอบเร็ว ๆ ด้วย curl

```bash
KEY=<server key ของเกม (gsk_...)>; API=http://localhost:<port>/api

# 1) ตรวจ token (เอา token จาก #token= ของ launch URL ภายใน 10 นาที)
curl -s -X POST $API/internal/game-sessions/identify \
  -H "Authorization: Bearer $KEY" -H 'Content-Type: application/json' \
  -d '{"token":"<JWT>"}'

# 2) ส่งผลของ match 2 คน (userId ต้องมาจาก roster)
curl -s -X POST $API/internal/game-sessions/<sessionId>/result \
  -H "Authorization: Bearer $KEY" -H 'Content-Type: application/json' \
  -d '{"players":[{"userId":"<A>","rank":1,"score":0,"ko":0,"xp":0,"revives":0,"hunts":0,"playtimeSec":120},{"userId":"<B>","rank":2,"score":0,"ko":0,"xp":0,"revives":0,"hunts":0,"playtimeSec":120}],"startedAt":"2026-11-11T10:00:00Z","endedAt":"2026-11-11T10:02:00Z"}'
```

เช็คลิสต์ทดสอบก่อนส่งงาน:

- [ ] เปิดเกมด้วย token ปลอม/หมดอายุ → เห็นข้อความที่อ่านรู้เรื่อง ไม่ค้างหน้า loading
- [ ] ผู้เล่นนอก roster เข้าไม่ได้ และเข้าผ่านรหัสห้องไม่ได้
- [ ] ผู้เล่นครบ → เกมเริ่มเอง ไม่มีปุ่ม Start
- [ ] เปิดลิงก์ซ้ำ → ที่นั่งเดิม แท็บเก่าถูกแทนที่
- [ ] จบเกม → ส่งผลครั้งเดียว ทุกคนอยู่ในผล อันดับเสมอใช้เลขเท่ากัน
- [ ] ปิด platform BE ชั่วคราวตอนจบเกม แล้วเปิดใหม่ → ผลถูกส่งสำเร็จด้วย retry และไม่จ่ายซ้ำ
- [ ] จบแล้วมีแค่ปุ่มกลับ ไม่มี "เล่นอีกรอบ"
- [ ] `#token` หายจาก address bar หลังโหลดหน้า
- [ ] server key (`gsk_...`) ไม่ปรากฏในโค้ด client, ใน log, หรือใน Network ของ browser
- [ ] key ของเกมอื่นเรียก session ของเกมนี้ไม่ได้ (ได้ `404`) และ key ที่ถูก Replace/Revoke แล้วได้ `401`

## 11. ทดสอบในเครื่องก่อนขึ้น host

มี 3 ระดับ เริ่มจากง่ายไปจริง

1. **ทดสอบ kit กับ platform ปลอม** (ไม่ต้องมี platform): `node --experimental-strip-types --test docs/game-kit/naka-platform.test.ts` ดูเป็นตัวอย่างการจำลองคำตอบของ platform ด้วย `fetch` ปลอม ใช้แบบเดียวกันกับเกมของคุณได้
2. **ใช้ platform ของทีม (staging)**: ขอ `NAKA_API_URL` และ key แล้วเกมของคุณต้องอยู่ที่ https (ใช้ tunnel เช่น cloudflared ถ้ารันในเครื่อง) ให้ platform team ตั้ง Game address เป็น URL นั้น
3. **รัน platform ครบชุดในเครื่อง** (repo `naka-lite-api`): Mongo แบบ replica set ใน Docker (`docker run -d -p 27018:27018 mongo:7 mongod --replSet rs0 --port 27018` แล้ว `rs.initiate` ด้วย host `localhost:27018`), ตั้ง env `DB_URI`, `GAME_SESSION_SECRET`, `GAME_SERVER_KEY` (key กลางสำหรับรันในเครื่อง), รัน `npm run seed:local-game` (ตั้ง `LOCAL_GAME_URL`, `LOCAL_GAME_SLUG` ได้ ลง DB ตรง ๆ จึงใช้ `http://` ได้) แล้วรัน FE ด้วย `NAKA_GAME_ORIGINS=http://127.0.0.1:<พอร์ตเกม>` (origin แบบ http ใช้ได้เฉพาะ localhost ตอน dev) ใช้ `127.0.0.1` ไม่ใช่ `localhost` เพื่อไม่ให้ cookie ชนกับ platform อื่นที่รันอยู่

สคริปต์ตัวอย่างของ Spore (ดูแล้วดัดแปลงได้): `scripts/platform-smoke.ts` (platform ปลอมในโปรเซสเดียวจบ), `scripts/platform-e2e.ts` (ผู้เล่นสองคนเล่นกับ platform จริงจนจบ ตรวจอันดับและเหรียญ), `scripts/platform-buddy.ts` (ผู้เล่นคนที่สองอัตโนมัติไว้ลองด้วยมือ)

## 12. เกมทำงานใน iframe ของ platform

หน้า `/play/<sessionId>` ฝังเกมแบบนี้: `<iframe src="<Game address>?session=<id>#token=<jwt>" allow="autoplay; fullscreen; gamepad; clipboard-write" allowfullscreen>` (**ไม่มี** `sandbox`) บนจอกว้างเกมอยู่ซ้าย แผงผู้เล่น/แชทอยู่ขวา 300px บนจอแคบ (≤ 820px) แผงอยู่ใต้เกม

ที่เกมต้องรองรับ
- **ขนาดยืดหยุ่น**: เติมพื้นที่ของ iframe ได้ทุกขนาด ตั้งแต่มือถือแนวตั้งถึงจอกว้าง
- **เสียงเล่นเองไม่ได้จนกว่าผู้เล่นจะแตะ**: เบราว์เซอร์บล็อก autoplay ให้มีหน้าแตะเพื่อเริ่ม หรือปลดล็อกเสียงตอนแตะครั้งแรก
- **คีย์บอร์ดต้องโฟกัสที่ iframe ก่อน**: ผู้เล่นต้องคลิกในเกมหนึ่งครั้ง อย่าสมมติว่าโฟกัสอยู่แล้ว
- **อย่าพึ่ง cookie ของเกมเอง**: เบราว์เซอร์แยกที่เก็บ third-party ของ iframe ใช้ session ที่ game server ออกให้ (เช่น resume token ใน `sessionStorage`) แทน
- **อย่า navigate หน้าบน** (`window.top`) ปุ่มออกให้ส่ง `postMessage` `leave` แล้วให้ platform พากลับ
- **WebSocket**: ตรวจ `Origin` ให้ตรงกับ origin ของ client เกมเอง (ไม่ใช่ origin ของ platform เพราะ client ของเกมเป็นคนเชื่อมต่อ) และใช้ `wss://`
- **อย่าบันทึก launch token ลง log** ทั้งฝั่ง client และ server (หลัง `identify` สำเร็จแล้วไม่ต้องใช้อีก)
- **FE ไม่ต้องตั้งอะไรต่อเกม**: platform ดึง origin ของเกมที่ live จาก Admin ไปใส่ CSP เอง ดังนั้น Game address ต้องเป็น https และเกมต้อง **live** (ไม่ใช่ draft) ใน Admin ถึงจะถูกฝังได้

## 13. ความทนทาน (สิ่งที่ทำให้ผู้เล่นไม่เสียเหรียญ)

- **ส่งผลครั้งเดียวต่อ match** แต่**ส่งซ้ำได้เสมอ** platform ตอบ `replayed: true` ไม่จ่ายซ้ำ ถ้าไม่แน่ใจว่าถึงไหม ให้ส่งอีก
- **เก็บผลที่ส่งไม่สำเร็จลงที่ถาวร** (ไฟล์หรือฐานข้อมูล) ไม่ใช่แค่ในหน่วยความจำ แล้วเรียก `flushPending()` ตอนเริ่ม server และทุกนาที ไม่งั้นรีสตาร์ตระหว่าง retry จะทำให้ผลหาย
- **`rejected` (4xx) ไม่ต้อง retry** แปลว่าข้อมูลของเกมผิด (เช่น อันดับไม่ครบ roster) ให้แก้ที่เกม kit จะโยน error ชนิดนี้และไม่เก็บผลนั้นไว้ส่งซ้ำ
- **key ผิด (`bad_key`)** kit เก็บผลไว้ให้ส่งใหม่เมื่อแก้ key แล้ว แต่ผู้เล่นรอบนั้นจะยังไม่เห็นเหรียญจนกว่าจะส่งสำเร็จ จึงควรมีการแจ้งเตือนทีมเมื่อเกิดเหตุนี้
- **เก็บ `sessionId` และเวลาเริ่มของ match ไว้ใน server** ตั้งแต่เริ่ม (ไม่ใช่คำนวณตอนจบ) เพื่อให้ `startedAt` ถูกต้องแม้ผู้เล่นต่อใหม่กลางเกม

## 14. ยังไม่มี (อย่าเพิ่งทำฝั่งเกม)

- เกมแบบเล่นเรื่อย ๆ ไม่มีแพ้ชนะ (`time_only`): checkpoint เวลา active, เควสสะสมเวลารายวัน, กัน AFK ยังเป็นแค่ดีไซน์
- เควสประเภทใหม่ (Count/Variety/Social/Featured/Time) และเพดานเหรียญต่อวัน, ลดรางวัลเมื่อเจอคู่เดิมซ้ำ
- webhook จาก platform ไปเกม, ลายเซ็นบน body ของผล, วันหมดอายุ/last-used ของ key
- แชทของ party ข้างเกมใน `/play/<sessionId>` (ตอนนี้มีรายชื่อ squad และการ์ดสรุปผล)
- launch token แบบใช้ครั้งเดียว
