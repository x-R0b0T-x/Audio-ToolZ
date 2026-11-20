#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::State;
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_opener::OpenerExt;
use uuid::Uuid;

const MAX_RECENT_FILES: usize = 10;
const TOKEN_TTL_SECS: u64 = 300;
const COMMUNITY_URL: &str = "https://t.me/Audio_ToolZ";

#[derive(Debug, Clone, Serialize, Deserialize)]
struct RecentFile {
    id: String,
    name: String,
    path: String,
}

#[derive(Debug, Serialize)]
struct DesktopAudioFile {
    token: String,
    name: String,
    data: Vec<u8>,
}

struct PendingEntry {
    path: String,
    created: Instant,
}

struct AppState {
    recent_store_path: PathBuf,
    pending: Mutex<HashMap<String, PendingEntry>>,
    recent_lock: Mutex<()>,
}

fn resolve_portable_user_data() -> PathBuf {
    let exe_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|d| d.to_path_buf()))
        .unwrap_or_else(|| PathBuf::from("."));
    let portable_dir = exe_dir.join("user-data");
    let probe = portable_dir.join(".write-check");
    if fs::create_dir_all(&portable_dir).is_ok() && fs::write(&probe, b"").is_ok() {
        let _ = fs::remove_file(&probe);
        return portable_dir.join("recent-files.json");
    }
    let fallback_base = std::env::var_os("LOCALAPPDATA")
        .or_else(|| std::env::var_os("XDG_DATA_HOME"))
        .map(PathBuf::from)
        .unwrap_or_else(std::env::temp_dir);
    let fallback_dir = fallback_base.join("Audio ToolZ").join("user-data");
    let _ = fs::create_dir_all(&fallback_dir);
    fallback_dir.join("recent-files.json")
}

fn read_recent_list(store_path: &Path) -> Vec<RecentFile> {
    let Ok(raw) = fs::read_to_string(store_path) else {
        return Vec::new();
    };
    serde_json::from_str::<Vec<RecentFile>>(&raw).unwrap_or_default()
}

fn write_recent_list(store_path: &Path, items: &[RecentFile]) {
    if let Some(parent) = store_path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    if let Ok(json) = serde_json::to_string_pretty(items) {
        let _ = fs::write(store_path, json);
    }
}

fn remember_path(state: &AppState, raw_path: &str) {
    let trimmed = raw_path.trim();
    if trimmed.is_empty() {
        return;
    }
    let _guard = state.recent_lock.lock().unwrap();
    let mut items = read_recent_list(&state.recent_store_path);
    items.retain(|item| !item.path.eq_ignore_ascii_case(trimmed));
    let name = Path::new(trimmed)
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| trimmed.to_string());
    items.insert(
        0,
        RecentFile {
            id: Uuid::new_v4().to_string(),
            name,
            path: trimmed.to_string(),
        },
    );
    items.truncate(MAX_RECENT_FILES);
    write_recent_list(&state.recent_store_path, &items);
}

fn build_payload(state: &AppState, file_path: &Path) -> Result<DesktopAudioFile, String> {
    let data = fs::read(file_path)
        .map_err(|e| format!("Impossible de lire le fichier ({e}). Il a peut-être été déplacé ou supprimé."))?;
    let name = file_path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "audio.wav".to_string());
    let token = Uuid::new_v4().to_string();

    let mut pending = state.pending.lock().unwrap();
    let now = Instant::now();
    pending.retain(|_, v| now.duration_since(v.created) < Duration::from_secs(TOKEN_TTL_SECS));
    if pending.len() >= 100 {
        if let Some(first_key) = pending.keys().next().cloned() {
            pending.remove(&first_key);
        }
    }
    pending.insert(
        token.clone(),
        PendingEntry {
            path: file_path.to_string_lossy().to_string(),
            created: now,
        },
    );
    Ok(DesktopAudioFile { token, name, data })
}

#[tauri::command]
fn get_recent_files(state: State<AppState>) -> Vec<RecentFile> {
    let _guard = state.recent_lock.lock().unwrap();
    read_recent_list(&state.recent_store_path)
}

#[tauri::command]
fn clear_recent_files(state: State<AppState>) {
    let _guard = state.recent_lock.lock().unwrap();
    write_recent_list(&state.recent_store_path, &[]);
}

#[tauri::command]
fn remember_file(state: State<AppState>, path: String) {
    remember_path(&state, &path);
}

#[tauri::command]
fn confirm_opened(state: State<AppState>, token: String) -> Result<(), String> {
    let entry = {
        let mut pending = state.pending.lock().unwrap();
        pending.remove(&token)
    };
    let Some(entry) = entry else {
        return Err("Ouverture expirée.".to_string());
    };
    if entry.created.elapsed() > Duration::from_secs(TOKEN_TTL_SECS) {
        return Err("Ouverture expirée.".to_string());
    }
    remember_path(&state, &entry.path);
    Ok(())
}

#[tauri::command]
fn open_recent(state: State<AppState>, id: String) -> Result<DesktopAudioFile, String> {
    let path_str = {
        let _guard = state.recent_lock.lock().unwrap();
        read_recent_list(&state.recent_store_path)
            .into_iter()
            .find(|item| item.id == id)
            .map(|item| item.path)
    };
    let Some(path_str) = path_str else {
        return Err("Fichier absent de la liste.".to_string());
    };
    build_payload(&state, Path::new(&path_str))
}

#[tauri::command]
async fn pick_audio_files(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<Vec<DesktopAudioFile>, String> {
    let (tx, rx) = std::sync::mpsc::channel();
    app.dialog()
        .file()
        .set_title("Ouvrir un fichier audio")
        .add_filter("Audio et video", &["wav", "mp3", "flac", "ogg", "oga", "opus", "m4a", "mp4", "aac", "aif", "aiff", "caf", "mka", "mkv", "webm"])
        .pick_files(move |paths| {
            let _ = tx.send(paths);
        });

    let picked = rx.recv().map_err(|_| "Sélection annulée.".to_string())?;
    let Some(paths) = picked else {
        return Ok(Vec::new());
    };

    let mut out = Vec::new();
    for fp in paths {
        if let Ok(path_buf) = fp.into_path() {
            out.push(build_payload(&state, &path_buf)?);
        }
    }
    Ok(out)
}

#[tauri::command]
fn open_community_url(app: tauri::AppHandle, url: String) -> Result<(), String> {
    if url != COMMUNITY_URL && url != format!("{COMMUNITY_URL}/") {
        return Err("URL externe non autorisée.".to_string());
    }
    app.opener()
        .open_url(COMMUNITY_URL, None::<&str>)
        .map_err(|e| format!("Impossible d'ouvrir le navigateur : {e}"))
}

fn main() {
    let state = AppState {
        recent_store_path: resolve_portable_user_data(),
        pending: Mutex::new(HashMap::new()),
        recent_lock: Mutex::new(()),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            get_recent_files,
            clear_recent_files,
            remember_file,
            confirm_opened,
            open_recent,
            pick_audio_files,
            audio_fallback::decode_audio_fallback,
            open_community_url
        ])
        .run(tauri::generate_context!())
        .expect("Erreur au démarrage d'Audio ToolZ");
}

mod audio_fallback;
