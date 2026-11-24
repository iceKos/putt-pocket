import type { RoomCommand, RoomMessage, RoomSnapshot, Seat } from './room-protocol';

type Session = { code: string; token: string; seat: Seat };
function storedSession(key: string): Session | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(key) ?? 'null');
    return typeof value?.code === 'string' && typeof value.token === 'string'
      && (value.seat === 0 || value.seat === 1) ? value : null;
  } catch {
    return null;
  }
}

export function makeRoomClient(platformSession: string | null, events: {
  update: (room: RoomSnapshot, seat: Seat) => void;
  status: (message: string, reconnecting: boolean) => void;
  ended: (message: string) => void;
}) {
  let socket: WebSocket | null = null;
  const storageKey = platformSession === null ? 'putt-pocket-seat' : `putt-pocket-naka-seat:${platformSession}`;
  let session = storedSession(storageKey);
  let retry: ReturnType<typeof setTimeout> | undefined;
  let retryDelay = 300;
  let connectTimeout: ReturnType<typeof setTimeout> | undefined;

  function send(command: RoomCommand): boolean {
    if (socket?.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify(command));
    return true;
  }

  function clear() {
    clearTimeout(retry);
    clearTimeout(connectTimeout);
    const previous = socket;
    socket = null;
    previous?.close();
    session = null;
    try { sessionStorage.removeItem(storageKey); } catch { /* Storage may be disabled in an iframe. */ }
  }

  function open(command: RoomCommand) {
    clearTimeout(retry);
    clearTimeout(connectTimeout);
    socket?.close();
    const endpoint = new URL('/ws', location.href);
    endpoint.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const connection = new WebSocket(endpoint);
    socket = connection;
    connectTimeout = setTimeout(() => connection.close(), command.type === 'join-naka' ? 15000 : 6000);
    events.status(command.type === 'resume' ? 'Reconnecting to your room…' : 'Connecting…', true);
    connection.addEventListener('open', () => {
      if (socket === connection) send(command);
    });
    connection.addEventListener('message', (event) => {
      if (socket !== connection) return;
      const message = JSON.parse(event.data) as RoomMessage;
      if (message.type === 'error') {
        if (message.fatal) {
          clear();
          events.ended(message.message);
        }
      } else if (message.type === 'joined') {
        clearTimeout(connectTimeout);
        retryDelay = 300;
        session = { code: message.code, token: message.token, seat: message.seat };
        try { sessionStorage.setItem(storageKey, JSON.stringify(session)); } catch { /* The match still works live. */ }
        events.update(message.room, session.seat);
      } else if (session) {
        events.update(message.room, session.seat);
      }
    });
    connection.addEventListener('close', (event) => {
      if (socket !== connection) return;
      clearTimeout(connectTimeout);
      socket = null;
      if (event.code === 4001) {
        clear();
        events.ended('This seat was opened in another tab.');
      } else if (session) {
        events.status('Connection lost. Reconnecting…', true);
        retry = setTimeout(resume, retryDelay);
        retryDelay = Math.min(3000, retryDelay * 2);
      } else {
        events.ended('Could not connect. Please try again.');
      }
    });
  }

  function resume() {
    if (!session) return false;
    open({ type: 'resume', code: session.code, token: session.token });
    return true;
  }

  return {
    send, resume, open,
    leave() {
      send({ type: 'leave' });
      clear();
    },
  };
}
