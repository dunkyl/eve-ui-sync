#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use std::{path::PathBuf, vec};

use regex::Regex;

mod eve;

fn find_data_dir() -> PathBuf {
    let mut eve_appdata = PathBuf::from(
        std::env::var("LOCALAPPDATA").unwrap())
        .join("CCP").join("EVE");

    println!("EVE appdata: {:?}", eve_appdata);

    if !eve_appdata.exists() {
        panic!("EVE appdata directory not found");
    }
    let install_folders = std::fs::read_dir(eve_appdata.clone()).unwrap();
    for install_folder in install_folders {
        let install_folder = install_folder.unwrap();
        let install_folder_name = install_folder.file_name();
        if install_folder_name.to_str().unwrap().ends_with("tq_tranquility") {
            eve_appdata.push(install_folder_name);
            break;
        }
    }
    eve_appdata.join("settings_Default")
}

async fn get_eve_chardata() -> Vec<eve::Toon> {
    let data_dir = find_data_dir();

    let re_char_dat = Regex::new(r"core_char_(?P<char_id>\d+).dat").unwrap();
    let esi = eve::ESI::new();

    let mut toon_tasks = vec![];
    for entry in std::fs::read_dir(data_dir).unwrap() {
        let path = &entry.unwrap().path();
        let name = path.file_name().unwrap().to_str().unwrap();
        if let Some(captures) = re_char_dat.captures(name) {
            let id = captures["char_id"].parse::<u64>().unwrap();
            toon_tasks.push(esi.find_toon(id));
        }
    }

    let mut toons = futures::future::join_all(toon_tasks).await;
    toons.sort();
    toons
}

#[tauri::command]
async fn get_toons() -> Vec<eve::Toon> {
    get_eve_chardata().await
}

#[tauri::command]
async fn get_toon_portrait(id: u64) -> String {
    let esi = eve::ESI::new();
    esi.find_toon_portrait(id).await
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_toons,
            get_toon_portrait,
            ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
