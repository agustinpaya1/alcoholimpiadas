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
    max_players: 8,   // Valor por defecto razonable
    num_teams: 2,     // Valor por defecto para equipos
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

    // Validaciones nuevas para número exacto de jugadores
    const maxPlayers = Number(this.room.max_players);
    const numTeams = Number(this.room.num_teams);

    if (!Number.isInteger(maxPlayers) || maxPlayers < 2) {
      alert('Introduce un número válido de jugadores (mínimo 2).');
      return;
    }
    if (!Number.isInteger(numTeams) || numTeams < 1) {
      alert('Selecciona un número de equipos válido.');
      return;
    }
    if (numTeams > maxPlayers) {
      alert('El número de equipos no puede ser mayor que el número de jugadores.');
      return;
    }

    // Nota: el reparto en equipos se equilibra automáticamente al unirse los jugadores
    // ya que assignTeamAndColor elige siempre el equipo con menos jugadores.

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