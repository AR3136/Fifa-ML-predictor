interface CelebrationOptions {
  type: 'prediction' | 'knockout' | 'tournament' | 'champion' | 'monteCarlo';
}

let activeIntervals: any[] = [];

export const triggerCelebration = async (options: CelebrationOptions) => {
  // Respect user preference for reduced motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    console.log('Skipping confetti: user prefers reduced motion');
    return;
  }

  // Clear any existing active celebration intervals to prevent overlapping
  activeIntervals.forEach(interval => clearInterval(interval));
  activeIntervals = [];

  try {
    // Lazy-load canvas-confetti
    const confettiModule = await import('canvas-confetti');
    const confetti = confettiModule.default;

    const isChampion = options.type === 'tournament' || options.type === 'champion';
    const duration = isChampion ? 5500 : 3500;
    const end = Date.now() + duration;
    
    // FIFA Themed colors: Gold, Blue, White, Green, Red
    const colors = ['#FFD700', '#1E40AF', '#FFFFFF', '#15803D', '#DC2626'];

    const defaults = { 
      startVelocity: isChampion ? 40 : 30, 
      spread: 360, 
      ticks: 60, 
      zIndex: 9999 
    };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval = setInterval(() => {
      const timeLeft = end - Date.now();

      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }

      // Increase confetti density by approximately 2x for tournament champion
      const particleCount = isChampion ? 120 : 60;

      // Confetti shoots from left side
      confetti({
        ...defaults,
        particleCount,
        colors,
        origin: { x: randomInRange(0.05, 0.25), y: Math.random() - 0.2 }
      });

      // Confetti shoots from right side
      confetti({
        ...defaults,
        particleCount,
        colors,
        origin: { x: randomInRange(0.75, 0.95), y: Math.random() - 0.2 }
      });
    }, 200);

    activeIntervals.push(interval);
  } catch (err) {
    console.error('Failed to trigger confetti:', err);
  }
};
