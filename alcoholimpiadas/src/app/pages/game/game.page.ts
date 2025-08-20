import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { AdminPanelPage } from "../admin-panel/admin-panel.page";

interface FloatingElement {
  x: number;
  y: number;
  delay: number;
}

@Component({
  selector: 'app-game',
  templateUrl: './game.page.html',
  styleUrls: ['./game.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent]
})
export class GamePage implements OnInit, OnDestroy {
  floatingElements: FloatingElement[] = [];
  private animationInterval?: any;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.initFloatingElements();
    this.startFloatingAnimation();
  }

  ngOnDestroy(): void {
    if (this.animationInterval) {
      clearInterval(this.animationInterval);
    }
  }

  /**
   * Inicializa los elementos flotantes del fondo
   */
  private initFloatingElements(): void {
    this.floatingElements = Array.from({ length: 5 }, (_, index) => ({
      x: Math.random() * window.innerWidth,
      y: window.innerHeight + 100,
      delay: Math.random() * 3
    }));
  }

  /**
   * Inicia la animación continua de elementos flotantes
   */
  private startFloatingAnimation(): void {
    this.animationInterval = setInterval(() => {
      this.floatingElements = this.floatingElements.map(element => ({
        ...element,
        x: Math.random() * window.innerWidth,
        y: window.innerHeight + 100,
        delay: Math.random() * 3
      }));
    }, 6000);
  }

  /**
   * Maneja el clic en CREAR SALA
   */
  onCreateRoom(): void {
    this.router.navigate(['/create-room']);
  }

  /**
   * Maneja el clic en UNIR SALA
   */
  onJoinRoom(): void {
    this.router.navigate(['/join-room']);
  }
}