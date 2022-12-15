const { invoke } = window.__TAURI__.tauri;

async function get_toons() {
  return await invoke("get_toons", { });
}

async function get_toon_portrait(toon) {
  return await invoke("get_toon_portrait", { id: toon.id });
}

let toonsEl = document.getElementById("toons");

function makeToonEl(toon) {
  let el = document.createElement("div");
  el.className = "toon";
  let portrait = document.createElement("img");
  get_toon_portrait(toon).then( (url) => {
    portrait.src = url;
  })
  portrait.className = "portrait";
  el.appendChild(portrait);
  let name = document.createElement("span");
  name.innerText = toon.name;
  name.className = "character-name";
  el.appendChild(name);
  let radio = document.createElement("input");
  radio.type = "radio";
  radio.name = "toon";
  radio.value = toon.id;
  radio.id = toon.id;
  el.appendChild(radio);
  let checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  el.appendChild(checkbox);

  return el;
}

async function main() {

  let toons = await get_toons();

  for (let toon of toons) {
    toonsEl.appendChild(makeToonEl(toon));
  }

}

window.onload = main;