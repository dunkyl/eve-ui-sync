const { invoke } = window.__TAURI__.tauri;

async function get_toons() {
  return await invoke("get_toons", { });
}

let toonsEl = document.getElementById("toons");

let controls = {};

function makeCustomCheckbox(className, checked, disabled) {
  let checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = checked;
  checkbox.disabled = disabled;
  let container = document.createElement("div");
  container.className = className;
  container.appendChild(checkbox);
  return container;
}

function makeCustomRadio(className, checked, disabled, name, value) {
  let radio = document.createElement("input");
  radio.type = "radio";
  radio.checked = checked;
  radio.disabled = disabled;
  radio.name = name;
  radio.value = value;
  let container = document.createElement("div");
  if (className) {
    container.className = className;
  }
  container.appendChild(radio);
  return container;
}


function makeToonEl(toon) {
  let row = document.createElement("tr");
  let character_cell = document.createElement("td");
  let portrait = document.createElement("img");
  portrait.src = toon.portrait_url;
  portrait.className = "portrait";
  character_cell.appendChild(portrait);
  let name = document.createElement("span");
  name.innerText = toon.name;
  name.className = "character-name";
  character_cell.appendChild(name);
  character_cell.className = "toon";
  let options_cell = document.createElement("td");
  options_cell.className = "options";
  let radio = makeCustomRadio("custom-radio", false, false, "toon", toon.id);
  options_cell.appendChild(radio);
  
  let checkbox = makeCustomCheckbox("custom-checkbox", false, false);
  let options_cell2 = document.createElement("td");
  options_cell2.appendChild(checkbox);
  options_cell2.className = "options";

  radio.children[0].onchange = function() {
    for (let id in controls) {
      if (id != toon.id) {
        controls[id].target.children[0].disabled = false;
      } else {
        controls[id].target.children[0].disabled = true;
      }
    }
  }
  checkbox.children[0].onchange = function() {
    if (this.checked) {
      radio.children[0].checked = false;
    } 
  }

  row.appendChild(character_cell);
  row.appendChild(options_cell);
  row.appendChild(options_cell2);

  controls[toon.id] = {
    source: radio,
    target: checkbox
  }

  return row;
}

async function main() {

  let toons = await get_toons();

  for (let toon of toons) {
    toonsEl.appendChild(makeToonEl(toon));
  }

  document.getElementById("toggle-all").onclick = function() {
    var any_checked = false;
    for (let id in controls) {
      if (controls[id].target.children[0].checked) {
        console.log(`${id} was checked`);
        any_checked = true;
        break;
      }
    }
    if (any_checked) {
      this.innerText = "Select\nAll";
    } else {
      this.innerText = "Select\nNone";
    }
    for (let id in controls) {
      controls[id].target.children[0].checked = !any_checked;
    }
  }

}

window.onload = main;