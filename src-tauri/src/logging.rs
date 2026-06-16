use crate::{app::paths, error::AppResult};
use chrono::Local;
use std::{fs::{self, OpenOptions}, io::Write};

pub fn append(message: &str) -> AppResult<()> {
    let path = paths::launcher_paths()?.log_file;
    if path.exists() && fs::metadata(&path)?.len() > 2_000_000 {
        let rotated = path.with_extension("old.log");
        let _ = fs::remove_file(&rotated);
        fs::rename(&path, rotated)?;
    }
    let mut file = OpenOptions::new().create(true).append(true).open(path)?;
    writeln!(file, "[{}] {}", Local::now().format("%Y-%m-%d %H:%M:%S"), message)?;
    Ok(())
}

pub fn read_last(limit: usize) -> AppResult<Vec<String>> {
    let path = paths::launcher_paths()?.log_file;
    if !path.exists() {
        return Ok(Vec::new());
    }
    let raw = fs::read_to_string(path)?;
    let lines: Vec<&str> = raw.lines().collect();
    let start = lines.len().saturating_sub(limit.min(2_000));
    Ok(lines[start..].iter().map(|line| (*line).to_string()).collect())
}
