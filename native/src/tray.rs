//! Notification-area icon ("Discrete presence").
//!
//! The icon lives on its own thread with a small Win32 message loop, so it keeps
//! working when Koi has no window at all. Clicks are forwarded to the UI as events.

use iced::futures::channel::mpsc;
use iced::futures::Stream;
use std::sync::{Mutex, OnceLock};
use tray_icon::menu::{Menu, MenuEvent, MenuItem};
use tray_icon::{Icon, MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use windows::Win32::Foundation::{LPARAM, WPARAM};
use windows::Win32::System::Threading::GetCurrentThreadId;
use windows::Win32::UI::WindowsAndMessaging::{
    DispatchMessageW, GetMessageW, PostThreadMessageW, TranslateMessage, MSG, WM_QUIT,
};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Event {
    /// Left click on the icon, or "Show Koi Monitor".
    Show,
    ToggleWidget,
    Quit,
}

const SHOW_ID: &str = "tray-show";
const WIDGET_ID: &str = "tray-toggle-widget";
const QUIT_ID: &str = "tray-quit";

static EVENTS: OnceLock<Mutex<mpsc::Sender<Event>>> = OnceLock::new();

fn emit(event: Event) {
    if let Some(sender) = EVENTS.get() {
        if let Ok(mut sender) = sender.lock() {
            let _ = sender.try_send(event);
        }
    }
}

/// Clicks on the tray icon and its menu, for the lifetime of the application.
pub fn events() -> impl Stream<Item = Event> {
    let (sender, receiver) = mpsc::channel(8);
    // A second subscription would replace the sender; the handlers below are global anyway.
    match EVENTS.get() {
        Some(existing) => {
            if let Ok(mut existing) = existing.lock() {
                *existing = sender;
            }
        }
        None => {
            let _ = EVENTS.set(Mutex::new(sender));
        }
    }

    MenuEvent::set_event_handler(Some(|event: MenuEvent| match event.id().as_ref() {
        SHOW_ID => emit(Event::Show),
        WIDGET_ID => emit(Event::ToggleWidget),
        QUIT_ID => emit(Event::Quit),
        _ => {}
    }));
    TrayIconEvent::set_event_handler(Some(|event: TrayIconEvent| {
        if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
            emit(Event::Show);
        }
    }));

    receiver
}

/// Menu labels, in the UI language.
pub struct Labels {
    pub show: String,
    pub toggle_widget: String,
    pub quit: String,
}

/// The icon in the notification area; dropping it removes the icon.
pub struct Tray {
    thread_id: u32,
}

impl Tray {
    pub fn spawn(labels: Labels) -> Self {
        let (ready, started) = std::sync::mpsc::channel();

        std::thread::spawn(move || {
            let _ = ready.send(unsafe { GetCurrentThreadId() });

            let menu = Menu::new();
            let items = [
                MenuItem::with_id(SHOW_ID, &labels.show, true, None),
                MenuItem::with_id(WIDGET_ID, &labels.toggle_widget, true, None),
                MenuItem::with_id(QUIT_ID, &labels.quit, true, None),
            ];
            for item in &items {
                if let Err(error) = menu.append(item) {
                    log::warn!("Tray menu: {error}");
                }
            }

            let mut builder = TrayIconBuilder::new()
                .with_tooltip("Koi Monitor")
                .with_menu(Box::new(menu))
                .with_menu_on_left_click(false);
            if let Some((rgba, width, height)) = crate::icon::tray() {
                match Icon::from_rgba(rgba, width, height) {
                    Ok(icon) => builder = builder.with_icon(icon),
                    Err(error) => log::warn!("Tray icon: {error}"),
                }
            }

            let _tray = match builder.build() {
                Ok(tray) => tray,
                Err(error) => {
                    log::warn!("Cannot create the tray icon: {error}");
                    return;
                }
            };

            // The icon's hidden window needs its messages pumped; WM_QUIT ends the loop
            // and drops the icon.
            let mut message = MSG::default();
            unsafe {
                while GetMessageW(&mut message, None, 0, 0).as_bool() {
                    let _ = TranslateMessage(&message);
                    DispatchMessageW(&message);
                }
            }
        });

        Self { thread_id: started.recv().unwrap_or(0) }
    }
}

impl Drop for Tray {
    fn drop(&mut self) {
        if self.thread_id != 0 {
            unsafe {
                let _ = PostThreadMessageW(self.thread_id, WM_QUIT, WPARAM(0), LPARAM(0));
            }
        }
    }
}
