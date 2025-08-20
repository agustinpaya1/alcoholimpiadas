import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonButton, IonIcon } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';
import { arrowBack, trophy, wine, beer, dice } from 'ionicons/icons';

interface Prueba {
  id: number;
  nombre: string;
  descripcion: string;
  icono: string;
  color: string;
}

@Component({
  selector: 'app-pruebas',
  templateUrl: './pruebas.page.html',
  styleUrls: ['./pruebas.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonButton,
    IonIcon
  ]
})
export class PruebasPage implements OnInit {
  pruebas: Prueba[] = [
    {
      id: 1,
      nombre: 'Nunca Nunca',
      descripcion: 'El clásico juego de confesiones',
      icono: 'wine',
      color: '#e74c3c'
    },
    {
      id: 2,
      nombre: 'Verdad o Reto',
      descripcion: 'Elige tu destino: verdad o atrevimiento',
      icono: 'dice',
      color: '#3498db'
    },
    {
      id: 3,
      nombre: 'Pico Pala Pico',
      descripcion: 'Juego de rapidez y concentración',
      icono: 'trophy',
      color: '#f39c12'
    },
    {
      id: 4,
      nombre: 'Rey de Copas',
      descripcion: 'El juego de cartas más divertido',
      icono: 'beer',
      color: '#9b59b6'
    },
    {
      id: 5,
      nombre: 'Mímica Loca',
      descripcion: 'Actúa sin palabras',
      icono: 'trophy',
      color: '#2ecc71'
    },
    {
      id: 6,
      nombre: 'Preguntas Picantes',
      descripcion: 'Las preguntas más comprometedoras',
      icono: 'wine',
      color: '#e67e22'
    }
  ];

  constructor(private router: Router) {
    addIcons({ arrowBack, trophy, wine, beer, dice });
  }

  ngOnInit() {
    // Inicialización si es necesaria
  }

  goBack() {
    this.router.navigate(['/game']);
  }

  onPruebaSelected(prueba: Prueba) {
    console.log('Prueba seleccionada:', prueba);
    // Aquí se implementará la lógica para iniciar la prueba específica
    // Por ahora solo mostramos un alert
    alert(`¡Has seleccionado: ${prueba.nombre}!`);
  }
}