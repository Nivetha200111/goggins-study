import { createClient } from "@supabase/supabase-js";

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

export async function validateInviteCode(code: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("invite_codes")
    .select("*")
    .eq("code", code.toUpperCase())
    .single();

  if (error || !data) return false;

  const now = new Date();
  if (data.expires_at && new Date(data.expires_at) < now) return false;
  if (data.uses_remaining !== null && data.uses_remaining <= 0) return false;

  if (data.uses_remaining !== null) {
    await supabase
      .from("invite_codes")
      .update({ uses_remaining: data.uses_remaining - 1 })
      .eq("id", data.id);
  }

  return true;
}

export async function createUser(username: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from("users")
    .insert({ username })
    .select()
    .single();

  if (error) {
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

export async function updateUser(userId: string, updates: Partial<UserProfile>): Promise<void> {
  await supabase.from("users").update(updates).eq("id", userId);
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
