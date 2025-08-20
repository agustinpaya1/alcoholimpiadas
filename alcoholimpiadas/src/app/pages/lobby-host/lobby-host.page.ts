import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { IonContent, IonButton, IonIcon, IonBadge, IonSpinner } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { SupabaseService, Room, RoomPlayer } from '../../services/supabase.service';
import { addIcons } from 'ionicons';
import { arrowBack, play, people, trophy } from 'ionicons/icons';

@Component({
  selector: 'app-lobby-host',
  templateUrl: './lobby-host.page.html',
  styleUrls: ['./lobby-host.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonButton,
    IonIcon,
    IonBadge,
    IonSpinner
  ]
})
export class LobbyHostPage implements OnInit, OnDestroy {
  room: Room | null = null;
  players: RoomPlayer[] = [];
  isLoading = true;
  isStarting = false;
  private subscription: any;
  
  // Agregar Math para usar en el template
  Math = Math;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private supabaseService: SupabaseService
  ) {
    addIcons({ arrowBack, play, people, trophy });
  }

  ngOnInit() {
    const roomId = this.route.snapshot.paramMap.get('roomId');
    if (roomId) {
      this.loadRoomData(roomId);
      this.subscribeToPlayers(roomId);
    }
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  async loadRoomData(roomId: string) {
    try {
      const players = await this.supabaseService.getRoomPlayers(roomId);
      this.players = players;
      
      // Obtener datos de la sala del primer jugador
      if (players.length > 0) {
        const { data: roomData } = await this.supabaseService.client
          .from('rooms')
          .select('*')
          .eq('id', roomId)
          .single();
        this.room = roomData;
      }
    } catch (error) {
      console.error('Error al cargar datos de la sala:', error);
      alert('Error al cargar la sala');
      this.router.navigate(['/game']);
    } finally {
      this.isLoading = false;
    }
  }

  subscribeToPlayers(roomId: string) {
    this.subscription = this.supabaseService.subscribeToRoomPlayers(
      roomId,
      (players) => {
        this.players = players;
        console.log('Jugadores actualizados:', players);
      }
    );
  }

  getTeamPlayers(teamNumber: number): RoomPlayer[] {
    return this.players.filter(p => p.team_number === teamNumber);
  }

  getTeamNumbers(): number[] {
    if (!this.room) return [];
    return Array.from({ length: this.room.num_teams }, (_, i) => i + 1);
  }

  canStartGame(): boolean {
    return this.players.length >= 2 && this.players.length <= (this.room?.max_players || 0);
  }

  async startGame() {
    if (!this.room || !this.canStartGame()) return;

    this.isStarting = true;
    try {
      await this.supabaseService.startGame(this.room.id);
      alert('¡Juego iniciado!');
      // Aquí redirigirías a la página del juego
      this.router.navigate(['/game-play', this.room.id]);
    } catch (error) {
      console.error('Error al iniciar juego:', error);
      alert('Error al iniciar el juego');
    } finally {
      this.isStarting = false;
    }
  }

  goBack() {
    this.router.navigate(['/game']);
  }
}