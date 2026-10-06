let context: AudioContext | null = null;

export function unlockAudio(): void {
  try {
    if (!context) {
      context = new AudioContext();
    }
    void context.resume();
  } catch {
    context = null;
  }
}

function beep(frequency: number, duration: number, gainValue: number): void {
  if (!context) {
    return;
  }
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = frequency;
  gain.gain.value = gainValue;
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
  oscillator.stop(context.currentTime + duration);
}

export function playClick(muted: boolean): void {
  if (muted) {
    return;
  }
  beep(820, 0.05, 0.05);
}

export function playMatch(muted: boolean): void {
  if (muted) {
    return;
  }
  beep(520, 0.07, 0.06);
  beep(780, 0.1, 0.05);
}

export function playFail(muted: boolean): void {
  if (muted) {
    return;
  }
  beep(180, 0.22, 0.07);
}
