use crate::error::{AppError, AppResult};
use regex::Regex;
use serde::Serialize;
use std::{collections::HashSet, fs, path::{Path, PathBuf}, process::Command};

#[derive(Debug, Clone, Serialize)]
pub struct JavaRuntime {
    pub path: String,
    pub major_version: u32,
}

pub fn resolve_java(configured: Option<&str>) -> AppResult<JavaRuntime> {
    resolve_java_optional(configured).ok_or(AppError::JavaNotFound)
}

pub fn resolve_java_optional(configured: Option<&str>) -> Option<JavaRuntime> {
    let mut seen = HashSet::new();
    for candidate in java_candidates(configured) {
        let key = candidate.to_string_lossy().to_lowercase();
        if !seen.insert(key) { continue; }
        if let Some(runtime) = inspect_java(&candidate) {
            if runtime.major_version >= 21 { return Some(runtime); }
        }
    }
    None
}

fn java_candidates(configured: Option<&str>) -> Vec<PathBuf> {
    let mut candidates = Vec::new();
    if let Some(path) = configured {
        let path = PathBuf::from(path);
        candidates.push(if path.is_dir() { path.join(java_binary()) } else { path });
    }
    if let Ok(java_home) = std::env::var("JAVA_HOME") {
        candidates.push(PathBuf::from(java_home).join("bin").join(java_binary()));
    }
    candidates.push(PathBuf::from(java_binary()));
    candidates.push(PathBuf::from("java"));

    if cfg!(target_os = "windows") {
        if let Ok(program_files) = std::env::var("ProgramFiles") {
            let root = PathBuf::from(program_files);
            candidates.push(root.join("Common Files/Oracle/Java/javapath/java.exe"));
            for vendor in ["Eclipse Adoptium", "Microsoft", "Java", "BellSoft", "Zulu"] {
                append_vendor_javas(&root.join(vendor), &mut candidates);
            }
        }
    } else {
        for path in [
            "/usr/bin/java",
            "/usr/local/bin/java",
            "/opt/homebrew/opt/openjdk@21/bin/java",
            "/Library/Java/JavaVirtualMachines",
        ] {
            let path = PathBuf::from(path);
            if path.is_dir() && path.to_string_lossy().contains("JavaVirtualMachines") {
                append_macos_javas(&path, &mut candidates);
            } else {
                candidates.push(path);
            }
        }
    }
    candidates
}

fn append_vendor_javas(root: &Path, output: &mut Vec<PathBuf>) {
    let Ok(entries) = fs::read_dir(root) else { return; };
    let mut versions: Vec<PathBuf> = entries.flatten().map(|entry| entry.path()).collect();
    versions.sort_by(|a, b| b.cmp(a));
    output.extend(versions.into_iter().map(|path| path.join("bin/java.exe")));
}

fn append_macos_javas(root: &Path, output: &mut Vec<PathBuf>) {
    let Ok(entries) = fs::read_dir(root) else { return; };
    output.extend(entries.flatten().map(|entry| entry.path().join("Contents/Home/bin/java")));
}

fn inspect_java(path: &Path) -> Option<JavaRuntime> {
    let output = Command::new(path).arg("-version").output().ok()?;
    let text = format!("{}\n{}", String::from_utf8_lossy(&output.stdout), String::from_utf8_lossy(&output.stderr));
    let major = parse_java_major(&text)?;
    Some(JavaRuntime { path: path.to_string_lossy().to_string(), major_version: major })
}

fn parse_java_major(value: &str) -> Option<u32> {
    let regex = Regex::new(r#"version\s+"([0-9]+)(?:\.([0-9]+))?"#).ok()?;
    let captures = regex.captures(value)?;
    let first = captures.get(1)?.as_str().parse::<u32>().ok()?;
    if first == 1 {
        captures.get(2)?.as_str().parse().ok()
    } else {
        Some(first)
    }
}

fn java_binary() -> &'static str {
    if cfg!(target_os = "windows") { "java.exe" } else { "java" }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_modern_and_legacy_java_versions() {
        assert_eq!(parse_java_major(r#"openjdk version "21.0.5""#), Some(21));
        assert_eq!(parse_java_major(r#"java version "1.8.0_401""#), Some(8));
    }
}
