import { embedded, sessionIdFromUrl, takeLaunchToken, toPlatform } from '../docs/game-kit/naka-platform.client';

const boot = document.getElementById('boot')!;
const game = document.getElementById('game')!;
const status = document.getElementById('boot-status')!;
const activity = document.getElementById('boot-activity')!;
const retry = document.getElementById('boot-retry')!;
const platformSession = sessionIdFromUrl();
const launchToken = takeLaunchToken();
const returnToLobby = embedded && (platformSession !== null || launchToken !== null);

retry.addEventListener('click', () => {
  if (returnToLobby) toPlatform({ type: 'leave' });
  else location.reload();
});

async function loadGame() {
  const minimumLoadingTime = new Promise<void>((resolve) => setTimeout(resolve, 2000));
  try {
    const { startGame } = await import('./main');
    await startGame(platformSession, launchToken, minimumLoadingTime);
    game.inert = false;
    boot.remove();
  } catch (error) {
    console.error('Putt Pocket could not start', error);
    status.textContent = returnToLobby
      ? 'Could not load the course. Start the match again from the lobby.'
      : 'Could not load the course. Please try again.';
    if (returnToLobby) {
      retry.textContent = 'Back to lobby';
      toPlatform({ type: 'ready' });
    }
    activity.hidden = true;
    retry.hidden = false;
  }
}

void loadGame();
