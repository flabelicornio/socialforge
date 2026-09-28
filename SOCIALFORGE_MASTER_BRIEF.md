# SocialForge — Executive Brief & State of the Art

## 1. Vision & Core Premise
SocialForge is a **local-first desktop application** designed for content creators and agencies to create, schedule, and manage social media posts without relying on recurring cloud SaaS subscriptions.
- **Local Source of Truth**: User data resides 100% on their machine via SQLite.
- **Privacy & Ownership**: Credentials and access tokens are saved in the OS Keychain (Windows Credential Manager / macOS Keychain).
- **Architecture**: React/Vite (Frontend) + Tauri/Rust (Backend) + SQLite (Persistence).

---

## 2. Technical Stack & Repository Structure
- **Root Repository**: `C:\Users\alejh\OneDrive\Docs-ForLatam\socialforge`
- **Frontend**: `apps/desktop/src/App.tsx` (React + TypeScript)
- **Backend**: `apps/desktop/src-tauri/src/main.rs` (Tauri v2 + Rust + `rusqlite` + `keyring`)
- **Database Migrations**: `apps/desktop/src-tauri/migrations/` (001_init to 005_account_external_id)
- **Cloud Auxiliary**: Worker en Cloudflare (`https://socialforge.wolves-and-crows.workers.dev`) únicamente para el flujo OAuth de Meta/Facebook.

---

## 3. Progress Log & Major Milestones Achieved
- [x] **Core Desktop Setup**: Configured Tauri v2 + React build environment via GitHub Actions.
- [x] **Database Initialization**: Fixed SQLite versioning & PRAGMA user_version mismatches across migrations.
- [x] **Local Persistence**: Resolved `FOREIGN KEY constraint failed` on `posts.workspace_id` by auto-seeding and enforcing the `'default'` workspace in Rust (`main.rs`).
- [x] **Post Management (CRUD - Phase 1)**: Verified end-to-end flow to create text/link posts and persist them across app restarts (Verified in Build #33).
- [x] **Post Management (CRUD - Phase 2)**: Added deletion logic and UI modals for post management (Build #34).

---

## 4. Current Database Schema (Key Tables)
- **`workspaces`**: `(id PRIMARY KEY, name, created_at)` — Default: `'default'`.
- **`posts`**: `(id, workspace_id FK, text, platforms [JSON], media_ids [JSON], link_url, scheduled_for, status, failure_reason, created_at, updated_at)`.
- **`accounts`**: `(id, workspace_id FK, platform, display_name, connected_at, external_account_id, extra_json)`. Tokens stored in system keyring.
- **`media_assets`**: `(id, workspace_id FK, file_name, mime_type, local_path, size_bytes, created_at)`.
- **`jobs`**: Scheduler engine queue for automatic post publication.

---

## 5. Next Steps / Immediate Roadmap
1. **Media Handling (Multiple Assets per Post)**:
   - Implement Tauri file picker / native file drop in `App.tsx`.
   - Store local copies of images/videos under `%APPDATA%/studios.latam.socialforge/media/`.
   - Map asset IDs in `posts.media_ids`.
2. **Post Edition**:
   - Add `update_post` handler UI in `App.tsx` (edit text, link, date, and attached media).
3. **Meta / Facebook & Instagram Integration**:
   - Connect UI to `complete_facebook_connection` and `list_connected_accounts`.
   - Test account linking via Worker OAuth flow.
4. **App Branding & Windows Code Signing**:
   - Replace default icons and setup Windows Code Signing certificate for `Latam Studios`.