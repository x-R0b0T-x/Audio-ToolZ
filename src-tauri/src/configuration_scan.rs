use serde_json::Value;
fn query(section:&str)->Result<String,String>{
 let q=match section {
  "board"=>"@(Get-CimInstance Win32_BaseBoard -Property Manufacturer,Product -OperationTimeoutSec 8 | Select-Object @{n='Fabricant';e={$_.Manufacturer}},@{n='Modele';e={$_.Product}}) | ConvertTo-Json -Compress",
  "cpu"=>"@(Get-CimInstance Win32_Processor -Property Name,NumberOfCores,NumberOfLogicalProcessors,MaxClockSpeed -OperationTimeoutSec 8 | Select-Object @{n='Nom';e={$_.Name}},@{n='Coeurs';e={$_.NumberOfCores}},@{n='ProcesseursLogiques';e={$_.NumberOfLogicalProcessors}},@{n='FrequenceAnnonceeGHz';e={[Math]::Round($_.MaxClockSpeed/1000,2)}}) | ConvertTo-Json -Compress",
  "ram"=>"@(Get-CimInstance Win32_PhysicalMemory -Property Capacity -OperationTimeoutSec 8 | Measure-Object Capacity -Sum | Select-Object @{n='RAMInstalleeGo';e={[Math]::Round($_.Sum/1GB,2)}}) | ConvertTo-Json -Compress",
  "gpu"=>include_str!("configuration_gpu.ps1"),
  "audio"=>"@(Get-CimInstance Win32_SoundDevice -Property Name -OperationTimeoutSec 8 | Select-Object @{n='Interface';e={$_.Name}}) | ConvertTo-Json -Compress",
  _=>return Err("Section de configuration non autorisée".into())
 };
 Ok(format!("$ErrorActionPreference='Stop';[Console]::OutputEncoding=New-Object System.Text.UTF8Encoding;{q}"))
}
#[cfg(target_os="windows")]
fn run(section:&str)->Result<Value,String>{
 use std::os::windows::process::CommandExt;
 use std::process::{Command,Stdio};use std::time::{Duration,Instant};
 let script=query(section)?;
 let root=std::env::var_os("SystemRoot").ok_or("Windows indisponible")?;
 let exe=std::path::PathBuf::from(root).join("System32/WindowsPowerShell/v1.0/powershell.exe");
 let mut child=Command::new(exe).args(["-NoLogo","-NoProfile","-NonInteractive","-Command",&script]).creation_flags(0x08000000).stdin(Stdio::null()).stdout(Stdio::piped()).stderr(Stdio::piped()).spawn().map_err(|e|format!("Lecture de configuration indisponible : {e}"))?;
 let started=Instant::now();
 loop{
  match child.try_wait(){Ok(Some(_))=>break,Ok(None)=>{},Err(e)=>{let _=child.kill();let _=child.wait();return Err(e.to_string());}}
  if started.elapsed()>Duration::from_secs(20){let _=child.kill();let _=child.wait();return Err("Délai de lecture de configuration dépassé".into());}
  std::thread::sleep(Duration::from_millis(40));
 }
 let output=child.wait_with_output().map_err(|e|e.to_string())?;
 if !output.status.success(){return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());}
 let text=String::from_utf8_lossy(&output.stdout);if text.trim().is_empty(){return Ok(serde_json::json!([]));}
 serde_json::from_str(text.trim().trim_start_matches('\u{feff}')).map_err(|e|format!("Configuration illisible : {e}"))
}
#[cfg(not(target_os="windows"))]
fn run(section:&str)->Result<Value,String>{query(section)?;Err("Détection disponible dans la version Windows".into())}
#[tauri::command]
pub async fn scan_configuration_section(section:String)->Result<Value,String>{
 query(&section)?;
 tauri::async_runtime::spawn_blocking(move||run(&section)).await.map_err(|e|e.to_string())?
}
#[cfg(test)]mod tests{
 use super::*;
 #[test]fn refuses_unknown_queries(){assert!(query("cpu; Remove-Item *").is_err());assert!(query("serial").is_err());}
 #[test]fn approved_queries_are_read_only(){for s in ["board","cpu","ram","gpu","audio"]{let q=query(s).unwrap();for forbidden in ["SerialNumber","Invoke-WebRequest","Set-CimInstance","Remove-Item"]{assert!(!q.contains(forbidden));}}}
 #[cfg(target_os="windows")]
 #[test]fn windows_cpu_query_returns_json(){let result=run("cpu").unwrap();assert!(result.is_array()||result.is_object());assert!(!result.is_null());}
}
