//! French / English strings, generated from `src/utils/translations.ts`
//! by `native/tools/gen-assets.mjs`.

use std::collections::HashMap;
use std::sync::OnceLock;

use crate::settings::Language;

type Table = HashMap<String, String>;

struct Tables {
    fr: Table,
    en: Table,
}

fn tables() -> &'static Tables {
    static TABLES: OnceLock<Tables> = OnceLock::new();
    TABLES.get_or_init(|| {
        let mut all: HashMap<String, Table> =
            serde_json::from_str(include_str!("../assets/i18n.json")).expect("assets/i18n.json is valid");
        Tables {
            fr: all.remove("fr").unwrap_or_default(),
            en: all.remove("en").unwrap_or_default(),
        }
    })
}

/// Translator bound to the current language. Cheap to copy around the view code.
#[derive(Debug, Clone, Copy)]
pub struct Tr(pub Language);

impl Tr {
    /// Falls back to English, then to the key itself, like `createTranslator`.
    pub fn t(self, key: &'static str) -> &'static str {
        let tables = tables();
        let table = match self.0 {
            Language::Fr => &tables.fr,
            Language::En => &tables.en,
        };
        table.get(key).or_else(|| tables.en.get(key)).map(String::as_str).unwrap_or(key)
    }

    /// Like [`Tr::t`], replacing each `{name}` placeholder.
    pub fn tf(self, key: &'static str, params: &[(&str, &dyn std::fmt::Display)]) -> String {
        let mut text = self.t(key).to_string();
        for (name, value) in params {
            text = text.replacen(&format!("{{{name}}}"), &value.to_string(), 1);
        }
        text
    }

    pub fn is_french(self) -> bool {
        self.0 == Language::Fr
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn startup_failure_has_its_own_message_in_both_languages() {
        let french = Tr(Language::Fr).t("toast_startup_error");
        let english = Tr(Language::En).t("toast_startup_error");

        assert_ne!(french, "toast_startup_error");
        assert_ne!(english, "toast_startup_error");
        assert_ne!(french, english);
    }
}
