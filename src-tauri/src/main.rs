#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use std::{path::PathBuf, vec};

use regex::Regex;
use serde::{Deserialize, Serialize};

mod eve;

#[derive(Serialize, Deserialize, Debug)]
struct AppState {
    selected_source: Option<u64>,
    selected_targets: Vec<u64>,
}

#[derive(Serialize, Deserialize, Debug)]
struct Cache {
    ids: Vec<u64>,
    toons: Vec<eve::Toon>,
    state: AppState,
}

fn find_data_dir() -> PathBuf {
    let mut eve_folder = PathBuf::from(
        std::env::var("LOCALAPPDATA").unwrap())
        .join("CCP").join("EVE");

    println!("EVE data: {:?}", eve_folder);

    if !eve_folder.exists() {
        panic!("EVE data directory not found");
    }
    let install_folders = std::fs::read_dir(eve_folder.clone()).unwrap();
    for install_folder in install_folders {
        let install_folder = install_folder.unwrap();
        let install_folder_name = install_folder.file_name();
        if install_folder_name.to_str().unwrap().ends_with("tq_tranquility") {
            eve_folder.push(install_folder_name);
            break;
        }
    }
    eve_folder.join("settings_Default")
}

fn get_eve_char_ids() -> Vec<u64> {
    let data_dir = find_data_dir();
    let re_char_dat = Regex::new(r"^core_char_(?P<char_id>\d+).dat$").unwrap();
    let mut ids = vec![];
    for entry in std::fs::read_dir(data_dir).unwrap() {
        let path = &entry.unwrap().path();
        let name = path.file_name().unwrap().to_str().unwrap();
        if let Some(captures) = re_char_dat.captures(name) {
            let id = captures["char_id"].parse::<u64>().unwrap();
            if !ids.contains(&id) {
                ids.push(id);
            }
        }
    }
    ids
}

fn cache_path() -> PathBuf {
    let mut cache_path = find_data_dir();
    cache_path.push("eve_ui_sync_cache.json");
    cache_path
}

async fn load_data() -> Cache {
    let cache_path = cache_path();
    let ids = get_eve_char_ids();
    if cache_path.exists() {
        let file = std::fs::File::open(&cache_path).unwrap();
        let reader = std::io::BufReader::new(file);
        let cache  = serde_json::from_reader::<_, Cache>(reader).unwrap();
        if cache.ids == ids { // cache is valid
            println!("Valid cache from {:?}", cache_path);
            return cache;
        }
    }
    let esi = eve::ESI::new();

    let ids = get_eve_char_ids();

    let toon_tasks = ids.iter().cloned().map(|id| esi.find_toon(id));

    let mut toons = futures::future::join_all(toon_tasks).await;
    toons.sort();

    let state = AppState {
        selected_source: None,
        selected_targets: vec![],
    };

    let cache = Cache {
        ids,
        toons,
        state,
    };

    // save cache
    save_cache(&cache);
    cache
}

fn save_cache(cache: &Cache) {
    let cache_path = cache_path();
    let file = std::fs::File::create(&cache_path).unwrap();
    let writer = std::io::BufWriter::new(file);
    serde_json::to_writer(writer, &cache).unwrap();
    println!("Saved cache to {:?}", cache_path);
}

#[tauri::command]
async fn get_toons() -> Cache {
    load_data().await
}

#[tauri::command]
async fn sync(state: AppState) -> String {
    match state {
        AppState { selected_source: None, .. } => {
            "No source selected".to_string()
        }
        AppState {selected_targets, ..} if selected_targets.is_empty() => {
            "No targets selected".to_string()
        }
        AppState { selected_source: Some(src_id), selected_targets } => {
            let data_dir = find_data_dir();
            let source_path = PathBuf::from(
                format!("core_char_{}.dat", src_id));
            let source_path = data_dir.join(source_path);
            for target_id in &selected_targets {
                let target_path = PathBuf::from(
                    format!("core_char_{}.dat", target_id));
                let target_path = data_dir.join(target_path);
                std::fs::copy(&source_path, &target_path).unwrap();
                println!("Copied {:?} to {:?}", source_path, target_path);
            }
            format!("Synced {} to {} targets", src_id, selected_targets.len())
        }
    }
}

#[tauri::command]
async fn update_cache(cache: Cache) {
    println!("Updating cache");
    save_cache(&cache);
}


#[tauri::command]
async fn export(state: AppState) -> String {
    match state {
        AppState { selected_source: None, .. } => {
            "No source selected".to_string()
        }
        AppState { selected_source: Some(src_id), ..} => {
            let data_dir = find_data_dir();
            let source_name = PathBuf::from(
                format!("core_char_{}.dat", src_id));
            let source_path = data_dir.join(&source_name);
                
            use futures::channel::oneshot;

            let (send, recv) = oneshot::channel::<Option<PathBuf>>();

            tauri::api::dialog::FileDialogBuilder::new()
                .add_filter("character file", &["dat"])
                .set_file_name("core_char.dat")
                .save_file(|file| {
                    send.send(file).unwrap();
                });
            let file = recv.await.unwrap();
            if let Some(file) = file {
                std::fs::copy(&source_path, &file).unwrap();
                format!("Exported {:?} to {:?}", source_name, file.to_string_lossy())
            } else {
                "Export cancelled".to_string()
            }
            
        }
    }
}

#[tauri::command]
async fn backup() -> String {
    let data_dir = find_data_dir();

    let re_char_dat = Regex::new(r"^core_char_(?P<char_id>\d+).dat$").unwrap();

    let mut count = 0;
    for entry in std::fs::read_dir(&data_dir).unwrap() {
        let path = &entry.unwrap().path();
        let name = path.file_name().unwrap().to_str().unwrap();
        if re_char_dat.is_match(name) {
            let backup_name = format!("{}.bak", name);
            let backup_path = data_dir.join(backup_name);
            std::fs::copy(path, &backup_path).unwrap();
            println!("Copied {:?} to {:?}", path, backup_path);
            count += 1;
        }
    }
    format!("Backed up {} character files", count)
}

#[tauri::command]
async fn restore_backups() -> String {
    let data_dir = find_data_dir();

    let re_char_dat = Regex::new(r"^core_char_(?P<char_id>\d+).dat$").unwrap();

    let mut count = 0;
    for entry in std::fs::read_dir(&data_dir).unwrap() {
        let path = &entry.unwrap().path();
        let name = path.file_name().unwrap().to_str().unwrap();
        if re_char_dat.is_match(name) {
            let backup_name = format!("{}.bak", name);
            let backup_path = data_dir.join(backup_name);
            if backup_path.exists() {
                std::fs::copy(&backup_path, path).unwrap();
                println!("Copied {:?} to {:?}", backup_path, path);
                count += 1;
            } else {
                println!("No backup found for {:?}", path);
            }
        }
    }
    format!("Restored {} backups", count)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_toons, sync, export, backup, restore_backups, update_cache
            ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
