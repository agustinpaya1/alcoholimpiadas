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
  myRooms: Room[] = []; // Salas donde soy anfitrión
  availableRooms: Room[] = []; // Salas disponibles
  filteredMyRooms: Room[] = [];
  filteredAvailableRooms: Room[] = [];
  searchTerm: string = '';
  isLoading = false;
  savedNickname: string = '';

  constructor(
    private router: Router,
    private supabaseService: SupabaseService
  ) {}

  ngOnInit() {
    this.loadSavedNickname();
    this.loadRooms();
  }

  goBack() {
    this.router.navigate(['/game']);
  }

  loadSavedNickname() {
    this.savedNickname = localStorage.getItem('playerNickname') || '';
  }

  saveNickname(nickname: string) {
    localStorage.setItem('playerNickname', nickname);
    this.savedNickname = nickname;
  }

  async loadRooms() {
    this.isLoading = true;
    try {
      const allRooms = await this.supabaseService.getAvailableRooms();
      const user = await this.supabaseService.getCurrentUser();
      
      if (user) {
        // Separar salas propias de las disponibles
        this.myRooms = allRooms.filter(room => room.created_by === user.id);
        this.availableRooms = allRooms.filter(room => room.created_by !== user.id);
      } else {
        this.myRooms = [];
        this.availableRooms = allRooms;
      }
      
      this.applySearch();
      
      // Forzar actualización de la vista
      setTimeout(() => {
        this.isLoading = false;
      }, 100);
    } catch (error) {
      console.error('Error al cargar salas:', error);
      this.isLoading = false;
    }
  }

  onSearchChange(event: any) {
    this.searchTerm = event.target.value.toLowerCase();
    this.applySearch();
  }

  applySearch() {
    if (!this.searchTerm) {
      this.filteredMyRooms = [...this.myRooms];
      this.filteredAvailableRooms = [...this.availableRooms];
    } else {
      this.filteredMyRooms = this.myRooms.filter(room => 
        room.name.toLowerCase().includes(this.searchTerm)
      );
      this.filteredAvailableRooms = this.availableRooms.filter(room => 
        room.name.toLowerCase().includes(this.searchTerm)
      );
    }
  }

  doRefresh(event: any) {
    this.loadRooms().then(() => {
      event.target.complete();
    });
  }

  async joinRoom(roomId: string) {
    // Usar nickname guardado o pedir uno nuevo
    let playerName = this.savedNickname;
    
    if (!playerName) {
      const inputName = prompt('Introduce tu nombre:');
      if (!inputName?.trim()) {
        alert('Necesitas introducir un nombre');
        return;
      }
      playerName = inputName.trim();
      this.saveNickname(playerName);
    } else {
      // Preguntar si quiere usar el nickname guardado
      const useStored = confirm(`¿Quieres usar tu nickname guardado "${playerName}"?`);
      if (!useStored) {
        const inputName = prompt('Introduce tu nombre:');
        if (!inputName?.trim()) {
          alert('Necesitas introducir un nombre');
          return;
        }
        playerName = inputName.trim();
        this.saveNickname(playerName);
      }
    }
  
    try {
      const { room, player } = await this.supabaseService.joinRoom(roomId, playerName);
      console.log('Uniéndose a la sala:', room);
      
      alert(`Te has unido a la sala "${room.name}"`);
      
      // Redirigir según el rol del jugador
      if (player.role === 'host') {
        this.router.navigate(['/lobby-host', roomId]);
      } else {
        this.router.navigate(['/lobby-player', roomId]);
      }
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