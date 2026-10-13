"use strict";
const $ = (id) => document.getElementById(id);
let savedRequest = null;
async function api(path, body) {
  const response = await fetch("/api/" + path, {
    method: body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      "x-bpedia-client": "domainfestival",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json();
  if (!response.ok)
    throw Error(result.error || result.message || "Permintaan gagal");
  return result;
}
function status(text) {
  $("status").textContent = text;
}
function values(form) {
  const result = {};
  for (const field of form.elements) {
    if (!field.name || field.readOnly) continue;
    result[field.name] =
      field.type === "checkbox"
        ? field.checked
        : field.type === "number"
          ? Number(field.value)
          : field.value;
  }
  return result;
}
function field(form, label, name, value, type = "text") {
  const wrapper = document.createElement("label");
  wrapper.textContent = label;
  const input = document.createElement("input");
  input.name = name;
  input.type = type;
  if (type === "checkbox") input.checked = Boolean(value);
  else input.value = value ?? "";
  if (type === "number") input.min = "0";
  wrapper.append(input);
  form.append(wrapper);
}
function editor(container, item, type) {
  const form = document.createElement("form"),
    title = document.createElement("h3");
  title.textContent = item.name || item.id;
  form.append(title);
  field(form, "Nomor / identitas", "id", item.id);
  form.lastChild.querySelector("input").readOnly = true;
  field(
    form,
    type === "host" ? "Nama host / cosplayer" : "Nama hadiah",
    "name",
    item.name,
  );
  if (type === "reward") form.lastChild.querySelector("input").readOnly = true;
  if (type === "host") {
    field(form, "Kuota sesi", "quota", item.quota, "number");
    field(
      form,
      "Nama cosplayer yang ditugaskan",
      "performer",
      item.performer || "",
    );
  } else {
    field(form, "Syarat promo", "terms", item.terms);
    field(form, "Stok", "stock", item.stock, "number");
    field(form, "Nilai referensi (Rp)", "value", item.value, "number");
  }
  field(form, "Aktif", "enabled", item.enabled, "checkbox");
  const button = document.createElement("button");
  button.className = "secondary";
  button.textContent = "Simpan";
  form.append(button);
  form.onsubmit = async (event) => {
    event.preventDefault();
    button.disabled = true;
    const patch = values(form);
    delete patch.id;
    try {
      await api("admin/" + type, { id: item.id, patch });
      status("Perubahan tersimpan.");
      await load();
    } catch (error) {
      status(error.message);
    } finally {
      button.disabled = false;
    }
  };
  container.append(form);
}
async function load() {
  try {
    const data = await api("admin/state");
    $("login").hidden = true;
    $("panel").hidden = false;
    const settings = data.settings || {};
    for (const field of $("settings").elements) {
      if (!field.name) continue;
      if (field.type === "checkbox")
        field.checked = Boolean(settings[field.name]);
      else field.value = settings[field.name] ?? "";
    }
    for (const id of ["hosts", "rewards", "tickets"]) $(id).replaceChildren();
    (data.hosts || []).forEach((item) => editor($("hosts"), item, "host"));
    (data.rewards || []).forEach((item) =>
      editor($("rewards"), item, "reward"),
    );
    const tickets = Array.isArray(data.queue)
      ? data.queue
      : data.history || data.tickets || data.queue?.tickets || [];
    tickets
      .filter((t) => !t.demo && t.status === "waiting")
      .forEach((ticket) => {
        const row = document.createElement("div");
        row.className = "ticket-row";
        const text = document.createElement("p");
        text.textContent =
          "#" +
          (ticket.queueNumber ?? "—") +
          " · " +
          (ticket.username || "Peserta") +
          " · " +
          (ticket.reward?.name || ticket.rewardTrack || "") +
          " · " +
          (ticket.comfort || "no-touch");
        row.append(text);
        for (const [action, label] of [
          ["served", "Sudah dilayani"],
          ["noTouch", "Tanpa sentuhan"],
          ["cancelled", "Batalkan tiket"],
        ]) {
          const button = document.createElement("button");
          button.textContent = label;
          button.onclick = async () => {
            try {
              await api("admin/ticket", { id: ticket.id, action });
              await load();
            } catch (error) {
              status(error.message);
            }
          };
          row.append(button);
        }
        $("tickets").append(row);
      });
    if (!$("tickets").children.length)
      $("tickets").textContent = "Tidak ada tiket menunggu.";
    status("Data operasional diperbarui.");
  } catch (error) {
    status(error.message);
  }
}
$("login").onsubmit = async (event) => {
  event.preventDefault();
  try {
    await api("login", { pin: $("pin").value });
    $("pin").value = "";
    await load();
  } catch (error) {
    status(error.message);
  }
};
$("settings").onsubmit = async (event) => {
  event.preventDefault();
  try {
    await api("admin/settings", values($("settings")));
    await load();
    status("Pengaturan tersimpan.");
  } catch (error) {
    status(error.message);
  }
};
$("official").onsubmit = async (event) => {
  event.preventDefault();
  const requested = values($("official"));
  if (
    (requested.comfort === "touch" || requested.recording) &&
    !requested.consent
  ) {
    status("Konfirmasi persetujuan peserta sebelum interaksi atau perekaman.");
    return;
  }
  const button = $("official").querySelector("button");
  button.disabled = true;
  try {
    savedRequest = savedRequest || {
      requestId: crypto.randomUUID(),
      ...values($("official")),
    };
    const result = await api("play", savedRequest);
    savedRequest = null;
    window.location.href = "index.html?booth=1";
    status(
      "Tiket " +
        result.id +
        " tersimpan. Buka halaman permainan untuk menampilkan hasil.",
    );
    await load();
  } catch (error) {
    status(
      error.message +
        " Kirim ulang untuk memakai identitas permintaan yang sama.",
    );
  } finally {
    button.disabled = false;
  }
};
$("refresh").onclick = load;
$("logout").onclick = async () => {
  try {
    await api("logout", {});
    $("panel").hidden = true;
    $("login").hidden = false;
    status("Sesi petugas berakhir.");
  } catch (error) {
    status(error.message);
  }
};
load();
