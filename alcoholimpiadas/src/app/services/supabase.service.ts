import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from 'src/environments/environment';

// Modelo compartido de Room
export interface Room {
  id: string;
  name: string;
  max_players: number;
  num_teams: number;
  current_players?: number;
  status: 'waiting' | 'playing' | 'finished';
  created_at: string;
  created_by?: string;
}

// Modelo de jugador en sala
export interface RoomPlayer {
  id: string;
  room_id: string;
  user_id: string;
  player_name: string;
  role: 'host' | 'player';
  team_number?: number;
  team_color?: string;
  joined_at: string;
}

// Modelo de Challenge (corregido)
export interface Challenge {
  id: string;
  title: string;
  description: string | null;
  order: number | null;
  status: 'pending' | 'active' | 'completed' | null;
  winner_team_id: string | null;  // uuid en DB
  image_url: string | null;
  duration: number | null;
  difficulty: 'easy' | 'medium' | 'hard' | null;
  created_at: string;
}

// Payload para crear una sala
export type NewRoom = Omit<Room, 'id' | 'created_at' | 'current_players'>;

// Colores disponibles por equipo
export const TEAM_COLORS = {
  1: ['#FF6B6B', '#FF8E8E', '#FFB1B1'], // Rojos
  2: ['#4ECDC4', '#7ED7D1', '#AEE2DE'], // Verdes
  3: ['#45B7D1', '#6BC5D8', '#91D3DF'], // Azules
  4: ['#FFA726', '#FFB74D', '#FFC774']  // Naranjas
};

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    console.log('🔧 [SupabaseService] Inicializando servicio...');
    console.log('🌐 [SupabaseService] URL:', environment.supabaseUrl);
    console.log('🔑 [SupabaseService] Key disponible:', !!environment.supabaseKey);
    
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
    
    console.log('✅ [SupabaseService] Cliente creado exitosamente');
  }

  get client() {
    return this.supabase;
  }
  
  // Crear una nueva sala
  async createRoom(room: NewRoom, playerName: string): Promise<{ room: Room, player: RoomPlayer }> {
    const user = await this.getCurrentUser();
    if (!user) throw new Error('Usuario no autenticado');

    console.log('Intentando crear sala:', room);
    
    const { data: roomData, error: roomError } = await this.supabase
      .from('rooms')
      .insert({
        name: room.name,
        max_players: room.max_players,
        num_teams: room.num_teams,
        status: room.status,
        created_by: user.id
      })
      .select()
      .single();

    if (roomError) {
      console.error('Error de Supabase:', roomError);
      throw roomError;
    }

    // Agregar al creador como anfitrión
    const { data: playerData, error: playerError } = await this.supabase
      .from('room_players')
      .insert({
        room_id: roomData.id,
        user_id: user.id,
        player_name: playerName,
        role: 'host',
        team_number: 1,
        team_color: TEAM_COLORS[1][0]
      })
      .select()
      .single();

    if (playerError) {
      console.error('Error al agregar anfitrión:', playerError);
      throw playerError;
    }
    
    console.log('Sala creada exitosamente:', roomData);
    return { room: roomData, player: playerData };
  }

  // Obtener todas las salas disponibles
  async getAvailableRooms(): Promise<Room[]> {
    // Primero obtenemos las salas
    const { data: rooms, error: roomsError } = await this.supabase
      .from('rooms')
      .select('*')
      .eq('status', 'waiting')
      .order('created_at', { ascending: false });
  
    if (roomsError) {
      throw roomsError;
    }
  
    if (!rooms || rooms.length === 0) {
      return [];
    }
  
    // Luego obtenemos el conteo de jugadores para todas las salas de una vez
    const roomIds = rooms.map(room => room.id);
    const { data: playerCounts, error: playersError } = await this.supabase
      .from('room_players')
      .select('room_id')
      .in('room_id', roomIds);
  
    if (playersError) {
      console.error('Error al obtener conteo de jugadores:', playersError);
      // Si hay error, devolvemos las salas con current_players = 0
      return rooms.map(room => ({ ...room, current_players: 0 }));
    }
  
    // Contamos jugadores por sala
    const playerCountByRoom: { [roomId: string]: number } = {};
    (playerCounts || []).forEach(player => {
      playerCountByRoom[player.room_id] = (playerCountByRoom[player.room_id] || 0) + 1;
    });
  
    // Combinamos la información
    return rooms.map(room => ({
      ...room,
      current_players: playerCountByRoom[room.id] || 0
    }));
  }

  private async assignTeamAndColor(roomId: string, numTeams: number): Promise<{ team_number: number, team_color: string }> {
    // Obtener jugadores actuales por equipo
    const { data: players } = await this.supabase
      .from('room_players')
      .select('team_number, team_color')
      .eq('room_id', roomId);

    const teamCounts: { [key: number]: number } = {};
    const usedColors: { [key: number]: string[] } = {};

    // Contar jugadores por equipo y colores usados
    players?.forEach(player => {
      if (player.team_number) {
        teamCounts[player.team_number] = (teamCounts[player.team_number] || 0) + 1;
        if (!usedColors[player.team_number]) {
          usedColors[player.team_number] = [];
        }
        if (player.team_color) {
          usedColors[player.team_number].push(player.team_color);
        }
      }
    });

    // Encontrar el equipo con menos jugadores
    let selectedTeam = 1;
    let minCount = teamCounts[1] || 0;

    for (let i = 2; i <= numTeams; i++) {
      const count = teamCounts[i] || 0;
      if (count < minCount) {
        minCount = count;
        selectedTeam = i;
      }
    }

    // Seleccionar color disponible para el equipo
    const availableColors = TEAM_COLORS[selectedTeam as keyof typeof TEAM_COLORS] || TEAM_COLORS[1];
    const teamUsedColors = usedColors[selectedTeam] || [];
    const availableColor = availableColors.find(color => !teamUsedColors.includes(color)) || availableColors[0];

    return {
      team_number: selectedTeam,
      team_color: availableColor
    };
  }

  // Obtener jugadores de una sala
  async getRoomPlayers(roomId: string): Promise<RoomPlayer[]> {
    const { data, error } = await this.supabase
      .from('room_players')
      .select('*')
      .eq('room_id', roomId)
      .order('joined_at', { ascending: true });

    if (error) {
      throw error;
    }
    return data || [];
  }

  // Suscribirse a cambios en jugadores de sala
  subscribeToRoomPlayers(roomId: string, callback: (players: RoomPlayer[]) => void) {
    const channelName = `room_players_${roomId}_${Date.now()}_${Math.random()}`;
    
    return this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_players',
          filter: `room_id=eq.${roomId}`
        },
        async () => {
          try {
            const players = await this.getRoomPlayers(roomId);
            callback(players);
          } catch (error) {
            console.error('Error al recargar jugadores:', error);
          }
        }
      )
      .subscribe((status) => {
        console.log('Estado de suscripción:', status);
      });
  }

  // Obtener usuario actual
  async getCurrentUser() {
    try {
      const { data: { user }, error } = await this.supabase.auth.getUser();
      if (error) {
        console.error('Error al obtener usuario:', error);
        return null;
      }
      return user;
    } catch (error) {
      console.error('Error en getCurrentUser:', error);
      return null;
    }
  }

  // Iniciar juego (solo anfitrión)
  async startGame(roomId: string): Promise<void> {
    const user = await this.getCurrentUser();
    if (!user) throw new Error('Usuario no autenticado');

    // Verificar que es el anfitrión
    const { data: hostPlayer } = await this.supabase
      .from('room_players')
      .select('*')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .eq('role', 'host')
      .single();

    if (!hostPlayer) {
      throw new Error('Solo el anfitrión puede iniciar el juego');
    }

    // Actualizar estado de la sala
    const { error } = await this.supabase
      .from('rooms')
      .update({ status: 'playing' })
      .eq('id', roomId);

    if (error) {
      throw error;
    }
  }

  // Salir de una sala
  async leaveRoom(roomId: string): Promise<void> {
    const user = await this.getCurrentUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { error } = await this.supabase
      .from('room_players')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', user.id);

    if (error) {
      throw error;
    }
  }

  // Actualizar sala
  async updateRoom(roomId: string, updates: Partial<Room>): Promise<Room> {
    const { data, error } = await this.supabase
      .from('rooms')
      .update(updates)
      .eq('id', roomId)
      .select()
      .single();

    if (error) {
      throw error;
    }
    return data;
  }

  // Unirse a una sala
  async joinRoom(roomId: string, playerName: string): Promise<{ room: Room, player: RoomPlayer }> {
    const user = await this.getCurrentUser();
    if (!user) throw new Error('Usuario no autenticado');

    // Verificar que la sala existe y está disponible
    const { data: room, error: roomError } = await this.supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .eq('status', 'waiting')
      .single();

    if (roomError || !room) {
      throw new Error('Sala no encontrada o no disponible');
    }

    // Verificar si ya está en la sala
    const { data: existingPlayer } = await this.supabase
      .from('room_players')
      .select('*')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .single();

    if (existingPlayer) {
      // Si el usuario es el creador de la sala, asegurar que tenga rol de host
      if (room.created_by === user.id && existingPlayer.role !== 'host') {
        const { data: updatedPlayer, error: updateError } = await this.supabase
          .from('room_players')
          .update({ role: 'host' })
          .eq('id', existingPlayer.id)
          .select()
          .single();
        
        if (updateError) {
          console.error('Error al actualizar rol de host:', updateError);
          return { room, player: existingPlayer };
        }
        
        return { room, player: updatedPlayer };
      }
      
      return { room, player: existingPlayer };
    }

    // Contar jugadores actuales
    const { count, error: countError } = await this.supabase
      .from('room_players')
      .select('*', { count: 'exact' })
      .eq('room_id', roomId);
    
    console.log(`DEBUG - Sala ${roomId}:`);
    console.log(`- Jugadores actuales: ${count}`);
    console.log(`- Máximo permitido: ${room.max_players}`);
    console.log(`- Room data:`, room);
    
    if (countError) {
      console.error('Error al contar jugadores:', countError);
    }
    
    if (count !== null && count >= room.max_players) {
      throw new Error(`La sala está llena (${count}/${room.max_players})`);
    }

    // Determinar el rol del jugador
    const isHost = room.created_by === user.id;
    const role = isHost ? 'host' : 'player';

    // Asignar equipo y color
    const { team_number, team_color } = await this.assignTeamAndColor(roomId, room.num_teams);

    // Agregar jugador a la sala
    const { data: playerData, error: playerError } = await this.supabase
      .from('room_players')
      .insert({
        room_id: roomId,
        user_id: user.id,
        player_name: playerName,
        role,
        team_number,
        team_color
      })
      .select()
      .single();

    if (playerError) {
      throw playerError;
    }

    return { room, player: playerData };
  }

  // Obtener todas las pruebas
  async getChallenges(): Promise<Challenge[]> {
    console.log('🔍 [getChallenges] Iniciando consulta a Supabase...');
    
    try {
      const { data, error } = await this.supabase
        .from('challenges')
        .select('*')
        .order('order', { ascending: true });
    
      console.log('📊 [getChallenges] Respuesta de Supabase:', { data, error });
      
      if (error) {
        console.error('❌ [getChallenges] Error en consulta:', error);
        throw error;
      }
      
      console.log('✅ [getChallenges] Datos obtenidos exitosamente:', data);
      console.log('📈 [getChallenges] Cantidad de registros:', data?.length || 0);
      
      return data || [];
    } catch (err) {
      console.error('💥 [getChallenges] Error capturado:', err);
      throw err;
    }
  }

  // Sembrar (recrear) la lista definitiva de challenges
  async seedChallenges(): Promise<void> {
    console.log('🌱 [seedChallenges] Preparando datos definitivos de pruebas...');

    const now = new Date().toISOString();
    // Lista definitiva
    const definitive = [
      {
        title: 'Guerra de globos',
        description: 'Compite por reventar los globos del equipo rival sin perder los tuyos.',
        order: 1,
        status: 'pending' as const,
        winner_team_id: null as string | null,
        image_url: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=800&h=600&fit=crop',
        duration: 180,
        difficulty: 'medium' as const,
        created_at: now
      },
      {
        title: 'Relevos',
        description: 'Carrera por equipos pasándose el testigo hasta completar el circuito.',
        order: 2,
        status: 'pending' as const,
        winner_team_id: null,
        image_url: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800&h=600&fit=crop',
        duration: 300,
        difficulty: 'medium' as const,
        created_at: now
      },
      {
        title: 'Pañuelo',
        description: 'Clásico juego de rapidez: corre a por el pañuelo y vuelve sin ser pillado.',
        order: 3,
        status: 'pending' as const,
        winner_team_id: null,
        image_url: 'https://images.unsplash.com/photo-1552234994-66ba234fd567?w=800&h=600&fit=crop',
        duration: 180,
        difficulty: 'easy' as const,
        created_at: now
      },
      {
        title: 'Cuerda',
        description: 'El equipo más fuerte gana tirando de la cuerda al rival.',
        order: 4,
        status: 'pending' as const,
        winner_team_id: null,
        image_url: 'https://images.unsplash.com/photo-1516534775068-ba3e7458af70?w=800&h=600&fit=crop',
        duration: 180,
        difficulty: 'hard' as const,
        created_at: now
      },
      {
        title: 'Beerpong',
        description: 'Lanza pelotas a los vasos del rival. ¡Acierta y suma puntos!',
        order: 5,
        status: 'pending' as const,
        winner_team_id: null,
        image_url: 'https://images.unsplash.com/photo-1531818235588-c00b4031dab9?w=800&h=600&fit=crop',
        duration: 420,
        difficulty: 'medium' as const,
        created_at: now
      },
      {
        title: 'Flip the cup',
        description: 'Bebe y voltea el vaso; el primer equipo en completar gana.',
        order: 6,
        status: 'pending' as const,
        winner_team_id: null,
        image_url: 'https://images.unsplash.com/photo-1516455590571-18256e5bb9ff?w=800&h=600&fit=crop',
        duration: 240,
        difficulty: 'easy' as const,
        created_at: now
      }
    ];

    try {
      // 1) Borrar todos los challenges existentes (cambios definitivos)
      const { data: existing, error: selErr } = await this.supabase
        .from('challenges')
        .select('id');

      if (selErr) {
        console.error('❌ [seedChallenges] Error seleccionando existentes:', selErr);
        throw selErr;
      }

      if (existing && existing.length > 0) {
        const ids = existing.map((x: any) => x.id);
        const { error: delErr } = await this.supabase
          .from('challenges')
          .delete()
          .in('id', ids);

        if (delErr) {
          console.error('❌ [seedChallenges] Error borrando existentes:', delErr);
          throw delErr;
        }
      }

      // 2) Insertar definitivos
      const { error: insErr } = await this.supabase
        .from('challenges')
        .insert(definitive);

      if (insErr) {
        console.error('❌ [seedChallenges] Error insertando definitivos:', insErr);
        throw insErr;
      }

      console.log('✅ [seedChallenges] Pruebas definitivas insertadas correctamente');
    } catch (e) {
      console.error('💥 [seedChallenges] Error general:', e);
      throw e;
    }
  }

  // Obtener una prueba específica
  async getChallenge(challengeId: string): Promise<Challenge> {
    const { data, error } = await this.supabase
      .from('challenges')
      .select('*')
      .eq('id', challengeId)
      .single();

    if (error) {
      throw error;
    }
    return data;
  }

  // Actualizar el estado de una prueba
  async updateChallengeStatus(challengeId: string, status: 'pending' | 'active' | 'completed', winnerTeamId?: string): Promise<Challenge> {
    console.log(`🔄 [updateChallengeStatus] Actualizando prueba ${challengeId} a estado: ${status}`);

    // Verificar que existe el challenge antes de actualizar
    const { data: existing, error: getErr } = await this.supabase
      .from('challenges')
      .select('id')
      .eq('id', challengeId)
      .maybeSingle();
  
    if (getErr) {
      console.error('❌ [updateChallengeStatus] Error al verificar existencia:', getErr);
      throw getErr;
    }
    if (!existing) {
      const e = new Error(`Challenge con id ${challengeId} no encontrado`);
      console.error('❌ [updateChallengeStatus]', e);
      throw e;
    }

    const updates: any = { status };
    if (winnerTeamId !== undefined) {
      updates.winner_team_id = winnerTeamId;
    }

    const { data, error } = await this.supabase
      .from('challenges')
      .update(updates)
      .eq('id', challengeId)
      .select(); // no .single(), tomamos la primera fila si existe
  
    if (error) {
      console.error('❌ [updateChallengeStatus] Error:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      const e = new Error(`No se actualizó ninguna fila para challengeId=${challengeId}`);
      console.error('❌ [updateChallengeStatus]', e);
      throw e;
    }

    console.log('✅ [updateChallengeStatus] Prueba actualizada:', data[0]);
    return data[0];
  }
}