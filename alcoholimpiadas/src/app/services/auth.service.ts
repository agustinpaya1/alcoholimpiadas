import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthChangeEvent, Session, User } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private session: Session | null = null;

  constructor(private supabase: SupabaseService) {
    // Escucha cambios en la sesión (login/logout)
    this.supabase.client.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      this.session = session;
    });
  }

  // ⏱️ Obtener la sesión actual
  getSession(): Session | null {
    return this.session;
  }

  // 👤 Obtener el usuario actual
  getUser(): User | null {
    return this.session?.user ?? null;
  }

  // 🔐 Login con email y password
  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    this.session = data.session;
    return data;
  }

  // 🆕 Registro con email y password
  async signUp(email: string, password: string) {
    const { data, error } = await this.supabase.client.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  }

  // 🚪 Logout
  async signOut() {
    const { error } = await this.supabase.client.auth.signOut();
    if (error) throw error;
    this.session = null;
  }

  // 📥 Cargar el perfil del usuario desde la tabla `users`
  async getUserProfile() {
    const user = this.getUser();
    if (!user) return null;

    const { data, error } = await this.supabase.client
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle(); // Usar maybeSingle() en lugar de single()

    if (error) {
      console.error('Error al obtener perfil:', error);
      return null; // Retornar null en lugar de lanzar error
    }
    return data;
  }
}