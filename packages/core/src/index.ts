// Modelo de datos compartido entre apps/desktop y apps/demo-web
// Este archivo NO habla con SQLite ni con el navegador directamente.
// Cada app implementa su propio "adapter" (ver DataAdapter más abajo)
// que sí sabe cómo guardar/leer estos tipos.

export type SocialPlatform =
  | "instagram"
  | "facebook"
  | "tiktok"
  | "linkedin"
  | "youtube"
  | "x"
  | "pinterest"
  | "threads";

export type JobStatus =
  | "PENDING"
  | "READY"
  | "PROCESSING"
  | "PUBLISHED"
  | "FAILED"
  | "RETRY"
  | "READY_FOR_USER";

export interface SocialAccount {
  id: string;
  platform: SocialPlatform;
  displayName: string;
  connectedAt: number; // epoch ms
  // El token real NUNCA vive aquí. Vive cifrado en el Keychain del SO
  // (desktop) o simplemente no existe (demo web, que no publica de verdad).
}

export interface MediaAsset {
  id: string;
  fileName: string;
  mimeType: string;
  // En desktop: ruta local. En demo web: objectURL/blob temporal.
  localRef: string;
  sizeBytes: number;
}

export interface Post {
  id: string;
  text: string;
  mediaIds: string[];
  platforms: SocialPlatform[];
  scheduledFor: number | null; // epoch ms, null = draft - permite N posts el mismo día
  status: JobStatus;
  createdAt: number;
  updatedAt: number;
  failureReason?: string;
  linkUrl?: string | null; // Nuevo: FB soporta link nativo, IG se concatena al caption
}

export interface Workspace {
  id: string;
  name: string;
  createdAt: number;
}

// Contrato que cada app implementa a su manera:
// - apps/desktop -> llama comandos de Tauri (Rust + SQLite)
// - apps/demo-web -> guarda todo en memoria/IndexedDB del navegador
export interface DataAdapter {
  listPosts(workspaceId: string): Promise<Post[]>;
  createPost(post: Omit<Post, "id" | "createdAt" | "updatedAt"> & { workspaceId: string }): Promise<Post>;
  updatePost(id: string, patch: Partial<Post>): Promise<Post>;
  deletePost(id: string): Promise<void>;
  listAccounts(workspaceId: string): Promise<SocialAccount[]>;
  listMedia(workspaceId: string): Promise<MediaAsset[]>;
  addMedia(asset: Omit<MediaAsset, "id">): Promise<MediaAsset>;
}

export * from "./i18n";
export * from "./useLocale";
