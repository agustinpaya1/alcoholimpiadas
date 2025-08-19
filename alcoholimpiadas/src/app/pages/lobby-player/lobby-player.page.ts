import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { IonContent, IonButton, IonIcon, IonList, IonItem, IonLabel, IonBadge, IonSpinner } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { SupabaseService, Room, RoomPlayer } from '../../services/supabase.service';
import { addIcons } from 'ionicons';
import { arrowBack, people, trophy, exitOutline } from 'ionicons/icons';

@Component({
  selector: 'app-lobby-player',
  templateUrl: './lobby-player.page.html',
  styleUrls: ['./lobby-player.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonButton,
    IonIcon,
    IonList,
    IonItem,
    IonLabel,
    IonBadge,
    IonSpinner
  ]
})
export class LobbyPlayerPage implements OnInit, OnDestroy {
  room: Room | null = null;
  players: RoomPlayer[] = [];
  currentPlayer: RoomPlayer | null = null;
  isLoading = true;
  private subscription: any;
  
  // Agregar Math para usar en el template
  Math = Math;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private supabaseService: SupabaseService
  ) {
    addIcons({ arrowBack, people, trophy, exitOutline });
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
      
      // Encontrar el jugador actual
      const user = await this.supabaseService.getCurrentUser();
      this.currentPlayer = players.find(p => p.user_id === user?.id) || null;
      
      // Obtener datos de la sala
      if (players.length > 0) {
        const { data: roomData } = await this.supabaseService.client
          .from('rooms')
          .select('*')
          .eq('id', roomId)
          .single();
        this.room = roomData;
        
        // Si el juego ya empezó, redirigir
        if (roomData?.status === 'playing') {
          this.router.navigate(['/game-play', roomId]);
        }
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
        // Actualizar jugador actual
        const user = this.supabaseService.getCurrentUser();
        user.then(u => {
          this.currentPlayer = players.find(p => p.user_id === u?.id) || null;
        });
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

  getHost(): RoomPlayer | null {
    return this.players.find(p => p.role === 'host') || null;
  }

  async leaveRoom() {
    if (!this.room) return;
    
    try {
      await this.supabaseService.leaveRoom(this.room.id);
      this.router.navigate(['/game']);
    } catch (error) {
      console.error('Error al salir de la sala:', error);
      alert('Error al salir de la sala');
    }
  }

  goBack() {
    this.leaveRoom();
  }
}