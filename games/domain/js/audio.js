"use strict";
/** Local audio playback with one voice at a time and persistent mute support. */
const domainAudio = (() => {
  const active = new Set();
  let music = null;
  let voice = null;
  let musicFile = "";
  let muted = localStorage.getItem("domain-muted") === "1";
  function stopAll() {
    for (const audio of active) audio.pause();
    active.clear();
    music = null;
    musicFile = "";
    voice = null;
  }
  function play(file, loop = false) {
    if (muted || document.hidden) return null;
    if (loop && music && musicFile === file) {
      music.play().catch(() => {});
      return music;
    }
    const audio = new Audio("assets/audio/" + file + ".mp3?v=owner-remake3");
    audio.loop = loop;
    audio.volume = loop ? (voice ? 0.08 : 0.22) : 0.8;
    if (loop) {
      music?.pause();
      if (music) active.delete(music);
      music = audio;
      musicFile = file;
    } else {
      voice?.pause();
      if (voice) active.delete(voice);
      voice = audio;
      if (music) music.volume = 0.08;
    }
    active.add(audio);
    audio.onended = () => {
      active.delete(audio);
      if (voice === audio) voice = null;
      if (music) music.volume = 0.22;
    };
    audio.play().catch(() => active.delete(audio));
    return audio;
  }
  function setMuted(value) {
    muted = value;
    localStorage.setItem("domain-muted", value ? "1" : "0");
    if (muted) stopAll();
  }
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopAll();
  });
  return { play, setMuted, stopAll };
})();
