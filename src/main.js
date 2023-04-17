const { invoke } = window.__TAURI__.tauri;

async function get_toons() {
  return await invoke("get_toons", { });
}

async function sync(state) {
  return await invoke("sync", { state: state });
}

async function update_cache(cache) {
  return await invoke("update_cache", { cache: cache });
}

async function export_(state) {
  return await invoke("export", { state: state });
}

async function backup() {
  return await invoke("backup", { });
}

async function restore_backups() {
  return await invoke("restore_backups", { });
}

let toonsEl = document.getElementById("toons");

let controls = {};

let toon_rows = {};

let state = {
  selected_source: null,
  selected_targets: []
};

function distance_from_source(id) {
  if (state.selected_source == null) {
    return null;
  }
  if (state.selected_source == id) {
    return 0;
  }
  let position_src;
  let position_target;
  let p = 0;
  for (let other_id in controls) {
    if (other_id == state.selected_source) {
      position_src = p;
    }
    if (other_id == id) {
      position_target = p;
    }
    p++;
  }
  return Math.abs(position_src - position_target);
}

function readStateFromUI() {
  let state = { selected_source: null, selected_targets: []};
  for (let id in controls) {
    if (controls[id].source.children[0].checked) {
      state.selected_source = parseInt(id);
    }
    else if (controls[id].target.children[0].checked) {
      state.selected_targets.push(parseInt(id));
    }
  }
  if (state.selected_source == null || state.selected_targets.length == 0) {
    document.getElementById("sync").disabled = true;
  } else {
    document.getElementById("sync").disabled = false;
  }

  if (state.selected_source == null) {
    document.getElementById("export_").disabled = true;
  } else {
    document.getElementById("export_").disabled = false;
  }

  return state;
}

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
const DELAY_AMOUNT = 0.4;
function updateDelays(cache) {
  let minStartTime = Infinity;
  
  for (let toon of cache.toons) {
    let distance = distance_from_source(toon.id);
    let delay_amount = (distance+1) * DELAY_AMOUNT + "s";
    let cs = toon_rows[toon.id]
    let style = `--delay: ${delay_amount};`

    let end_delay_amount = (distance + 2) * DELAY_AMOUNT + "s";
    if (distance == 0) {
      end_delay_amount = "0s";
    }

    let end_style = `--delay: ${end_delay_amount};`

    let arrowEnd = toon_rows[toon.id][cs.length-2];
    let arrowPath = toon_rows[toon.id][cs.length-1];
    
    arrowPath.setAttribute("style", style);
    arrowEnd.setAttribute("style", end_style);
    
    let get_lowest = (a) => {
      if (a.startTime != null && a.startTime < minStartTime) {
        minStartTime = a.startTime;
      }
    };
    arrowPath.getAnimations().map(get_lowest);
    arrowEnd.getAnimations().map(get_lowest);
  }

  // sync animations
  for (let toon of cache.toons) {
    let cs = toon_rows[toon.id]
    let arrowEnd = toon_rows[toon.id][cs.length-1];
    let arrowPath = toon_rows[toon.id][cs.length-2];
    if (minStartTime == Infinity || minStartTime == -Infinity || !minStartTime) {
      break;
    }
    arrowPath.getAnimations().map((a) => { a.startTime = minStartTime ; });
    arrowEnd.getAnimations().map((a) => { a.startTime = minStartTime ; });
  }
}

function updateToggleAllText() {
  let toggle = document.getElementById("toggle-all");
  let any_checked = false;
  for (let id in controls) {
    if (controls[id].target.children[0].checked) {
      any_checked = true;
      break;
    }
  }
  if (!any_checked) {
    toggle.innerText = "Select All";
  }
  else {
    toggle.innerText = "Deselect All";
  }
  return any_checked;
}


function makeToonEls(toon, cache) {
  let row = [];
  let character_cell = document.createElement("div");
  let portrait = document.createElement("img");
  portrait.src = toon.portrait_url;
  portrait.className = "portrait";
  character_cell.appendChild(portrait);
  let name = document.createElement("span");
  name.innerText = toon.name;
  name.className = "character-name";
  character_cell.appendChild(name);
  character_cell.className = "toon";

  let radio = makeCustomRadio("source-radio", false, false, "toon", toon.id);
  
  let checkbox = makeCustomCheckbox("target-checkbox", false, false);

  radio.children[0].onchange = function() {
    for (let id in controls) {
      if (id != toon.id) {
        controls[id].target.children[0].disabled = false;
      } else {
        controls[id].target.children[0].disabled = true;
      }
    }
    state = readStateFromUI();
    cache.state = state;
    update_cache(cache);
    updateDelays(cache);
  }
  checkbox.children[0].onchange = function() {
    if (this.checked) {
      radio.children[0].checked = false;
    }
    state = readStateFromUI();
    cache.state = state;
    update_cache(cache);
    updateDelays(cache);
    updateToggleAllText();
  }

  row.push(character_cell);
  row.push(radio);
  row.push(checkbox);

  let arrow_cell = document.createElement("div");
  arrow_cell.className = "arrow arrow-end";
  row.push(arrow_cell);

  let path_cell = document.createElement("div");
  path_cell.className = "arrow arrow-path";
  row.push(path_cell);

  controls[toon.id] = {
    source: radio,
    target: checkbox
  }

  toon_rows[toon.id] = row;

  return row;
}


async function main() {

  let cache = await get_toons();

  let toons = cache.toons;

  for (let toon of toons) {
    for (let el of makeToonEls(toon, cache)) {
      toonsEl.appendChild(el);
    }
  }

  if (cache.state.selected_source != null) {
    controls[cache.state.selected_source].source.children[0].checked = true;
  }
  for (let id of cache.state.selected_targets) {
    controls[id].target.children[0].checked = true;
  }
  state = readStateFromUI();
  updateDelays(cache);
  updateToggleAllText();

  document.getElementById("toggle-all").onclick = function() {
    let any_checked = updateToggleAllText();
    
    for (let id in controls) {
      controls[id].target.children[0].checked = !any_checked;
    }
    state = readStateFromUI();
    updateToggleAllText();
  }

  document.getElementById("sync").onclick = function() {
    document.getElementById("status").innerText = "Syncing...";
    sync(state).then((result) => {
      document.getElementById("status").innerText = result;
    });
  }

  document.getElementById("backup").onclick = function() {
    document.getElementById("status").innerText = "Backing up...";
    backup().then((result) => {
      document.getElementById("status").innerText = result;
    });
  }

  document.getElementById("restore-backups").onclick = function() {
    document.getElementById("status").innerText = "Restoring...";
    restore_backups().then((result) => {
      document.getElementById("status").innerText = result;
    });
  }

  document.getElementById("export_").onclick = function() {
    document.getElementById("status").innerText = "Exporting...";
    export_(state).then((result) => {
      document.getElementById("status").innerText = result;
    });
  }

}

window.onload = main;