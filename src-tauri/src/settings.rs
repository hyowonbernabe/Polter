// Windows Credential Manager API via windows-rs (already a dependency).
// This replaces the keyring crate which does not persist on this machine.

#[cfg(windows)]
mod credential {
    use windows::Win32::Foundation::{ERROR_NOT_FOUND, FILETIME};
    use windows::Win32::Security::Credentials::{
        CredDeleteW, CredReadW, CredWriteW, CREDENTIALW, CRED_FLAGS, CRED_PERSIST_LOCAL_MACHINE,
        CRED_TYPE_GENERIC,
    };
    use windows::core::{PCWSTR, PWSTR};

    const TARGET: &str = "wisp/openrouter-api-key";

    fn to_wide(s: &str) -> Vec<u16> {
        s.encode_utf16().chain(std::iter::once(0)).collect()
    }

    pub fn set(key: &str) -> Result<(), String> {
        let target = to_wide(TARGET);
        let mut blob: Vec<u8> = key.as_bytes().to_vec();
        let cred = CREDENTIALW {
            Flags: CRED_FLAGS(0),
            Type: CRED_TYPE_GENERIC,
            TargetName: PWSTR(target.as_ptr() as *mut u16),
            Comment: PWSTR::null(),
            LastWritten: FILETIME::default(),
            CredentialBlobSize: blob.len() as u32,
            CredentialBlob: blob.as_mut_ptr(),
            Persist: CRED_PERSIST_LOCAL_MACHINE,
            AttributeCount: 0,
            Attributes: std::ptr::null_mut(),
            TargetAlias: PWSTR::null(),
            UserName: PWSTR::null(),
        };
        unsafe { CredWriteW(&cred, 0).map_err(|e| e.to_string()) }
    }

    pub fn get() -> Option<String> {
        let target = to_wide(TARGET);
        let mut cred_ptr = std::ptr::null_mut();
        unsafe {
            CredReadW(
                PCWSTR(target.as_ptr()),
                CRED_TYPE_GENERIC,
                0,
                &mut cred_ptr,
            )
            .ok()?;
            let cred = &*cred_ptr;
            let blob = std::slice::from_raw_parts(
                cred.CredentialBlob,
                cred.CredentialBlobSize as usize,
            );
            let s = String::from_utf8(blob.to_vec()).ok();
            windows::Win32::Security::Credentials::CredFree(cred_ptr as *const _);
            s
        }
    }

    pub fn delete() -> Result<(), String> {
        let target = to_wide(TARGET);
        unsafe {
            match CredDeleteW(PCWSTR(target.as_ptr()), CRED_TYPE_GENERIC, 0) {
                Ok(()) => Ok(()),
                Err(e) if e.code() == ERROR_NOT_FOUND.to_hresult() => Ok(()),
                Err(e) => Err(e.to_string()),
            }
        }
    }
}

#[cfg(not(windows))]
mod credential {
    pub fn set(_key: &str) -> Result<(), String> { Ok(()) }
    pub fn get() -> Option<String> { None }
    pub fn delete() -> Result<(), String> { Ok(()) }
}

pub fn get_api_key() -> Option<String> {
    credential::get()
}

pub fn set_api_key(key: &str) -> Result<(), String> {
    credential::set(key)
}

pub fn clear_api_key() -> Result<(), String> {
    credential::delete()
}

pub fn has_api_key() -> bool {
    credential::get().is_some()
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
