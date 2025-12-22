import { createClient } from "@supabase/supabase-js";
import type { Whitelist } from "@/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface InviteCode {
  id: string;
  code: string;
  uses_remaining: number | null;
  expires_at: string | null;
  created_at: string;
}

export interface UserProfile {
  id: string;
  username: string;
  invite_code: string | null;
  total_xp: number;
  level: number;
  streak: number;
  last_active_date: string | null;
  created_at: string;
}

export interface StudyTab {
  id: string;
  user_id: string;
  name: string;
  color: string;
  focus_minutes: number;
  distractions: number;
  xp: number;
  created_at: string;
}

const DEFAULT_WHITELIST: Whitelist = { domains: [], apps: [], keywords: [] };

export async function validateInviteCode(code: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("invite_codes")
    .select("*")
    .eq("code", code.toUpperCase())
    .single();

  if (error || !data) return false;

  const now = new Date();
  if (data.expires_at && new Date(data.expires_at) < now) return false;
  const usesRemaining = data.uses_remaining ?? 1;
  if (usesRemaining <= 0) return false;

  const { error: updateError } = await supabase
    .from("invite_codes")
    .update({ uses_remaining: usesRemaining - 1 })
    .eq("id", data.id);

  if (updateError) {
    console.error("Error updating invite code:", updateError);
    return false;
  }

  return true;
}

export async function createUser(
  username: string,
  inviteCode: string
): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from("users")
    .insert({ username, invite_code: inviteCode.toUpperCase() })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      console.error("Username already exists:", username);
      return null;
    }
    console.error("Error creating user:", error);
    return null;
  }

  return data;
}

export async function getUser(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) return null;
  return data;
}

export async function getUserByUsername(username: string): Promise<UserProfile | null> {
  const trimmed = username.trim();
  if (!trimmed) return null;
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .ilike("username", trimmed)
    .limit(1)
    .maybeSingle();

  if (error) return null;
  return data || null;
}

export async function updateUser(userId: string, updates: Partial<UserProfile>): Promise<void> {
  await supabase.from("users").update(updates).eq("id", userId);
}

export async function getUserWhitelist(userId: string): Promise<Whitelist> {
  const { data, error } = await supabase
    .from("whitelists")
    .select("domains, keywords, apps")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    if (error) {
      console.error("Error loading whitelist:", error);
    }
    return DEFAULT_WHITELIST;
  }

  return {
    domains: data.domains ?? [],
    keywords: data.keywords ?? [],
    apps: data.apps ?? [],
  };
}

export async function setUserWhitelist(userId: string, whitelist: Whitelist): Promise<void> {
  const { error } = await supabase.from("whitelists").upsert({
    user_id: userId,
    domains: whitelist.domains,
    keywords: whitelist.keywords,
    apps: whitelist.apps ?? [],
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error("Error saving whitelist:", error);
  }
}

export async function getUserTabs(userId: string): Promise<StudyTab[]> {
  const { data, error } = await supabase
    .from("study_tabs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) return [];
  return data || [];
}

export async function createTab(userId: string, name: string, color: string): Promise<StudyTab | null> {
  const { data, error } = await supabase
    .from("study_tabs")
    .insert({ user_id: userId, name, color })
    .select()
    .single();

  if (error) return null;
  return data;
}

export async function updateTab(tabId: string, updates: Partial<StudyTab>): Promise<void> {
  await supabase.from("study_tabs").update(updates).eq("id", tabId);
}

export async function deleteTab(tabId: string): Promise<void> {
  await supabase.from("study_tabs").delete().eq("id", tabId);
}
