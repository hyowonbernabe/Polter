use std::fs;
use std::path::PathBuf;

fn env_file_path() -> PathBuf {
    std::env::current_dir().unwrap_or_default().join(".env")
}

pub fn get_api_key() -> Option<String> {
    let path = env_file_path();
    let content = fs::read_to_string(path).ok()?;
    for line in content.lines() {
        if let Some(rest) = line.strip_prefix("OPENROUTER_API_KEY=") {
            return Some(rest.trim().to_string());
        }
    }
    None
}

pub fn set_api_key(key: &str) -> Result<(), String> {
    let path = env_file_path();
    let mut new_lines = Vec::new();
    let mut found = false;
    
    if let Ok(content) = fs::read_to_string(&path) {
        for line in content.lines() {
            if line.starts_with("OPENROUTER_API_KEY=") {
                new_lines.push(format!("OPENROUTER_API_KEY={}", key));
                found = true;
            } else {
                new_lines.push(line.to_string());
            }
        }
    }
    
    if !found {
        new_lines.push(format!("OPENROUTER_API_KEY={}", key));
    }
    
    fs::write(path, new_lines.join("\n")).map_err(|e| e.to_string())
}

pub fn clear_api_key() -> Result<(), String> {
    let path = env_file_path();
    let mut new_lines = Vec::new();
    let mut changed = false;
    
    if let Ok(content) = fs::read_to_string(&path) {
        for line in content.lines() {
            if line.starts_with("OPENROUTER_API_KEY=") {
                changed = true;
            } else {
                new_lines.push(line.to_string());
            }
        }
    }
    
    if changed {
        fs::write(path, new_lines.join("\n")).map_err(|e| e.to_string())
    } else {
        Ok(())
    }
}

pub fn has_api_key() -> bool {
    get_api_key().is_some()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn set_get_clear_roundtrip() {
        let _ = clear_api_key();

        set_api_key("test-key-abc123").unwrap();
        assert_eq!(get_api_key().as_deref(), Some("test-key-abc123"));
        assert!(has_api_key());

        clear_api_key().unwrap();
        assert!(get_api_key().is_none());
        assert!(!has_api_key());
    }

    #[test]
    fn clear_when_no_key_is_ok() {
        let _ = clear_api_key();
        assert!(clear_api_key().is_ok());
    }

    #[test]
    fn has_api_key_false_when_unset() {
        let _ = clear_api_key();
        assert!(!has_api_key());
    }
}
