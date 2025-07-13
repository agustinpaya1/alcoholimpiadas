import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  imports: [IonicModule, CommonModule, FormsModule],
  styleUrls: ['./register.page.scss'],
})
export class RegisterPage {
  email = '';
  password = '';
  loading = false;
  error: string | null = null;

  constructor(private authService: AuthService, private router: Router) {}

  async register() {
    this.loading = true;
    this.error = null;

    try {
      await this.authService.signUp(this.email, this.password);
      // Ya se inserta automáticamente en la tabla users gracias al trigger
      this.router.navigateByUrl('/game', { replaceUrl: true });
    } catch (err: any) {
      this.error = err.message;
    } finally {
      this.loading = false;
    }
  }
}