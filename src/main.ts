import './style.css';
import { COURSES, createBall, HOLE_SECONDS, launch, moving, SHOT_LIMIT, STEP, stepPutt, BALL_RADIUS, type Point } from './golf';
import { makeScene } from './scene';
import { makeRoomClient } from './room-client';
import { PLAYER_COLORS, type RoomSnapshot, type Seat } from './room-protocol';

const get = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = get<HTMLCanvasElement>('course');

function start(scene: ReturnType<typeof makeScene>) {
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

  let ball = createBall();
  let strokes = 0;
  let deadline: number | null = null;
  let sinkTime: number | null = null;
  let finished = false;
  let aim: { angle: number; power: number } | null = null;
  let drag: { pointerId: number; origin: Point } | null = null;

  const picker = get<HTMLSelectElement>('practice-hole');
  picker.replaceChildren(...COURSES.map((course, index) => new Option(`Practice ${index + 1}`, String(index))));
  get('hole-count').textContent = String(COURSES.length);
  const turnover = get('turnover');
  let hole = 0;
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
  let displayedRival: Point | null = null;
  const ready = () => !lobby.open && !connecting && !finished && !ball.sunk && !moving(ball)
    && (!room || (connected && room.phase === 'playing' && performance.now() >= pendingShotUntil
      && room.players.find((p) => p.seat === seat)?.score === null));

  function cancelAim() {
    aim = null;
    if (drag && canvas.hasPointerCapture(drag.pointerId)) canvas.releasePointerCapture(drag.pointerId);
    drag = null;
  }

  function showLobby() {
    if (!lobby.open) lobby.showModal();
  }

  const total = (scores: number[]) => scores.reduce((sum, score) => sum + score, 0);
  const hint = () => [
    'Drag back from the ball and release to putt.',
    'Cross the bridge or go around the water. A splash costs one stroke.',
    'Time your putt between the blades or go around the mill.',
    'Use more power over the ridge, or take the flatter route around it.',
    'Bank off the mosaic bumpers or pick a gap between them.',
    'Putt through the gate when it lifts, or take the path around the wall.',
  ][hole];

  function selectHole(next: number) {
    hole = next;
    scene.setHole(hole);
    get('hole-number').textContent = String(hole + 1);
    get('course-name').textContent = COURSES[hole].name;
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
    displayedRival = null;
    cancelAim();
  }

  function resetPractice() {
    selectHole(Number(picker.value));
    ball = createBall(hole);
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
    get('result-context').textContent = `Hole ${hole + 1} · ${COURSES[hole].name}`;
  }

  function returnToPractice() {
    client.leave();
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
    const rival = room?.players.find((p) => p.seat !== seat);
    get('lobby-actions').hidden = Boolean(room) || connecting;
    waitingRoom.hidden = !waiting;
    get('invite-code').textContent = waiting ? room?.code ?? '' : '';
    roomButton.textContent = room ? 'Leave room' : 'Play with a friend';
    picker.hidden = Boolean(room) || connecting;
    const running = get('running-total');
    running.hidden = !room?.players[0]?.scores.length;
    const runningText = room?.players.map((player) => `${player.seat === 0 ? 'White' : 'Blue'} ${total(player.scores)}`).join('  ·  ') ?? '';
    if (running.textContent !== runningText) running.textContent = runningText;
    liveCode.hidden = !room;
    liveCode.textContent = room ? `Room ${room.code}` : '';
    get('my-color').style.backgroundColor = PLAYER_COLORS[seat];
    const rivalScore = get('rival-score');
    rivalScore.hidden = !rival;
    if (rival) {
      const value = String(rival.score ?? rival.strokes);
      const text = get('rival-strokes');
      if (text.textContent !== value) text.textContent = value;
      rivalScore.querySelector('i')!.style.backgroundColor = PLAYER_COLORS[rival.seat];
    }
  }

  function finishRoom(state: RoomSnapshot) {
    if (finished) return;
    finished = true;
    cancelAim();
    const ranked = [...state.players].sort((a, b) => total(a.scores) - total(b.scores));
    const tied = total(ranked[0].scores) === total(ranked[1].scores);
    get('result-context').textContent = `${COURSES.length} holes · Final score`;
    get('result-title').textContent = tied ? 'Tie game!' : ranked[0].seat === seat ? 'You win!' : 'Round complete';
    get('result-score').textContent = 'Fewest total strokes wins';
    standings.replaceChildren(...ranked.map((player, index) => {
      const row = document.createElement('li');
      row.style.color = PLAYER_COLORS[player.seat];
      const name = player.seat === 0 ? 'White' : 'Blue';
      row.textContent = `${tied ? 1 : index + 1}. ${name}${player.seat === seat ? ' (you)' : ''} · ${total(player.scores)} strokes`;
      const detail = document.createElement('small');
      detail.textContent = 'By hole: ' + player.scores.join(' + ');
      row.append(detail);
      return row;
    }));
    standings.hidden = false;
    replay.textContent = 'Back to practice';
    result.hidden = false;
    replay.focus();
  }

  const client = makeRoomClient({
    update(state, nextSeat) {
      const previous = room;
      const wasConnected = connected;
      const me = state.players.find((p) => p.seat === nextSeat);
      if (!me) return;
      if (!previous) resetPractice();
      const newHole = !previous || state.hole !== previous.hole;
      if (newHole) {
        selectHole(state.hole);
        pendingShotUntil = 0;
      }
      if (newHole || !wasConnected || me.waterDrops !== waterDrops) {
        displayedBall = { ...me.ball };
        displayedRival = null;
      }
      if (me.strokes !== strokes) pendingShotUntil = 0;
      if (previous && !newHole && wasConnected) {
        for (const player of state.players) {
          const before = previous.players.find((p) => p.seat === player.seat);
          if (!before) continue;
          if (player.waterDrops > before.waterDrops && player.splash) scene.emit('splash', player.splash, player.seat);
          else if (player.strokes > before.strokes) scene.emit('putt', before.ball, player.seat);
          if (player.ball.sunk && !before.ball.sunk) scene.emit('cup', player.ball, player.seat);
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
        lobbyStatus.textContent = state.players.length === 2 ? 'Waiting for your friend to reconnect…' : '';
        showLobby();
      } else {
        if (lobby.open) {
          lobby.close();
          canvas.focus({ preventScroll: true });
        }
        const rival = state.players.find((p) => p.seat !== seat);
        turnover.hidden = state.phase !== 'between';
        if (state.phase === 'between') {
          get('turnover-title').textContent = `Next: ${COURSES[hole + 1].name}`;
          get('turnover-scores').textContent = state.players.map((p) =>
            `${p.seat === 0 ? 'White' : 'Blue'} ${p.score} this hole · ${total(p.scores)} total`).join('  /  ');
        }
        const notice = state.phase !== 'playing' ? ''
          : receivedAt < noticeUntil ? 'Splash! +1 stroke.'
          : !rival?.connected ? 'Your friend is offline. They can rejoin unless they left the room.'
          : me.score !== null ? 'Waiting for your friend to finish…'
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
    if (room) returnToPractice();
    else showLobby();
  });
  createRoom.addEventListener('click', () => client.open({ type: 'create' }));
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
    drag = null;
    aim = null;
    get('result-title').textContent = title;
    get('result-score').textContent = sunk ? `${strokes} ${strokes === 1 ? 'stroke' : 'strokes'}` : '7 strokes';
    result.hidden = false;
    replay.focus();
  }

  function putt() {
    const shot = aim;
    aim = null;
    if (!ready() || !shot || shot.power < 0.035) return;
    const now = performance.now();
    if (room) {
      if (client.send({ type: 'shot', ...shot, stroke: strokes, hole })) pendingShotUntil = now + 750;
      return;
    }
    if (deadline !== null && now >= deadline) return;
    deadline ??= now + HOLE_SECONDS * 1000;
    lie = { x: ball.x, z: ball.z };
    scene.emit('putt', ball, seat);
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
      aim = null;
    });
  }

  canvas.addEventListener('keydown', (event) => {
    if (!ready() || drag || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Escape'].includes(event.key)) return;
    event.preventDefault();
    aim ??= { angle: COURSES[hole].initialAngle, power: 0.45 };
    if (event.key === 'ArrowLeft') aim.angle -= 0.05;
    if (event.key === 'ArrowRight') aim.angle += 0.05;
    if (event.key === 'ArrowUp') aim.power = Math.min(1, aim.power + 0.045);
    if (event.key === 'ArrowDown') aim.power = Math.max(0.045, aim.power - 0.045);
    if (event.key === ' ' && !event.repeat) putt();
    if (event.key === 'Escape') aim = null;
  });

  replay.addEventListener('click', () => {
    if (room) returnToPractice();
    else {
      resetPractice();
      canvas.focus({ preventScroll: true });
    }
  });
  resetPractice();
  client.resume();

  const observer = new ResizeObserver(() => scene.resize());
  observer.observe(canvas);
  let last = performance.now();
  function frame(now: number) {
    practiceStartedAt ??= now;
    const inPlay = room?.phase === 'playing';
    const elapsed = room ? (room.elapsedMs + (inPlay ? Math.min(now - receivedAt, 150) : 0)) / 1000
      : (now - practiceStartedAt) / 1000;
    const remaining = room ? room.remainingMs - (inPlay || room.phase === 'between' ? now - receivedAt : 0)
      : deadline === null ? HOLE_SECONDS * 1000 : deadline - now;
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
        accumulator += Math.min((now - last) / 1000, 0.1);
        while (accumulator >= STEP) {
          const splash = moving(ball) ? stepPutt(ball, hole, Math.max(0, elapsed - accumulator), lie) : null;
          if (splash) {
            scene.emit('splash', splash, seat);
            strokes++;
            instructions.textContent = 'Splash! +1 stroke.';
            instructions.hidden = false;
            noticeUntil = now + 2400;
          }
          accumulator -= STEP;
        }
        if (ball.sunk) {
          if (sinkTime === null) {
            sinkTime = now;
            scene.emit('cup', ball, seat);
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
    const rival = room?.players.find((p) => p.seat !== seat);
    if (room && moving(ball)) {
      displayedBall.x += (ball.x - displayedBall.x) * blend;
      displayedBall.z += (ball.z - displayedBall.z) * blend;
    } else {
      displayedBall.x = ball.x;
      displayedBall.z = ball.z;
    }
    if (rival) {
      displayedRival ??= { x: rival.ball.x, z: rival.ball.z };
      displayedRival.x += (rival.ball.x - displayedRival.x) * blend;
      displayedRival.z += (rival.ball.z - displayedRival.z) * blend;
    }
    scene.render(displayedBall, sinkTime === null ? BALL_RADIUS : BALL_RADIUS - Math.min(1, (now - sinkTime) / 260) * 0.39,
      aim, ready(), seat, rival && displayedRival ? { ...displayedRival, sunk: rival.ball.sunk } : undefined, elapsed);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

try {
  start(makeScene(canvas));
} catch (error) {
  console.error(error);
  get('game-error').hidden = false;
}
