import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { IonContent, IonButton, IonIcon, IonBadge, IonSpinner } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { SupabaseService, Room, RoomPlayer } from '../../services/supabase.service';
import { addIcons } from 'ionicons';
import { arrowBack, trophy, people } from 'ionicons/icons';

@Component({
  selector: 'app-game-play',
  templateUrl: './game-play.page.html',
  styleUrls: ['./game-play.page.scss'],
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
export class GamePlayPage implements OnInit, OnDestroy {
  room: Room | null = null;
  players: RoomPlayer[] = [];
  isLoading = true;
  currentRound = 1;
  private subscription: any;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private supabaseService: SupabaseService
  ) {
    addIcons({ arrowBack, trophy, people });
  }

  ngOnInit() {
    const roomId = this.route.snapshot.paramMap.get('roomId');
    if (roomId) {
      this.loadGameData(roomId);
      this.subscribeToPlayers(roomId);
    }
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  async loadGameData(roomId: string) {
    try {
      const { data: roomData, error: roomError } = await this.supabaseService.client
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single();
    
      if (roomError) {
        throw roomError;
      }
    
      this.room = roomData;
      const players = await this.supabaseService.getRoomPlayers(roomId);
      this.players = players;
      
    } catch (error) {
      console.error('Error al cargar datos del juego:', error);
      alert('Error al cargar el juego');
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

  endGame() {
    // Lógica para terminar el juego
    this.router.navigate(['/game']);
  }

  goBack() {
    this.router.navigate(['/lobby-host', this.room?.id]);
  }
}