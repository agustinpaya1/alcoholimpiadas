import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { NgForm } from '@angular/forms';
import { IonContent, IonItem, IonLabel, IonInput, IonSelect, IonSelectOption, IonButton, IonIcon } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService, NewRoom } from '../../services/supabase.service';
import { addIcons } from 'ionicons';
import { arrowBack } from 'ionicons/icons';

@Component({
  selector: 'app-create-room',
  templateUrl: './create-room.page.html',
  styleUrls: ['./create-room.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonItem,
    IonLabel,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonButton,
    IonIcon
  ]
})
export class CreateRoomPage {
  room: NewRoom = {
    name: '',
    max_players: 50,
    num_teams: 2,
    status: 'waiting'
  };

  isCreating = false;

  constructor(
    private router: Router,
    private supabaseService: SupabaseService
  ) {
    addIcons({ arrowBack });
  }

  goBack() {
    this.router.navigate(['/game']);
  }

  async onSubmit() {
    if (!this.room.name.trim()) {
      alert('Por favor, introduce un nombre para la sala');
      return;
    }

    // Pedir nombre del jugador
    const playerName = prompt('Introduce tu nombre:');
    if (!playerName?.trim()) {
      alert('Necesitas introducir un nombre');
      return;
    }

    this.isCreating = true;

    try {
      console.log('Datos a enviar:', this.room);
      
      const { room, player } = await this.supabaseService.createRoom({
        name: this.room.name.trim(),
        max_players: this.room.max_players,
        num_teams: this.room.num_teams,
        status: 'waiting'
      }, playerName.trim());

      console.log('Sala creada:', room);
      alert(`¡Sala "${room.name}" creada exitosamente!`);
      
      // Redirigir al lobby del anfitrión
      this.router.navigate(['/lobby-host', room.id]);
    } catch (error: any) {
      console.error('Error completo:', error);
      
      let errorMessage = 'Error al crear la sala. ';
      
      if (error?.message) {
        errorMessage += error.message;
      } else if (error?.error_description) {
        errorMessage += error.error_description;
      } else {
        errorMessage += 'Por favor, inténtalo de nuevo.';
      }
      
      alert(errorMessage);
    } finally {
      this.isCreating = false;
    }
  }
}