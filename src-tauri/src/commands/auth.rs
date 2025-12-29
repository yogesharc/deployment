use keyring::Entry;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, State};
use crate::vercel::{self, User};
use crate::state::{AppState, CachedAccount};

const SERVICE_NAME: &str = "vercel-menubar";
const KEYCHAIN_KEY: &str = "app-data"; // Single keychain entry for all data

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Account {
    pub id: String,
    pub username: String,
    pub email: String,
    pub name: Option<String>,
    pub scope_type: String,
    pub team_name: Option<String>,
    pub team_slug: Option<String>,
}

impl From<CachedAccount> for Account {
    fn from(c: CachedAccount) -> Self {
        Account {
            id: c.id,
            username: c.username,
            email: c.email,
            name: c.name,
            scope_type: c.scope_type,
            team_name: c.team_name,
            team_slug: c.team_slug,
        }
    }
}

// All data stored in a single keychain entry
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct KeychainData {
    accounts: Vec<StoredAccount>,
    active_account_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct StoredAccount {
    id: String,
    username: String,
    email: String,
    name: Option<String>,
    scope_type: String,
    team_name: Option<String>,
    team_slug: Option<String>,
    token: String,
}

fn get_keychain_entry() -> Result<Entry, String> {
    Entry::new(SERVICE_NAME, KEYCHAIN_KEY)
        .map_err(|e| format!("Failed to create keyring entry: {}", e))
}

// Load all data from keychain in ONE read
fn load_keychain_data() -> Result<KeychainData, String> {
    let entry = get_keychain_entry()?;
    match entry.get_password() {
        Ok(data) => {
            serde_json::from_str(&data)
                .map_err(|e| format!("Failed to parse keychain data: {}", e))
        }
        Err(keyring::Error::NoEntry) => Ok(KeychainData::default()),
        Err(e) => Err(format!("Failed to get keychain data: {}", e)),
    }
}

// Save all data to keychain in ONE write
fn save_keychain_data(data: &KeychainData) -> Result<(), String> {
    let entry = get_keychain_entry()?;
    let json = serde_json::to_string(data)
        .map_err(|e| format!("Failed to serialize keychain data: {}", e))?;
    entry.set_password(&json)
        .map_err(|e| format!("Failed to save keychain data: {}", e))
}

// Initialize state from keychain - only called once
pub async fn initialize_state(state: &AppState) -> Result<(), String> {
    if state.is_initialized() {
        return Ok(());
    }

    // Load ALL data from keychain in a single read
    let keychain_data = load_keychain_data()?;

    // Set active account
    state.set_active_account_id(keychain_data.active_account_id);

    // Load each account into cache
    for stored in keychain_data.accounts {
        state.set_token(&stored.id, &stored.token);
        state.set_account(CachedAccount {
            id: stored.id,
            username: stored.username,
            email: stored.email,
            name: stored.name,
            scope_type: stored.scope_type,
            team_name: stored.team_name,
            team_slug: stored.team_slug,
            token: stored.token,
        });
    }

    state.set_initialized(true);
    Ok(())
}

// Save current state to keychain
fn save_state_to_keychain(state: &AppState) -> Result<(), String> {
    let accounts = state.get_all_accounts();
    let stored_accounts: Vec<StoredAccount> = accounts.into_iter().map(|a| StoredAccount {
        id: a.id,
        username: a.username,
        email: a.email,
        name: a.name,
        scope_type: a.scope_type,
        team_name: a.team_name,
        team_slug: a.team_slug,
        token: a.token,
    }).collect();

    let data = KeychainData {
        accounts: stored_accounts,
        active_account_id: state.get_active_account_id(),
    };

    save_keychain_data(&data)
}

#[tauri::command]
pub async fn add_account(token: String, state: State<'_, AppState>) -> Result<Account, String> {
    // Initialize if needed
    initialize_state(&state).await?;

    // Validate token by making API call
    let client = vercel::create_client(&token)
        .map_err(|e| format!("Failed to create client: {}", e))?;

    let user = client
        .get_user()
        .await
        .map_err(|e| format!("Invalid token: {}", e))?;

    // Get token info to determine scope
    let (scope_type, team_name, team_slug) = match client.get_token_info().await {
        Ok(token_info) => {
            if let Some(team_id) = token_info.team_id {
                let team_info = client.get_team(&team_id).await.ok();
                let team_name = team_info.as_ref().map(|t| t.name.clone());
                let team_slug = team_info.as_ref().map(|t| t.slug.clone());
                ("team".to_string(), team_name, team_slug)
            } else {
                ("user".to_string(), None, None)
            }
        }
        Err(_) => ("user".to_string(), None, None),
    };

    // Cache in memory
    let cached = CachedAccount {
        id: user.id.clone(),
        username: user.username.clone(),
        email: user.email.clone(),
        name: user.name.clone(),
        scope_type: scope_type.clone(),
        team_name: team_name.clone(),
        team_slug: team_slug.clone(),
        token,
    };
    state.set_account(cached.clone());
    state.set_token(&user.id, &cached.token);

    // Save to keychain (single write)
    save_state_to_keychain(&state)?;

    Ok(Account {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        scope_type,
        team_name,
        team_slug,
    })
}

#[tauri::command]
pub async fn list_accounts(state: State<'_, AppState>) -> Result<Vec<Account>, String> {
    // Initialize if needed
    initialize_state(&state).await?;

    // Return cached accounts
    Ok(state.get_all_accounts().into_iter().map(Account::from).collect())
}

#[tauri::command]
pub async fn get_account_token(account_id: String, state: State<'_, AppState>) -> Result<Option<String>, String> {
    // Initialize if needed
    initialize_state(&state).await?;

    // Return from cache
    Ok(state.get_token(&account_id))
}

#[tauri::command]
pub async fn remove_account(account_id: String, state: State<'_, AppState>) -> Result<(), String> {
    // Initialize if needed
    initialize_state(&state).await?;

    // Remove from cache
    state.remove_token(&account_id);

    // Save to keychain (single write)
    save_state_to_keychain(&state)?;

    Ok(())
}

#[tauri::command]
pub async fn get_active_account(state: State<'_, AppState>) -> Result<Option<String>, String> {
    // Initialize if needed
    initialize_state(&state).await?;

    Ok(state.get_active_account_id())
}

#[tauri::command]
pub async fn set_active_account(account_id: String, state: State<'_, AppState>) -> Result<(), String> {
    // Initialize if needed
    initialize_state(&state).await?;

    // Update cache
    state.set_active_account_id(Some(account_id));

    // Save to keychain (single write)
    save_state_to_keychain(&state)?;

    Ok(())
}

// Legacy commands for compatibility
#[tauri::command]
pub async fn save_token(token: String, state: State<'_, AppState>) -> Result<User, String> {
    let account = add_account(token, state.clone()).await?;
    set_active_account(account.id.clone(), state).await?;

    Ok(User {
        id: account.id,
        username: account.username,
        email: account.email,
        name: account.name,
    })
}

#[tauri::command]
pub async fn get_stored_token(state: State<'_, AppState>) -> Result<Option<String>, String> {
    let active_id = get_active_account(state.clone()).await?;
    match active_id {
        Some(id) => get_account_token(id, state).await,
        None => Ok(None),
    }
}

#[tauri::command]
pub async fn validate_stored_token(state: State<'_, AppState>) -> Result<Option<User>, String> {
    // Initialize state from keychain (single read)
    initialize_state(&state).await?;

    let token = match get_stored_token(state.clone()).await? {
        Some(t) => t,
        None => return Ok(None),
    };

    let client = vercel::create_client(&token)
        .map_err(|e| format!("Failed to create client: {}", e))?;

    match client.get_user().await {
        Ok(user) => Ok(Some(user)),
        Err(_) => {
            // Token invalid, remove the account
            if let Some(id) = get_active_account(state.clone()).await? {
                let _ = remove_account(id, state).await;
            }
            Ok(None)
        }
    }
}

#[tauri::command]
pub async fn delete_token(state: State<'_, AppState>) -> Result<(), String> {
    if let Some(id) = get_active_account(state.clone()).await? {
        remove_account(id, state).await?;
    }
    Ok(())
}

#[tauri::command]
pub async fn get_current_account(state: State<'_, AppState>) -> Result<Option<Account>, String> {
    initialize_state(&state).await?;

    let active_id = match state.get_active_account_id() {
        Some(id) => id,
        None => return Ok(None),
    };

    Ok(state.get_all_accounts()
        .into_iter()
        .find(|a| a.id == active_id)
        .map(Account::from))
}

#[tauri::command]
pub fn open_vercel_tokens(_app: AppHandle) {
    let _ = open::that("https://vercel.com/account/tokens");
}
