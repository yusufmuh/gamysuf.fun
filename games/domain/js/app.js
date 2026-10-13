"use strict";
/** @typedef {{id:string,name:string,group:string}} CastCharacter */
/** @typedef {{id:string,track:string,name:string,detail:string,alternative:string,terms:string,image:string,enabled:boolean,stock:number}} FestivalReward */
/** @typedef {{id:string,requestId:string,demo:boolean,activity:string,controlMode:string,duration:number,queueNumber:number|null,host:{id:string,performer:string},reward:FestivalReward}} FestivalResult */
/** @typedef {{setCharacter:(id:string)=>Promise<void>,setAction:(name:string)=>void,aim:(x:number,y:number)=>void,resize:()=>void,dispose:()=>void}} BipyStage */
const $ = (id) => document.getElementById(id);
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const choice = {
  character: "gojo",
  activity: "infinity",
  rewardTrack: "fanservice",
};
const confirmedRoster = [
  ["gojo", "Gojo Satoru", "gojo"],
  ["geto", "Suguru Geto", "geto"],
  ["yuji", "Yuji Itadori", "gojo"],
  ["megumi", "Megumi Fushiguro", "gojo"],
  ["nobara", "Nobara Kugisaki", "gojo"],
  ["sukuna", "Ryomen Sukuna", "geto"],
  ["yuta", "Yuta Okkotsu", "gojo"],
  ["maki", "Maki Zenin", "gojo"],
  ["toge", "Toge Inumaki", "gojo"],
  ["panda", "Panda", "gojo"],
  ["nanami", "Kento Nanami", "gojo"],
  ["toji", "Toji Fushiguro", "geto"],
  ["kenjaku", "Kenjaku", "geto"],
].map(([id, name, group]) => ({ id, name, group }));
let cosmetic = localStorage.getItem("domain-cosmetic") || "gojo";
if (!confirmedRoster.some((item) => item.id === cosmetic)) cosmetic = "gojo";
let state = null,
  pending = null,
  retry = null,
  busy = false;
let muted = localStorage.getItem("domain-muted") === "1";
/** @type {BipyStage|null} */ let homeStage = null;
/** @type {BipyStage|null} */ let castStage = null;
/** @type {BipyStage|null} */ let resultStage = null;
let noticeTimeout = 0;
const viewPreference=localStorage.getItem('domain-view')||'illustration';
document.body.dataset.visual=viewPreference==='model'?'model':'illustration';
document.querySelectorAll('[data-view]').forEach(button=>{
  button.setAttribute('aria-pressed',String(button.dataset.view===document.body.dataset.visual));
  button.onclick=()=>{
    document.body.dataset.visual=button.dataset.view;
    localStorage.setItem('domain-view',button.dataset.view);
    document.querySelectorAll('[data-view]').forEach(item=>item.setAttribute('aria-pressed',String(item.dataset.view===button.dataset.view)));
  };
});
function sound(file, loop = false) {
  return domainAudio.play(file, loop);
}
function notify(message) {
  clearTimeout(noticeTimeout);
  $("notice").textContent = message;
  $("notice").hidden = false;
  noticeTimeout = setTimeout(() => ($("notice").hidden = true), 7000);
}
/** Same-origin requests; a failed reservation retains its identity for a safe retry. */
async function api(path, body) {
  const response = await fetch("/api/" + path, {
    method: body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      "x-bpedia-client": "domainfestival",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error || "Permintaan belum berhasil.");
    error.status = response.status;
    throw error;
  }
  return data;
}
function selectedButtons(container, value, attribute = "value") {
  $(container)
    .querySelectorAll("button")
    .forEach((button) => {
      const active = button.dataset[attribute] === value;
      button.classList.toggle("selected", active);
      button.setAttribute("aria-pressed", String(active));
    });
}
function setTheme(host) {
  const dark = host === "geto";
  document.body.classList.toggle("theme-geto", dark);
  document.body.classList.toggle("theme-gojo", !dark);
  document.querySelector('meta[name="theme-color"]').content = dark
    ? "#0d061a"
    : "#e8f7ff";
  $("domainTitle").innerHTML = dark
    ? "SUMMON<br><span>SHADOWS.</span>"
    : "ENTER THE<br><span>INFINITY.</span>";
  $("domainCopy").textContent = dark
    ? "Di antara bayangan kuil, spirit menunggu. Bersama Bipy, bangkitkan kekuatan yang tersembunyi."
    : "Langit terbuka. Energi menyatu. Bersama Bipy, lepaskan kekuatan domainmu.";
  $("domainIndex").textContent = dark ? "DOMAIN / 02" : "DOMAIN / 01";
  $("domainEnvironment").textContent = dark
    ? "THE SHADOW SHRINE"
    : "THE INFINITE SKY";
  $("worldKanji").textContent = dark ? "呪霊" : "無限";
  document.querySelector(".brand img").src = dark
    ? "assets/brand/bpedia-white.webp"
    : "assets/brand/bpedia-pink.webp";
}
function screens(active) {
  for (const id of ["home", "playScreen", "resultScreen"])
    $(id).hidden = id !== active;
  document.body.classList.toggle("is-playing", active === "playScreen");
  window.scrollTo(0, 0);
  placePV(active);
  requestAnimationFrame(() => {
    homeStage?.resize();
    castStage?.resize();
    resultStage?.resize();
  });
}
/** Wait for the local module to initialize without blocking the interface. */
async function rendererReady() {
  for (let attempts = 0; attempts < 150; attempts++) {
    if (window.Bipy3D?.create) return window.Bipy3D;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Renderer 3D tidak tersedia.");
}
function compatibilityStage(container, character) {
  container.replaceChildren();
  const wrapper = document.createElement("div");
  wrapper.className = "fallback-stage";
  const img = document.createElement(["gojo","geto","kenjaku"].includes(character)?"img":"div");
  img.className='fallback-actor';
  img.setAttribute('aria-label','Bipy '+character+' dalam mode kompatibilitas 2D');
  if(img.tagName==='IMG')img.src=`assets/characters/${character}-master.png?v=clash5`;
  else {const index=confirmedRoster.findIndex(item=>item.id===character);img.classList.add('fallback-portrait');img.style.backgroundPosition=`${(index%4)*100/3}% ${Math.floor(index/4)*50}%`;}
  const label = document.createElement("p");
  label.textContent = "Mode kompatibilitas 2D · WebGL tidak tersedia";
  wrapper.append(img, label);
  container.append(wrapper);
  container.dataset.loadedCharacter=character;
  container.dataset.renderer='compatibility-2d';
}
/** @returns {Promise<BipyStage|null>} */
async function createBipyStage(container, character, mode) {
  try {
    const renderer = await rendererReady();
    container.replaceChildren();
    const stage = await renderer.create({ container, character, mode });
    return stage;
  } catch (error) {
    compatibilityStage(container, character);
    return {
      async setCharacter(id){compatibilityStage(container,id);},
      setAction(name){container.dataset.action=name;},
      aim(x,y){const actor=container.querySelector('.fallback-actor');if(actor)actor.style.translate=`${x*12}px ${y*8}px`;},
      resize(){const actor=container.querySelector('.fallback-actor');if(actor&&container.clientHeight)actor.style.maxHeight=container.clientHeight*.85+'px';},
      dispose(){container.replaceChildren();}
    };
  }
}
async function selectCosmetic(id) {
  if (!confirmedRoster.some((item) => item.id === id)) return;
  cosmetic = id;
  localStorage.setItem("domain-cosmetic", id);
  const item = confirmedRoster.find((item) => item.id === id);
  $("characterName").textContent = "Bipy " + item.name;
  $("castPreviewName").textContent = "Bipy " + item.name;
  $("characterTag").textContent =
    id === "kenjaku" ? "KENJAKU / CURSED SPIRIT" : id === "geto" ? "SUGURU GETO / CURSED SPIRIT" : "BIPY COSPLAY UNIVERSE";
  $("castGallery")
    .querySelectorAll("button")
    .forEach((button) => {
      const active = button.dataset.character === id;
      button.classList.toggle("selected", active);
      button.setAttribute("aria-pressed", String(active));
    });
  await Promise.all([homeStage?.setCharacter(id), castStage?.setCharacter(id)]);
  homeStage?.setAction("idle");
  castStage?.setAction("idle");
}
function renderCast() {
  const search = $("castSearch").value.trim().toLowerCase();
  const roster = (window.Bipy3D?.characters || confirmedRoster).filter((item) =>
    item.name.toLowerCase().includes(search),
  );
  $("castGallery").replaceChildren();
  $("castCount").textContent = roster.length + " / " + confirmedRoster.length + " KARAKTER";
  for (const [index, item] of roster.entries()) {
    const button = document.createElement("button");
    button.className = "cast-choice";
    button.dataset.character = item.id;
    const mark = document.createElement("span");
    mark.className = "cast-portrait";
    mark.setAttribute('aria-hidden','true');
    const atlasIndex=confirmedRoster.findIndex(character=>character.id===item.id);
    if(item.id==='kenjaku'){mark.style.backgroundImage='url(assets/characters/kenjaku-master.png)';mark.style.backgroundSize='contain';}
    else mark.style.backgroundPosition=`${(atlasIndex%4)*100/3}% ${Math.floor(atlasIndex/4)*50}%`;
    mark.style.animationDelay=`${atlasIndex*-.37}s`;
    const caption = document.createElement("div"),
      name = document.createElement("strong"),
      tag = document.createElement("small");
    name.textContent = item.name;
    tag.textContent = item.id==='geto'?'SUGURU · ORIGINAL':item.id==='kenjaku'?'KENJAKU · JAHITAN DAHI':'BIPY COSPLAY';
    caption.append(name, tag);
    button.append(mark, caption);
    const selected = item.id === cosmetic;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
    button.onclick = () =>
      selectCosmetic(item.id).catch(() =>
        notify("Pratinjau belum dapat diperbarui."),
      );
    $("castGallery").append(button);
  }
  if (!roster.length) {
    const text = document.createElement("p");
    text.className = "micro";
    text.textContent = "Karakter tidak ditemukan. Coba nama lain.";
    $("castGallery").append(text);
  }
}
/** Build the reward menu from the authoritative server catalog. */
function renderRewards() {
  if (!state) return;
  const all = state.rewards || [];
  const demo = state.settings.mode !== "live";
  $("fanserviceCount").textContent = all.filter(
    (item) => item.track === "fanservice",
  ).length;
  $("beautyCount").textContent = all.filter(
    (item) => item.track === "beauty",
  ).length;
  $("rewardAvailability").textContent = demo
    ? "Menu demo · hasil tidak dapat diklaim"
    : "Ketersediaan sesuai stok festival";
  selectedButtons("rewardTabs", choice.rewardTrack, "track");
  $("rewardList").replaceChildren();
  const rewards = all.filter((item) => item.track === choice.rewardTrack);
  for (const [index, reward] of rewards.entries()) {
    const row = document.createElement("article");
    row.className = "reward-row";
    if (reward.track === "beauty" && reward.image) {
      const image = document.createElement("img");
      image.className = "reward-image";
      image.src = reward.image;
      image.alt = reward.name;
      image.loading = "lazy";
      row.append(image);
    } else {
      const number = document.createElement("div");
      number.className = "reward-number";
      number.textContent = String(index + 1).padStart(2, "0");
      row.append(number);
    }
    const copy = document.createElement("div"),
      label = document.createElement("span"),
      name = document.createElement("h3"),
      detail = document.createElement("p");
    label.className = "availability-label";
    label.textContent = demo
      ? "PRATINJAU FESTIVAL"
      : reward.enabled && reward.stock > 0
        ? "TERSEDIA"
        : "BELUM TERSEDIA";
    name.textContent = reward.name;
    detail.textContent = reward.detail;
    copy.append(label, name, detail);
    if (reward.alternative) {
      const alternative = document.createElement("p");
      alternative.textContent = "Tanpa sentuhan: " + reward.alternative;
      copy.append(alternative);
    }
    if (reward.terms) {
      const disclosure = document.createElement("details"),
        summary = document.createElement("summary"),
        terms = document.createElement("p");
      summary.textContent = "Lihat syarat hadiah +";
      terms.textContent = reward.terms;
      disclosure.append(summary, terms);
      copy.append(disclosure);
    }
    row.append(copy);
    $("rewardList").append(row);
  }
  if (!rewards.length) {
    const message = document.createElement("p");
    message.className = "micro";
    message.textContent =
      "Menu hadiah untuk jalur ini belum dikonfigurasi petugas.";
    $("rewardList").append(message);
  }
}
$("castSearch").oninput = renderCast;
$("characters")
  .querySelectorAll("button")
  .forEach(
    (button) =>
      (button.onclick = () => {
        choice.character = button.dataset.value;
        choice.activity = choice.character === "gojo" ? "infinity" : "seal";
        selectedButtons("characters", choice.character);
        selectedButtons("activities", choice.activity);
        setTheme(choice.character);
        selectCosmetic(choice.character).catch(() => {});
      }),
  );
for (const [container, key] of [
  ["activities", "activity"],
  ["tracks", "rewardTrack"],
]) {
  $(container)
    .querySelectorAll("button")
    .forEach(
      (button) =>
        (button.onclick = () => {
          choice[key] = button.dataset.value;
          selectedButtons(container, choice[key]);
          if (key === "rewardTrack") renderRewards();
        }),
    );
  selectedButtons(container, choice[key]);
}
$("rewardTabs")
  .querySelectorAll("button")
  .forEach(
    (button) =>
      (button.onclick = () => {
        choice.rewardTrack = button.dataset.track;
        selectedButtons("tracks", choice.rewardTrack);
        renderRewards();
      }),
  );
selectedButtons("characters", choice.character);
document.querySelectorAll("[data-pose]").forEach(
  (button) =>
    (button.onclick = () => {
      const action = button.dataset.pose;
      const preview = button.closest(".cast-preview");
      (preview ? castStage : homeStage)?.setAction(action);
      setTimeout(
        () => (preview ? castStage : homeStage)?.setAction("idle"),
        2600,
      );
    }),
);
function updateMute() {
  $("mute").textContent = muted ? "♩" : "♪";
  $("mute").setAttribute(
    "aria-label",
    muted ? "Aktifkan suara" : "Matikan suara",
  );
}
$("mute").onclick = () => {
  muted = !muted;
  domainAudio.setMuted(muted);
  updateMute();
  if (!muted) sound("bpedia-owner-bgm", true);
};
updateMute();
async function refresh() {
  try {
    state = await api("state");
    $("modeLabel").textContent =
      state.settings.mode === "live"
        ? "Festival resmi · klaim di booth"
        : "Mode demo · hadiah tidak dapat diklaim";
    renderRewards();
    if (state.pending) {
      pending = state.pending;
      retry = null;
      localStorage.removeItem("domain-request");
      const launch = new URL(location.href);
      if (launch.searchParams.get("booth") === "1") {
        history.replaceState(null, "", "index.html");
        setTheme(pending.host.id);
        runGame(pending, {
          character: pending.host.id,
          cosmetic,
          activity: pending.activity,
          controlMode: pending.controlMode,
        });
      } else showResult(pending);
    }
  } catch (error) {
    $("modeLabel").textContent = "Koneksi belum tersedia";
    notify(error.message);
  }
}
async function start(controlMode) {
  if (busy || pending) return;
  busy = true;
  sound("bpedia-owner-bgm", true);
  $("auto").disabled = $("touch").disabled = true;
  try {
    const payload = retry || {
      requestId: crypto.randomUUID(),
      ...choice,
      controlMode,
      comfort: "no-touch",
      consent: false,
      recording: false,
    };
    retry = payload;
    localStorage.setItem("domain-request", JSON.stringify(payload));
    const result = await api("play", payload);
    pending = result;
    retry = null;
    localStorage.removeItem("domain-request");
    setTheme(payload.character);
    runGame(result, { ...payload, cosmetic });
  } catch (error) {
    if (error.status && error.status < 500) {
      retry = null;
      localStorage.removeItem("domain-request");
      notify(error.message);
    } else
      notify(
        error.message +
          " Tekan lagi untuk mengulang permintaan yang sama dengan aman.",
      );
  } finally {
    busy = false;
    $("auto").disabled = $("touch").disabled = false;
  }
}
$("auto").onclick = () => start("auto");
$("touch").onclick = () => start("touch");
/** @param {FestivalResult} result */
function showResult(result) {
  screens("resultScreen");
  setTheme(result.host.id);
  domainAudio.stopAll();
  const reward = result.reward;
  $("ticketCode").textContent = "TIKET " + result.id;
  $("rewardTerms").textContent = [
    result.demo ? "" : reward.terms,
    reward.alternative ? "Tanpa sentuhan: " + reward.alternative : "",
    result.host.performer ? "Host: " + result.host.performer : "",
  ]
    .filter(Boolean)
    .join(" · ");
  $("rewardArt").hidden = reward.track !== "beauty" || !reward.image;
  if (reward.image) $("rewardArt").src = reward.image;
  $("resultMode").textContent = result.demo
    ? "DEMO · DOMAIN UNLOCKED"
    : "DOMAIN UNLOCKED";
  $("rewardName").textContent = reward.name;
  $("rewardDescription").textContent = reward.detail;
  $("queueNumber").textContent = result.demo
    ? "DEMO"
    : String(result.queueNumber);
  $("claimInfo").textContent = result.demo
    ? "Ini simulasi. Hasil demo tidak dapat diklaim."
    : "Tunjukkan kode tiket ini kepada petugas booth Bpedia untuk verifikasi dan klaim.";
  $("resultExtra").textContent = result.demo
    ? "Coba domain lain atau temukan Bipy favoritmu."
    : "Interaksi mengikuti kenyamanan peserta dan petugas.";
  sound(result.host.id + "-victory");
  resultStage?.dispose();
  resultStage = null;
  createBipyStage($("result3d"), cosmetic, "result").then((stage) => {
    if ($("resultScreen").hidden) {
      stage?.dispose();
      return;
    }
    resultStage = stage;
    stage?.setAction("victory");
  });
}
$("ack").onclick = async () => {
  if (!pending) return;
  $("ack").disabled = true;
  try {
    await api("result", { id: pending.id });
    pending = null;
    resultStage?.dispose();
    resultStage = null;
    $("result3d").replaceChildren();
    domainAudio.stopAll();
    sound("bpedia-owner-jingle");
    setTheme(choice.character);
    selectedButtons('characters',choice.character);
    screens("home");
    homeStage?.setAction("dance");
    setTimeout(() => homeStage?.setAction("idle"), 32000);
    await refresh();
  } catch (error) {
    notify(error.message);
  } finally {
    $("ack").disabled = false;
  }
};
/** One reusable muted PV player; the native player is exposed in cinema view. */
let pvFrame = null;
let pvSource = "";
let pvPlaying = true;
let pvViewerOpen = false;
function resizePV() {
  if (!pvFrame || !pvFrame.parentElement) return;
  if (pvFrame.parentElement.id === "cinematicPlayer") {
    pvFrame.style.width = "100%";
    pvFrame.style.height = "100%";
    return;
  }
  const rect = pvFrame.parentElement.getBoundingClientRect();
  const unit = Math.max(rect.width / 16, rect.height / 9);
  pvFrame.style.width = unit * 16 + "px";
  pvFrame.style.height = unit * 9 + "px";
}
function updatePVPlayback() {
  if (!pvFrame) return;
  const shouldPlay = pvPlaying && !document.hidden && $("resultScreen").hidden;
  if (pvFrame.tagName === "IFRAME") {
    const next = shouldPlay ? pvSource : "about:blank";
    if (pvFrame.getAttribute("src") !== next) pvFrame.src = next;
  } else if (shouldPlay) pvFrame.play().catch(() => {});
  else pvFrame.pause();
  $("pvToggle").textContent = pvPlaying
    ? "Matikan latar PV Ⅱ"
    : "Putar latar PV ▷";
  $("pvToggle").setAttribute("aria-pressed", String(pvPlaying));
}
function placePV(screen = "home") {
  if (!pvFrame) return;
  if (screen === "playScreen") pvViewerOpen = false;
  const target =
    screen === "playScreen"
      ? $("arenaPV")
      : pvViewerOpen
        ? $("cinematicPlayer")
        : $("heroPV");
  if (pvFrame.parentElement !== target) target.append(pvFrame);
  $("cinematicPlayer").hidden = !pvViewerOpen;
  $("pvViewer").textContent = pvViewerOpen
    ? "Kembalikan ke latar ↗"
    : "Lihat PV dengan kontrol ↗";
  requestAnimationFrame(resizePV);
  updatePVPlayback();
}
function setupCinematic() {
  const source = window.DOMAIN_VIDEO_SOURCE || {
    type: "youtube",
    url: "https://www.youtube-nocookie.com/embed/aybr_9MzKXI?autoplay=1&mute=1&loop=1&playlist=aybr_9MzKXI&playsinline=1&controls=1",
    title: "PV resmi Jujutsu Kaisen · cuplikan Gojo dan Geto",
  };
  if (!source?.url) return;
  if (source.type === "youtube") {
    const url = new URL(source.url);
    if (
      !["www.youtube.com", "www.youtube-nocookie.com"].includes(url.hostname) ||
      !url.pathname.startsWith("/embed/")
    )
      return;
    pvFrame = document.createElement("iframe");
    pvFrame.title = source.title || "PV resmi Jujutsu Kaisen";
    pvFrame.allow = "autoplay; encrypted-media; picture-in-picture";
    pvFrame.allowFullscreen = true;
    pvFrame.referrerPolicy = "strict-origin-when-cross-origin";
    pvFrame.tabIndex = -1;
  } else if (
    source.type === "local" &&
    source.url.startsWith("assets/video/")
  ) {
    pvFrame = document.createElement("video");
    pvFrame.controls = true;
    pvFrame.muted = true;
    pvFrame.loop = true;
    pvFrame.autoplay = true;
    pvFrame.playsInline = true;
    pvFrame.src = source.url;
  } else return;
  pvSource = source.url;
  $("cinematicSection").hidden = false;
  $("pvToggle").onclick = () => {
    pvPlaying = !pvPlaying;
    updatePVPlayback();
  };
  $("pvViewer").onclick = () => {
    pvViewerOpen = !pvViewerOpen;
    if (pvViewerOpen) pvPlaying = true;
    if (pvFrame.tagName === "IFRAME") pvFrame.tabIndex = pvViewerOpen ? 0 : -1;
    placePV("home");
  };
  addEventListener("resize", resizePV);
  document.addEventListener("visibilitychange", updatePVPlayback);
  placePV("home");
}
(function ambience() {
  const canvas = $("ambience"),
    ctx = canvas.getContext("2d");
  let width = 0,
    height = 0;
  function resize() {
    width = innerWidth;
    height = innerHeight;
    canvas.width = width;
    canvas.height = height;
  }
  resize();
  addEventListener("resize", resize);
  const particles = Array.from({ length: 42 }, () => ({
    x: Math.random(),
    y: Math.random(),
    size: Math.random() * 1.6 + 0.3,
  }));
  function draw(now) {
    ctx.clearRect(0, 0, width, height);
    const dark = document.body.classList.contains("theme-geto");
    ctx.fillStyle = dark ? "#bc6dfc55" : "#168aff40";
    for (const particle of particles) {
      ctx.beginPath();
      ctx.arc(
        particle.x * width,
        (((particle.y * height - (reduced ? 0 : now * 0.008)) % height) +
          height) %
          height,
        particle.size,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    if (!reduced) requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
})();
try {
  retry = JSON.parse(localStorage.getItem("domain-request") || "null");
} catch {
  localStorage.removeItem("domain-request");
}
$("ownerIntro").onclick = () => {
  domainAudio.stopAll();
  sound("bpedia-owner-intro");
  notify("Intro Bpedia diputar. Gunakan tombol suara untuk menghentikannya.");
};
renderCast();
setupCinematic();
refresh();
Promise.all([
  createBipyStage($("bipyStage"), cosmetic, "home"),
  createBipyStage($("castPreview"), cosmetic, "preview"),
]).then(([home, cast]) => {
  homeStage = home;
  castStage = cast;
  renderCast();
  selectCosmetic(cosmetic).catch(() => {});
  homeStage?.setAction("idle");
  castStage?.setAction("idle");
});
