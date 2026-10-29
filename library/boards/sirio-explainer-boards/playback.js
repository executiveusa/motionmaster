/* Preview adapter. Original CSS animations are unchanged; this controls their clock. */
(() => {
  let animations = [];
  const media = [...document.querySelectorAll('video')];
  const refresh = () => { animations = document.getAnimations(); };
  refresh();
  window.boardDuration = () => {
    refresh();
    return Math.max(8, ...animations.map(a => {
      const t = a.effect.getTiming();
      const duration = Number(t.duration) || 0;
      const iterations = Number.isFinite(t.iterations) ? t.iterations : 1;
      return (Math.max(0, t.delay) + duration * iterations) / 1000;
    }));
  };
  window.seek = seconds => {
    const time = Math.max(0, Number(seconds) || 0);
    refresh();
    animations.forEach(a => { a.pause(); a.currentTime = time * 1000; });
    media.forEach(v => {
      v.pause();
      if (Number.isFinite(v.duration) && v.duration > 0) {
        const target = v.loop ? time % v.duration : Math.min(time, v.duration);
        if (Math.abs(v.currentTime - target) > .035) v.currentTime = target;
      }
    });
  };
  window.playBoard = () => {
    refresh(); animations.forEach(a => a.play());
    media.forEach(v => v.play().catch(() => {}));
  };
  window.pauseBoard = () => {
    refresh(); animations.forEach(a => a.pause()); media.forEach(v => v.pause());
  };
  // Embedded gallery owns playback. Standalone boards retain their original autoplay.
  if (window.parent !== window) window.seek(0);
})();
