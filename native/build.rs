//! Embeds the application icon and version details into the executable.

fn main() {
    println!("cargo:rerun-if-changed=../src-tauri/icons/icon.ico");

    let mut resource = winresource::WindowsResource::new();
    resource.set_icon("../src-tauri/icons/icon.ico");
    resource.set("ProductName", "Koi Monitor");
    resource.set("FileDescription", "Koi Monitor");
    resource.set("LegalCopyright", "MIT - Katana");

    if let Err(error) = resource.compile() {
        // The icon is cosmetic: a missing resource compiler must not block the build.
        println!("cargo:warning=Could not embed the Windows resources: {error}");
    }
}
