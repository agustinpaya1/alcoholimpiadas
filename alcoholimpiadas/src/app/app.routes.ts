import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage)
  },
  {
    path: 'admin-panel',
    loadComponent: () => import('./pages/admin-panel/admin-panel.page').then( m => m.AdminPanelPage)
  },
  {
    path: 'game',
    loadComponent: () => import('./pages/game/game.page').then( m => m.GamePage)
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register.page').then(m => m.RegisterPage)
  },
  {
    path: 'create-room',
    loadComponent: () => import('./pages/create-room/create-room.page').then(m => m.CreateRoomPage)
  },
  {
    path: 'join-room',
    loadComponent: () => import('./pages/join-room/join-room.page').then(m => m.JoinRoomPage)
  },
  {
    path: 'lobby-host/:roomId',
    loadComponent: () => import('./pages/lobby-host/lobby-host.page').then(m => m.LobbyHostPage)
  },
  {
    path: 'lobby-player/:roomId',
    loadComponent: () => import('./pages/lobby-player/lobby-player.page').then(m => m.LobbyPlayerPage)
  }
];
