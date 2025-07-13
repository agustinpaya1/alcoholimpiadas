import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true, // 👈 clave
  imports: [CommonModule, FormsModule, IonicModule], // 👈 necesario para ion-*
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage {
  email = '';
  password = '';
  loading = false;
  error: string | null = null;
  
  constructor(private authService: AuthService, private router: Router) {}

  async goToRegister() {
    this.router.navigateByUrl('/register');
  }
  async login() {
    this.loading = true;
    this.error = null;

    try {
      await this.authService.signIn(this.email, this.password);
      const profile = await this.authService.getUserProfile();
      console.log('Perfil:', profile);

      if (profile?.role === 'admin') {
        this.router.navigateByUrl('/admin-panel', { replaceUrl: true });
      } else {
        this.router.navigateByUrl('/game', { replaceUrl: true });
      }
    } catch (err: any) {
      this.error = err.message;
    } finally {
      this.loading = false;
    }
  }
}