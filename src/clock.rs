//! Local wall-clock time and date, for the Zen clock.

use windows::Win32::System::SystemInformation::GetLocalTime;

use crate::settings::Language;

#[derive(Debug, Clone, Copy)]
pub struct LocalTime {
    pub hour: u16,
    pub minute: u16,
    pub second: u16,
    day: u16,
    /// 1–12
    month: u16,
    /// 0 = Sunday
    weekday: u16,
}

pub fn now() -> LocalTime {
    let time = unsafe { GetLocalTime() };
    LocalTime {
        hour: time.wHour,
        minute: time.wMinute,
        second: time.wSecond,
        day: time.wDay,
        month: time.wMonth,
        weekday: time.wDayOfWeek,
    }
}

const WEEKDAYS_FR: [&str; 7] = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const WEEKDAYS_EN: [&str; 7] = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS_FR: [&str; 12] = [
    "janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre",
    "décembre",
];
const MONTHS_EN: [&str; 12] = [
    "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November",
    "December",
];

impl LocalTime {
    /// "Vendredi 2 octobre" / "Friday, October 2", as `toLocaleDateString` formats it.
    pub fn long_date(&self, language: Language) -> String {
        let weekday = (self.weekday as usize).min(6);
        let month = (self.month as usize).clamp(1, 12) - 1;
        match language {
            Language::Fr => {
                let day = if self.day == 1 { "1er".to_string() } else { self.day.to_string() };
                format!("{} {day} {}", WEEKDAYS_FR[weekday], MONTHS_FR[month])
            }
            Language::En => format!("{}, {} {}", WEEKDAYS_EN[weekday], MONTHS_EN[month], self.day),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn long_date_follows_the_language() {
        let time = LocalTime { hour: 9, minute: 5, second: 0, day: 2, month: 10, weekday: 5 };
        assert_eq!(time.long_date(Language::Fr), "Vendredi 2 octobre");
        assert_eq!(time.long_date(Language::En), "Friday, October 2");

        let first = LocalTime { day: 1, ..time };
        assert_eq!(first.long_date(Language::Fr), "Vendredi 1er octobre");
    }
}
