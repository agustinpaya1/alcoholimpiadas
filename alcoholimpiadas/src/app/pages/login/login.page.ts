import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { eye, eyeOff, arrowBack } from 'ionicons/icons';

import { AuthService } from 'src/app/services/auth.service';

interface FormErrors {
  [key: string]: string;
}

interface FormTouched {
  [key: string]: boolean;
}

@Component({
  selector: 'app-login',
  standalone: true, // 👈 clave
  imports: [CommonModule, FormsModule, IonicModule], // 👈 necesario para ion-*
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage {
  // Variables originales
  email = '';
  password = '';
  loading = false;
  error: string | null = null;
  
  // Nuevas variables para el diseño actualizado
  userData = {
    email: '',
    password: ''
  };
  errors: FormErrors = {};
  touched: FormTouched = {
    email: false,
    password: false
  };
  showPassword = false;
  rememberMe = false;
  animationState = 'aburrido'; // Estado inicial para la animación
  
  constructor(private authService: AuthService, private router: Router) {
    // Registrar los iconos necesarios
    addIcons({
      eye,
      eyeOff,
      arrowBack // Añadir el icono de flecha atrás
    });
  }

  // Método para actualizar el estado de la animación según la interacción
  updateAnimationState(state: string) {
    this.animationState = state;
  }

  // Método para validar los campos
  validate() {
    const errors: FormErrors = {};
    
    // Validación de email
    if (!this.userData.email) {
      errors['email'] = 'El email es obligatorio';
    } else if (!/^\S+@\S+\.\S+$/.test(this.userData.email)) {
      errors['email'] = 'El email no es válido';
    }
    
    // Validación de contraseña
    if (!this.userData.password) {
      errors['password'] = 'La contraseña es obligatoria';
    } else if (this.userData.password.length < 6) {
      errors['password'] = 'La contraseña debe tener al menos 6 caracteres';
    }
    
    this.errors = errors;
    return Object.keys(errors).length === 0;
  }

  // Método para manejar cambios en los inputs
  handleInputChange() {
    // Actualizar el estado de la animación
    this.updateAnimationState('copiando');
    
    // Validar los campos
    this.validate();
    
    // Actualizar las variables originales para mantener compatibilidad
    this.email = this.userData.email;
    this.password = this.userData.password;
  }

  // Método para manejar el evento blur de los inputs
  handleBlur(field: string) {
    this.touched[field] = true;
    this.updateAnimationState('aburrido');
  }

  // Método para alternar la visibilidad de la contraseña
  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
    this.updateAnimationState('apurado');
    setTimeout(() => {
      this.updateAnimationState('aburrido');
    }, 1000);
  }

  async goToRegister() {
    this.router.navigateByUrl('/register');
  }
  
  async login() {
    // Validar antes de intentar iniciar sesión
    if (!this.validate()) {
      // Marcar todos los campos como tocados para mostrar errores
      Object.keys(this.touched).forEach(key => {
        this.touched[key] = true;
      });
      return;
    }
    
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