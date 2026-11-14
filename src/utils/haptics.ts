// Zero-dependency Vibration API wrapper for subtle mobile haptic feedback

class SpaceHapticsEngine {
  public enabled = true;
  private lastVibrateAt = 0;

  private vibrate(pattern: number | number[], bypassCooldown = false): boolean {
    if (!this.enabled || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
      return false;
    }

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (!bypassCooldown && now - this.lastVibrateAt < 35) {
      return false;
    }

    try {
      const ok = navigator.vibrate(pattern);
      this.lastVibrateAt = now;
      return Boolean(ok);
    } catch {
      return false;
    }
  }

  // Subtle detent tick when dragging or stepping power sliders
  public tick() {
    this.vibrate(10, true);
  }

  // Soft tap for general buttons & option cards
  public click() {
    this.vibrate(14, false);
  }

  // Energetic double pulse on Launch / Run Simulation / Shields Locked
  public launch() {
    this.vibrate([16, 26, 22], true);
  }

  // Gentle double buzz when hitting power grid cap
  public limit() {
    this.vibrate([12, 28, 12], true);
  }

  // Alert pulse on solar flare crisis or radiation impact
  public alert() {
    this.vibrate([28, 36, 28], true);
  }
}

export const haptics = new SpaceHapticsEngine();
