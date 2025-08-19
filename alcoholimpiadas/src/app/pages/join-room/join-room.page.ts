import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonRefresher, IonRefresherContent, IonSpinner, IonList, IonItem, IonIcon, IonButton, IonInput } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService, Room } from '../../services/supabase.service';

@Component({
  selector: 'app-join-room',
  templateUrl: './join-room.page.html',
  styleUrls: ['./join-room.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonRefresher,
    IonRefresherContent,
    IonSpinner,
    IonList,
    IonItem,
    IonIcon,
    IonButton,
    IonInput
  ]
})
export class JoinRoomPage implements OnInit {
  rooms: Room[] = [];
  filteredRooms: Room[] = [];
  searchTerm: string = '';
  isLoading = false;

  constructor(
    private router: Router,
    private supabaseService: SupabaseService
  ) {}

  ngOnInit() {
    this.loadRooms();
  }

  goBack() {
    this.router.navigate(['/game']);
  }
  async loadRooms() {
    this.isLoading = true;
    try {
      const rooms = await this.supabaseService.getAvailableRooms();
      this.rooms = rooms;
      this.filteredRooms = [...rooms];
    } catch (error) {
      console.error('Error al cargar las salas:', error);
      alert('Error al cargar las salas. Por favor, inténtalo de nuevo.');
    } finally {
      this.isLoading = false;
    }
  }

  onSearchChange(event: any) {
    const searchTerm = event.target.value?.toLowerCase() || '';
    if (searchTerm.trim() === '') {
      this.filteredRooms = [...this.rooms];
    } else {
      this.filteredRooms = this.rooms.filter(room => 
        room.name.toLowerCase().includes(searchTerm)
      );
    }
  }

  doRefresh(event: any) {
    this.loadRooms().then(() => {
      event.target.complete();
    });
  }

  async joinRoom(roomId: string) {
    // Pedir nombre del jugador
    const playerName = prompt('Introduce tu nombre:');
    if (!playerName?.trim()) {
      alert('Necesitas introducir un nombre');
      return;
    }

    try {
      const { room, player } = await this.supabaseService.joinRoom(roomId, playerName.trim());
      console.log('Uniéndose a la sala:', room);
      
      alert(`Te has unido a la sala "${room.name}"`);
      
      // Redirigir al lobby del jugador
      this.router.navigate(['/lobby-player', roomId]);
    } catch (error: any) {
      console.error('Error al unirse a la sala:', error);
      alert(error.message || 'Error al unirse a la sala. Por favor, inténtalo de nuevo.');
    }
  }

  getStatusText(status: string | undefined): string {
    switch (status) {
      case 'waiting': return 'Esperando jugadores';
      case 'playing': return 'En juego';
      case 'finished': return 'Finalizada';
      default: return 'Desconocido';
    }
  }
}