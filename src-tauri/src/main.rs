#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use std::process::Command;
use serde::Serialize;

#[derive(Serialize, Clone)]
pub struct ExportResponse {
    success: bool,
    message: String,
    file_path: Option<String>,
}

#[tauri::command]
fn export_playlist(
    playlist_uuid: String,
    export_format: String,
    host: String,
    port: u16,
) -> ExportResponse {
    let port_str = port.to_string();

    let mut cmd = Command::new("npm");
    cmd.args(&["run", "dev", "--"]);

    if export_format == "pptx" {
        cmd.args(&["pptx", &playlist_uuid]);
    } else {
        cmd.args(&["export", &playlist_uuid]);
        if export_format == "json" {
            cmd.arg("--json");
        }
    }

    cmd.args(&["--host", &host, "--port", &port_str]);

    match cmd.output() {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout).to_string();
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();

            ExportResponse {
                success: output.status.success(),
                message: if output.status.success() { stdout } else { stderr },
                file_path: None,
            }
        }
        Err(e) => ExportResponse {
            success: false,
            message: format!("Failed to run export: {}", e),
            file_path: None,
        },
    }
}

#[tauri::command]
fn get_playlists(host: String, port: u16) -> ExportResponse {
    let port_str = port.to_string();

    let output = Command::new("npm")
        .args(&["run", "dev", "--", "playlists", "--json", "--host", &host, "--port", &port_str])
        .output();

    match output {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout).to_string();
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();

            ExportResponse {
                success: output.status.success(),
                message: if output.status.success() { stdout } else { stderr },
                file_path: None,
            }
        }
        Err(e) => ExportResponse {
            success: false,
            message: format!("Failed to get playlists: {}", e),
            file_path: None,
        },
    }
}

#[tauri::command]
fn check_connection(host: String, port: u16) -> ExportResponse {
    let port_str = port.to_string();

    let output = Command::new("npm")
        .args(&["run", "dev", "--", "status", "--host", &host, "--port", &port_str])
        .output();

    match output {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout).to_string();
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();

            ExportResponse {
                success: output.status.success(),
                message: if output.status.success() { stdout } else { stderr },
                file_path: None,
            }
        }
        Err(e) => ExportResponse {
            success: false,
            message: format!("Connection failed: {}", e),
            file_path: None,
        },
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            export_playlist,
            get_playlists,
            check_connection
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
