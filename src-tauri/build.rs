use std::{env, fs, path::PathBuf};

const ICON_PATHS: &[&str] = &[
    "icons/icon.ico",
    "icons/icon.png",
    "icons/32x32.png",
    "icons/128x128.png",
    "icons/128x128@2x.png",
    "icons/icon-source.png",
];

fn icon_digest(data: &[u8]) -> String {
    let mut h: u64 = 0xcbf29ce484222325;
    for b in data {
        h ^= *b as u64;
        h = h.wrapping_mul(0x100000001b3);
    }
    format!("{h:016x}")
}

fn main() {
    for icon in ICON_PATHS {
        println!("cargo:rerun-if-changed={icon}");
    }

    let icon_src = PathBuf::from("icons/icon.ico");
    let mut windows = tauri_build::WindowsAttributes::new();

    if icon_src.exists() {
        let bytes = fs::read(&icon_src).expect("read icons/icon.ico");
        let digest = icon_digest(&bytes);

        let out_dir = PathBuf::from(env::var("OUT_DIR").expect("OUT_DIR"));
        let embedded = out_dir.join("koi-windows-icon.ico");
        fs::copy(&icon_src, &embedded).expect("copy icon into OUT_DIR");

        // Digest in .rc forces winres/embed-resource to recompile when icon bytes change
        // (same ICON path string alone can leave a stale PE icon linked).
        windows = windows
            .window_icon_path(&embedded)
            .append_rc_content(format!("// koi-icon-digest: {digest}\n"));
    }

    let attrs = tauri_build::Attributes::new().windows_attributes(windows);
    tauri_build::try_build(attrs).expect("failed to run tauri-build");
}
