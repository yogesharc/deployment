use std::collections::HashMap;
use std::sync::Mutex;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CachedAccount {
    pub id: String,
    pub username: String,
    pub email: String,
    pub name: Option<String>,
    pub scope_type: String,
    pub team_name: Option<String>,
    pub team_slug: Option<String>,
    pub token: String,
    #[serde(default = "default_provider")]
    pub provider: String,
}

fn default_provider() -> String {
    "vercel".to_string()
}

#[derive(Default)]
pub struct AppState {
    // Cache tokens in memory to avoid repeated keychain access
    pub tokens: Mutex<HashMap<String, String>>,
    // Cache account info
    pub accounts: Mutex<HashMap<String, CachedAccount>>,
    // Active account ID
    pub active_account_id: Mutex<Option<String>>,
    // Whether we've loaded from keychain
    pub initialized: Mutex<bool>,
}

impl AppState {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn get_token(&self, account_id: &str) -> Option<String> {
        self.tokens.lock().unwrap().get(account_id).cloned()
    }

    pub fn set_token(&self, account_id: &str, token: &str) {
        self.tokens.lock().unwrap().insert(account_id.to_string(), token.to_string());
    }

    pub fn remove_token(&self, account_id: &str) {
        self.tokens.lock().unwrap().remove(account_id);
        self.accounts.lock().unwrap().remove(account_id);
    }

    pub fn get_account(&self, account_id: &str) -> Option<CachedAccount> {
        self.accounts.lock().unwrap().get(account_id).cloned()
    }

    pub fn set_account(&self, account: CachedAccount) {
        let id = account.id.clone();
        self.accounts.lock().unwrap().insert(id, account);
    }

    pub fn get_all_accounts(&self) -> Vec<CachedAccount> {
        self.accounts.lock().unwrap().values().cloned().collect()
    }

    pub fn get_active_account_id(&self) -> Option<String> {
        self.active_account_id.lock().unwrap().clone()
    }

    pub fn set_active_account_id(&self, id: Option<String>) {
        *self.active_account_id.lock().unwrap() = id;
    }

    pub fn is_initialized(&self) -> bool {
        *self.initialized.lock().unwrap()
    }

    pub fn set_initialized(&self, val: bool) {
        *self.initialized.lock().unwrap() = val;
    }

    pub fn rename_account(&self, account_id: &str, new_name: &str) {
        if let Some(account) = self.accounts.lock().unwrap().get_mut(account_id) {
            account.name = Some(new_name.to_string());
            account.username = new_name.to_string();
        }
    }
}
