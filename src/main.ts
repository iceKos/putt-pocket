import './style.css';
import { COURSES, createBall, launch, LAYOUT_LABELS, moving, SHOT_LIMIT, STEP, stepPutt, BALL_RADIUS, type CourseLayout, type Point } from './golf';
import { makeScene } from './scene';
import { makeGolfAudio } from './audio';
import type { Burst } from './fx';
import { makeRoomClient } from './room-client';
import { MIN_PLAYERS, PLAYER_COLORS, PLAYER_NAMES, rankPlayers, ROOM_SIZES, SEATS, type PlayerSnapshot, type RoomSnapshot, type Seat } from './room-protocol';
import { embedded, toPlatform } from '../docs/game-kit/naka-platform.client';

const get = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = get<HTMLCanvasElement>('course');

const playerName = (player: PlayerSnapshot) => player.profile?.username || PLAYER_NAMES[player.seat];

function setPlayerIcon(icon: HTMLElement, seat: Seat, avatar?: string) {
  icon.style.backgroundColor = PLAYER_COLORS[seat];
  if (icon.dataset.avatar === avatar) return;
  icon.replaceChildren();
  if (!avatar) {
    delete icon.dataset.avatar;
    return;
  }
  icon.dataset.avatar = avatar;
  const image = document.createElement('img');
  image.alt = '';
  image.referrerPolicy = 'no-referrer';
  image.addEventListener('error', () => image.remove(), { once: true });
  image.src = avatar;
  icon.append(image);
}

export async function startGame(platformSession: string | null, launchToken: string | null, minimumLoadingTime: Promise<void>) {
  const scene = makeScene(canvas);
  await Promise.all([scene.prepare(), minimumLoadingTime]);
  const platformMatch = platformSession !== null || launchToken !== null;
  const timer = get('timer');
  const score = get('score');
  const stroke = get('stroke');
  const power = get('power');
  const instructions = get('instructions');
  const result = get('result');
  const replay = get<HTMLButtonElement>('replay');
  const lobby = get<HTMLDialogElement>('lobby');
  const roomButton = get<HTMLButtonElement>('room-button');
  const createRoom = get<HTMLButtonElement>('create-room');
  const joinForm = get<HTMLFormElement>('join-room');
  const lobbyStatus = get('lobby-status');
  const liveCode = get('live-code');
  const waitingRoom = get('waiting-room');
  const standings = get('standings');
  const myScore = get('my-score');
  const scores = get('scores');
  const template = get<HTMLTemplateElement>('opponent-score');
  const opponentChips = SEATS.slice(1).map(() => {
    const chip = template.content.firstElementChild!.cloneNode(true) as HTMLElement;
    scores.append(chip);
    return chip;
  });
  const capacityPicker = get<HTMLSelectElement>('room-capacity');
  capacityPicker.replaceChildren(...ROOM_SIZES.map((size) => new Option(String(size))));
  if (platformMatch) {
    get('game').classList.add('platform-match');
    get('lobby-title').textContent = 'Naka Lite match';
    get('lobby-close').textContent = 'Back to lobby';
    get('waiting-copy').textContent = 'The round starts when everyone joins.';
  }
  const audio = makeGolfAudio(get<HTMLButtonElement>('sound-toggle'));
  for (const gesture of ['click', 'pointerdown', 'touchstart', 'pointerup', 'keydown']) {
    get('game').addEventListener(gesture, audio.unlock, { capture: true, passive: true });
  }

  let ball = createBall();
  let strokes = 0;
  let deadline: number | null = null;
  let sinkTime: number | null = null;
  let finished = false;
  let aim: { angle: number; power: number } | null = null;
  let drag: { pointerId: number; origin: Point } | null = null;

  const picker = get<HTMLSelectElement>('practice-hole');
  picker.replaceChildren(...COURSES.flatMap((_, index) => LAYOUT_LABELS.map((letter, layout) =>
    new Option(`Practice ${index + 1}${letter}`, String(index + layout * COURSES.length)))));
  get('hole-count').textContent = String(COURSES.length);
  const turnover = get('turnover');
  let hole = 0;
  let layout: CourseLayout = 0;
  let lie: Point = { ...ball };
  let noticeUntil = 0;
  let waterDrops = 0;
  let practiceStartedAt: number | null = null;
  let room: RoomSnapshot | null = null;
  let seat: Seat = 0;
  let connected = false;
  let connecting = false;
  let receivedAt = 0;
  let pendingShotUntil = 0;
  let accumulator = 0;
  let displayedBall: Point = { ...ball };
  const displayedOpponents = new Map<Seat, Point & { seat: Seat }>();
  const ready = () => !lobby.open && !connecting && !finished && !ball.sunk && !moving(ball)
    && (!room || (connected && room.phase === 'playing' && performance.now() >= pendingShotUntil
      && room.players.find((p) => p.seat === seat)?.score === null));

  function cancelAim() {
    audio.stopPull();
    aim = null;
    if (drag && canvas.hasPointerCapture(drag.pointerId)) canvas.releasePointerCapture(drag.pointerId);
    drag = null;
  }

  function showLobby() {
    if (!lobby.open) {
      cancelAim();
      lobby.showModal();
    }
  }

  function cue(kind: Burst, point: Point, player: Seat) {
    scene.emit(kind, point, player);
    audio.play(kind, player === seat);
  }

  const total = (scores: number[]) => scores.reduce((sum, score) => sum + score, 0);
  const hint = () => layout === 1 ? COURSES[hole].layouts[1].hint : [
    'Pull back from the ball and release to sling it.',
    'Line up the narrow bridge and dodge the fruit baskets. A splash costs one stroke.',
    'Sand slows the ball. Aim between the columns or take the grassy way around.',
    'Ice carries the ball farther. Use a gentle shot or go around on the grass.',
    'Bank off the mosaic bumpers or pick a gap between them.',
    'Putt through the gate when it lifts, or take the path around the wall.',
    'The wall gaps alternate. Use short shots to line up the next turn.',
    'Aim through each doorway. A green signal means the gate is open.',
    'Putt through the temple arch to drop a level, or go around on the wider path.',
    'Watch the wind ribbons. Use the lane behind the rocks to stay sheltered.',
  ][hole];

  function selectHole(next: number, nextLayout: CourseLayout) {
    hole = next;
    layout = nextLayout;
    scene.setHole(hole, layout);
    get('hole-number').textContent = String(hole + 1);
    get('hole-layout').textContent = `· ${LAYOUT_LABELS[layout]}`;
    get('course-name').textContent = COURSES[hole].layouts[layout].name;
    const country = get('course-country');
    if (hole === 1) {
      const thai = document.createElement('span');
      thai.lang = 'th';
      thai.textContent = 'ไทย';
      country.replaceChildren(thai, ' · Thailand');
    } else country.textContent = COURSES[hole].country;
    waterDrops = 0;
    noticeUntil = 0;
    sinkTime = null;
    displayedOpponents.clear();
    cancelAim();
  }

  function resetPractice() {
    const selection = Number(picker.value);
    selectHole(selection % COURSES.length, selection < COURSES.length ? 0 : 1);
    ball = createBall(hole, layout);
    lie = { ...ball };
    displayedBall = { ...ball };
    strokes = 0;
    deadline = null;
    practiceStartedAt = null;
    accumulator = 0;
    finished = false;
    pendingShotUntil = 0;
    result.hidden = true;
    turnover.hidden = true;
    standings.hidden = true;
    instructions.textContent = hint();
    instructions.hidden = false;
    replay.textContent = 'Play again';
    get('result-context').textContent = `Hole ${hole + 1}${LAYOUT_LABELS[layout]} · ${COURSES[hole].layouts[layout].name}`;
  }

  function returnToPractice() {
    client.leave();
    if (platformMatch) {
      if (embedded) {
        connecting = true;
        cancelAim();
        toPlatform({ type: 'leave' });
      } else location.assign(location.pathname);
      return;
    }
    room = null;
    seat = 0;
    connecting = connected = false;
    resetPractice();
    updateRoomUI();
    lobbyStatus.textContent = '';
    if (lobby.open) lobby.close();
    canvas.focus({ preventScroll: true });
  }

  function updateRoomUI() {
    const waiting = room?.phase === 'waiting';
    const me = room?.players.find((p) => p.seat === seat);
    const opponents = room?.players.filter((player) => player.seat !== seat) ?? [];
    const grouped = (room?.capacity ?? MIN_PLAYERS) > MIN_PLAYERS;
    get('game').classList.toggle('group-match', grouped);
    get('lobby-actions').hidden = platformMatch || Boolean(room) || connecting;
    waitingRoom.hidden = !waiting;
    get('invite-code').textContent = waiting && !platformMatch ? room?.code ?? '' : '';
    roomButton.textContent = platformMatch ? 'Back to lobby' : room ? 'Leave room' : 'Play with a friend';
    picker.hidden = platformMatch || Boolean(room) || connecting;
    const running = get('running-total');
    running.hidden = grouped || !room?.players[0]?.scores.length;
    const runningText = room?.players.map((player) => `${playerName(player)} ${total(player.scores)}`).join('  ·  ') ?? '';
    if (running.textContent !== runningText) running.textContent = runningText;
    liveCode.hidden = platformMatch || !room;
    liveCode.textContent = liveCode.hidden ? '' : `Room ${room?.code}`;
    updatePlayerScore(myScore, seat, me);
    opponentChips.forEach((chip, index) => {
      const player = opponents[index];
      chip.hidden = !player;
      if (!player) return;
      const text = chip.querySelector<HTMLElement>('.score-value')!;
      const value = String(player.score ?? player.strokes);
      if (text.textContent !== value) text.textContent = value;
      updatePlayerScore(chip, player.seat, player);
    });
  }

  function updatePlayerScore(chip: HTMLElement, color: Seat, player?: PlayerSnapshot) {
    const name = chip.querySelector<HTMLElement>('.player-name')!;
    const label = player ? playerName(player) : '';
    chip.classList.toggle('offline', Boolean(player && !player.connected));
    if (player) chip.title = `${label} · ${total(player.scores)} total strokes`;
    else chip.removeAttribute('title');
    if (name.textContent !== label) name.textContent = label;
    name.hidden = !label || (!platformMatch && (room?.capacity ?? MIN_PLAYERS) === MIN_PLAYERS);
    const scoreLabel = chip === myScore ? 'Your strokes' : `${label}'s strokes`;
    if (chip.getAttribute('aria-label') !== scoreLabel) chip.setAttribute('aria-label', scoreLabel);
    setPlayerIcon(chip.querySelector<HTMLElement>('.player-icon')!, color, player?.profile?.avatar);
  }

  function finishRoom(state: RoomSnapshot) {
    if (finished) return;
    finished = true;
    cancelAim();
    const ranked = rankPlayers(state.players);
    const leaders = ranked.filter(({ rank }) => rank === 1);
    const isLeader = leaders.some(({ player }) => player.seat === seat);
    get('result-context').textContent = `${COURSES.length} holes · Final score`;
    get('result-title').textContent = !isLeader ? 'Round complete' : leaders.length > 1 ? 'Tie game!' : 'You win!';
    get('result-score').textContent = 'Fewest total strokes wins';
    standings.replaceChildren(...ranked.map(({ player, rank, score }) => {
      const row = document.createElement('li');
      row.style.color = PLAYER_COLORS[player.seat];
      const heading = document.createElement('div');
      heading.className = 'standing-player';
      const icon = document.createElement('i');
      icon.className = 'player-icon';
      icon.setAttribute('aria-hidden', 'true');
      setPlayerIcon(icon, player.seat, player.profile?.avatar);
      const label = document.createElement('span');
      label.textContent = `${rank}. ${playerName(player)}${player.seat === seat ? ' (you)' : ''} · ${score} strokes${player.forfeited ? ' · Left match' : ''}`;
      heading.append(icon, label);
      const detail = document.createElement('small');
      detail.textContent = 'By hole: ' + player.scores.join(' + ');
      row.append(heading, detail);
      return row;
    }));
    standings.hidden = false;
    replay.textContent = platformMatch ? 'Back to lobby' : 'Back to practice';
    result.hidden = false;
    replay.focus();
    if (platformMatch) toPlatform({ type: 'ended', ...(leaders.length === 1 ? { won: isLeader } : {}) });
  }

  const client = makeRoomClient(platformSession, {
    update(state, nextSeat) {
      const previous = room;
      const wasConnected = connected;
      const me = state.players.find((p) => p.seat === nextSeat);
      if (!me) return;
      if (!previous) resetPractice();
      const nextLayout = state.layouts?.[state.hole] ?? 0;
      const newHole = !previous || state.hole !== previous.hole || layout !== nextLayout;
      if (newHole) {
        selectHole(state.hole, nextLayout);
        pendingShotUntil = 0;
      }
      if (newHole || !wasConnected || me.waterDrops !== waterDrops) {
        displayedBall = { ...me.ball };
        displayedOpponents.clear();
      }
      if (me.strokes !== strokes) pendingShotUntil = 0;
      if (previous && !newHole && wasConnected) {
        for (const player of state.players) {
          const before = previous.players.find((p) => p.seat === player.seat);
          if (!before) continue;
          if ((player.ball.impacts ?? 0) > (before.ball.impacts ?? 0)) audio.play('bounce', player.seat === nextSeat);
          if (player.waterDrops > before.waterDrops && player.splash) cue('splash', player.splash, player.seat);
          else if (player.strokes > before.strokes) cue('putt', before.ball, player.seat);
          if (player.ball.sunk && !before.ball.sunk) cue('cup', player.ball, player.seat);
        }
      }
      room = state;
      seat = nextSeat;
      ball = me.ball;
      strokes = me.strokes;
      connecting = false;
      connected = true;
      receivedAt = performance.now();
      if (me.waterDrops > waterDrops && previous && !newHole) noticeUntil = receivedAt + 2400;
      waterDrops = me.waterDrops;
      if (!me.ball.sunk) sinkTime = null;
      else sinkTime ??= receivedAt;
      updateRoomUI();
      if (state.phase === 'waiting') {
        const online = state.players.filter((player) => player.connected).length;
        const progress = `${online} / ${state.capacity ?? MIN_PLAYERS} players connected`;
        if (lobbyStatus.textContent !== progress) lobbyStatus.textContent = progress;
        showLobby();
      } else {
        if (lobby.open) {
          lobby.close();
          canvas.focus({ preventScroll: true });
        }
        const offline = state.players.filter((player) => !player.connected && player.score === null).length;
        turnover.hidden = state.phase !== 'between';
        if (state.phase === 'between') {
          const next = hole + 1;
          const nextLayout = state.layouts?.[next] ?? 0;
          get('turnover-title').textContent = `Next: ${COURSES[next].layouts[nextLayout].name} · ${LAYOUT_LABELS[nextLayout]}`;
          get('turnover-scores').textContent = state.players.map((p) =>
            `${playerName(p)} ${p.score} this hole · ${total(p.scores)} total`).join('  /  ');
        }
        const notice = state.phase !== 'playing' ? ''
          : receivedAt < noticeUntil ? 'Splash! +1 stroke.'
          : offline ? `${offline} ${offline === 1 ? 'player is' : 'players are'} reconnecting…`
          : me.score !== null ? 'Waiting for the other players to finish…'
          : strokes === 0 ? hint() : '';
        if (instructions.textContent !== notice) instructions.textContent = notice;
        instructions.hidden = !notice;
        if (state.phase === 'finished') finishRoom(state);
      }
    },
    status(message) {
      connected = false;
      connecting = true;
      cancelAim();
      updateRoomUI();
      lobbyStatus.textContent = message;
      if (!room || room.phase === 'waiting') showLobby();
      else {
        instructions.textContent = message;
        instructions.hidden = false;
      }
    },
    ended(message) {
      room = null;
      seat = 0;
      connecting = connected = false;
      resetPractice();
      updateRoomUI();
      replay.textContent = 'Play again';
      lobbyStatus.textContent = message;
      showLobby();
    },
  });

  picker.addEventListener('change', () => {
    if (room) return;
    resetPractice();
    canvas.focus({ preventScroll: true });
  });
  roomButton.addEventListener('click', () => {
    if (platformMatch || room) returnToPractice();
    else showLobby();
  });
  createRoom.addEventListener('click', () => client.open({ type: 'create', capacity: Number(capacityPicker.value) }));
  joinForm.addEventListener('submit', (event) => {
    event.preventDefault();
    client.open({ type: 'join', code: get<HTMLInputElement>('room-code').value.trim().toUpperCase() });
  });
  get('lobby-close').addEventListener('click', returnToPractice);
  lobby.addEventListener('cancel', (event) => {
    event.preventDefault();
    returnToPractice();
  });
  function hud(seconds: number) {
    const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
    if (timer.textContent !== time) timer.textContent = time;
    timer.classList.toggle('urgent', seconds < 11);
    const scoreText = String(room?.players.find((p) => p.seat === seat)?.score ?? strokes);
    const strokeText = String(Math.min(strokes + 1, SHOT_LIMIT));
    const shotPower = String(Math.round((aim?.power ?? 0) * 100));
    if (score.textContent !== scoreText) score.textContent = scoreText;
    if (stroke.textContent !== strokeText) stroke.textContent = strokeText;
    if (power.getAttribute('aria-valuenow') !== shotPower) {
      power.setAttribute('aria-valuenow', shotPower);
      power.style.setProperty('--power', shotPower + '%');
    }
  }

  function finish(title: string, sunk: boolean) {
    finished = true;
    cancelAim();
    get('result-title').textContent = title;
    get('result-score').textContent = sunk ? `${strokes} ${strokes === 1 ? 'stroke' : 'strokes'}` : '7 strokes';
    result.hidden = false;
    replay.focus();
  }

  function putt() {
    const shot = aim;
    aim = null;
    audio.stopPull();
    if (!ready() || !shot || shot.power < 0.035) return;
    const now = performance.now();
    if (room) {
      if (client.send({ type: 'shot', ...shot, stroke: strokes, hole })) {
        pendingShotUntil = now + 750;
        audio.play('snap');
        scene.releaseSling(displayedBall, shot);
      }
      return;
    }
    if (deadline !== null && now >= deadline) return;
    deadline ??= now + COURSES[hole].seconds * 1000;
    lie = { x: ball.x, z: ball.z };
    audio.play('snap');
    scene.releaseSling(displayedBall, shot);
    cue('putt', ball, seat);
    strokes++;
    instructions.hidden = true;
    launch(ball, shot.angle, shot.power);
  }

  function updateDrag(x: number, y: number) {
    if (!drag) return;
    const point = scene.pointAt(x, y);
    if (!point) return;
    const dx = drag.origin.x - point.x;
    const dz = drag.origin.z - point.z;
    aim = { angle: Math.atan2(dz, dx), power: Math.min(1, Math.hypot(dx, dz) / 2.35) };
    audio.pull(aim.power);
  }

  canvas.addEventListener('pointerdown', (event) => {
    if (!ready() || drag || !event.isPrimary || event.button !== 0) return;
    const pixel = scene.ballScreenPosition(displayedBall.x, displayedBall.z);
    if (Math.hypot(event.clientX - pixel.x, event.clientY - pixel.y) > 31) return;
    const origin = scene.pointAt(event.clientX, event.clientY);
    if (!origin) return;
    drag = { pointerId: event.pointerId, origin };
    aim = null;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (drag?.pointerId === event.pointerId) updateDrag(event.clientX, event.clientY);
  });
  canvas.addEventListener('pointerup', (event) => {
    if (drag?.pointerId !== event.pointerId) return;
    updateDrag(event.clientX, event.clientY);
    drag = null;
    putt();
  });
  for (const type of ['pointercancel', 'lostpointercapture']) {
    canvas.addEventListener(type, (event) => {
      if (drag?.pointerId !== (event as PointerEvent).pointerId) return;
      drag = null;
      cancelAim();
    });
  }

  window.addEventListener('blur', cancelAim);
  canvas.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && (drag || aim)) {
      event.preventDefault();
      cancelAim();
      return;
    }
    if (!ready() || drag || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(event.key)) return;
    event.preventDefault();
    aim ??= { angle: COURSES[hole].initialAngle, power: 0.45 };
    if (event.key === 'ArrowLeft') aim.angle -= 0.05;
    if (event.key === 'ArrowRight') aim.angle += 0.05;
    if (event.key === 'ArrowUp') aim.power = Math.min(1, aim.power + 0.045);
    if (event.key === 'ArrowDown') aim.power = Math.max(0.045, aim.power - 0.045);
    if (event.key === ' ' && !event.repeat) putt();
    else if (aim) audio.pull(aim.power);
  });

  replay.addEventListener('click', () => {
    if (room) returnToPractice();
    else {
      resetPractice();
      canvas.focus({ preventScroll: true });
    }
  });
  resetPractice();
  let last = performance.now();
  function frame(now: number) {
    practiceStartedAt ??= now;
    const inPlay = room?.phase === 'playing';
    const elapsed = room ? (room.elapsedMs + (inPlay ? Math.min(now - receivedAt, 150) : 0)) / 1000
      : (now - practiceStartedAt) / 1000;
    const remaining = room ? room.remainingMs - (inPlay || room.phase === 'between' ? now - receivedAt : 0)
      : deadline === null ? COURSES[hole].seconds * 1000 : deadline - now;
    const seconds = Math.max(0, Math.ceil(remaining / 1000));
    if (!turnover.hidden) {
      const text = `Starts in ${seconds}s`;
      const counter = get('turnover-count');
      if (counter.textContent !== text) counter.textContent = text;
    }
    if (!room && !finished) {
      if (!ball.sunk && seconds === 0) {
        ball.vx = ball.vz = 0;
        finish('Time’s up', false);
      } else {
        const priorImpacts = ball.impacts ?? 0;
        accumulator += Math.min((now - last) / 1000, 0.1);
        while (accumulator >= STEP) {
          const splash = moving(ball) ? stepPutt(ball, hole, Math.max(0, elapsed - accumulator), lie, layout) : null;
          if (splash) {
            cue('splash', splash, seat);
            strokes++;
            instructions.textContent = 'Splash! +1 stroke.';
            instructions.hidden = false;
            noticeUntil = now + 2400;
          }
          accumulator -= STEP;
        }
        if ((ball.impacts ?? 0) > priorImpacts) audio.play('bounce');
        if (ball.sunk) {
          if (sinkTime === null) {
            sinkTime = now;
            cue('cup', ball, seat);
          }
          if (now - sinkTime > 480) finish(strokes === 1 ? 'Hole in one!' : 'Nicely putted!', true);
        } else if (strokes >= SHOT_LIMIT && !moving(ball)) {
          finish('Stroke limit', false);
        }
      }
    }
    if (!room && noticeUntil > 0 && now >= noticeUntil) {
      noticeUntil = 0;
      instructions.hidden = true;
    }
    const blend = 1 - Math.exp(-(now - last) / 33);
    last = now;
    hud(seconds);
    if (room && moving(ball)) {
      displayedBall.x += (ball.x - displayedBall.x) * blend;
      displayedBall.z += (ball.z - displayedBall.z) * blend;
    } else {
      displayedBall.x = ball.x;
      displayedBall.z = ball.z;
    }
    const opponents = [];
    for (const player of room?.players ?? []) {
      if (player.seat === seat || !player.connected || player.ball.sunk) {
        displayedOpponents.delete(player.seat);
        continue;
      }
      let display = displayedOpponents.get(player.seat);
      if (!display) {
        display = { x: player.ball.x, z: player.ball.z, seat: player.seat };
        displayedOpponents.set(player.seat, display);
      } else if (moving(player.ball)) {
        display.x += (player.ball.x - display.x) * blend;
        display.z += (player.ball.z - display.z) * blend;
      } else {
        display.x = player.ball.x;
        display.z = player.ball.z;
      }
      opponents.push(display);
    }
    scene.render(displayedBall, sinkTime === null ? BALL_RADIUS : BALL_RADIUS - Math.min(1, (now - sinkTime) / 260) * 0.39,
      aim, ready(), seat, opponents, elapsed);
    requestAnimationFrame(frame);
  }
  frame(last);
  const observer = new ResizeObserver(() => scene.resize());
  observer.observe(canvas);

  if (platformMatch) {
    if (platformSession && launchToken) client.open({ type: 'join-naka', sessionId: platformSession, token: launchToken });
    else if (!platformSession || !client.resume()) {
      updateRoomUI();
      lobbyStatus.textContent = 'Open the match again from the Naka Lite lobby.';
      showLobby();
    }
    toPlatform({ type: 'ready' });
  } else client.resume();
}
