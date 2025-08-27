import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { IonContent, IonButton, IonIcon, IonBadge, IonSpinner, IonModal, IonHeader, IonToolbar, IonTitle, IonButtons } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { SupabaseService, Room, RoomPlayer, Challenge } from '../../services/supabase.service';
import { addIcons } from 'ionicons';
import { 
  arrowBack, trophy, people, play, pause, stop, time, timeOutline, 
  checkmarkCircle, playCircle, lockClosed, star, informationCircle, 
  close, chevronBack, chevronForward, radioButtonOn 
} from 'ionicons/icons';
import { AlertController } from '@ionic/angular';

// Interfaz para los pasos de instrucciones
interface InstructionStep {
  title: string;
  description: string;
  icon: string;
  image?: string;
}

@Component({
  selector: 'app-game-play',
  templateUrl: './game-play.page.html',
  styleUrls: ['./game-play.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonButton,
    IonIcon,
    IonBadge,
    IonSpinner,
    IonModal,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons
  ]
})
export class GamePlayPage implements OnInit, OnDestroy {
  room: Room | null = null;
  players: RoomPlayer[] = [];
  challenges: Challenge[] = [];
  currentChallenge: Challenge | null = null;
  isLoading = true;
  currentRound = 1;
  isHost = false;
  challengeInProgress = false;
  timeLeft = 0;
  timer: any;
  private subscription: any;
  private user: any = null;

  // Variables para el modal de instrucciones
  showInstructionsModal = false;
  selectedChallenge: Challenge | null = null;
  instructionSteps: InstructionStep[] = [];
  currentInstructionStep = 0;

  // Array para trackear pruebas completadas
  completedChallenges: string[] = [];

  // Ganadores locales por challenge (team_number)
  private localWinners: Record<string, number> = {};
  // Colores para los equipos
  teamColors: string[] = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA726', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];

  // Evita duplicados al seleccionar ganador
  updatingWinner = false;

  // Devuelve un UUID válido para winner_team_id usando el id de un jugador del equipo
  private getWinnerTeamIdForDB(teamNumber: number): string | undefined {
    const player = this.players.find(p => p.team_number === teamNumber);
    return player?.id; // room_players.id (UUID)
  }

  // Podio y resultados (DEBEN estar dentro de la clase)
  showPodium = false;
  podiumResults: { teamNumber: number, wins: number, color: string }[] = [];
  winningTeamNumber: number | null = null;
  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private supabaseService: SupabaseService,
    private alertCtrl: AlertController
  ) {
    addIcons({ 
      arrowBack, trophy, people, play, pause, stop, time, timeOutline, 
      checkmarkCircle, playCircle, lockClosed, star, informationCircle,
      close, chevronBack, chevronForward, radioButtonOn
    });
  }

  async ngOnInit() {
    // Obtener usuario actual
    this.user = await this.supabaseService.getCurrentUser();
    
    const roomId = this.route.snapshot.paramMap.get('roomId');
    if (roomId) {
      this.loadGameData(roomId);
      this.subscribeToPlayers(roomId);
    }
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  async loadGameData(roomId: string) {
    console.log('🎮 [loadGameData] Iniciando carga de datos del juego para roomId:', roomId);
    
    try {
      // Comentar temporalmente esta línea hasta que esté implementado correctamente
      // await this.resetChallengesForNewGame();
      
      console.log('📡 [loadGameData] Cargando datos de la sala...');
      
      // Cargar datos de la sala
      const { data: roomData, error: roomError } = await this.supabaseService.client
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single();
    
      console.log('🏠 [loadGameData] Respuesta de sala:', { roomData, roomError });
    
      if (roomError) {
        console.error('❌ [loadGameData] Error al cargar sala:', roomError);
        throw roomError;
      }
    
      this.room = roomData;
      console.log('✅ [loadGameData] Sala asignada:', this.room);
      
      console.log('👥 [loadGameData] Cargando jugadores...');
      // Cargar jugadores
      const players = await this.supabaseService.getRoomPlayers(roomId);
      this.players = players;
      console.log('👥 [loadGameData] Jugadores cargados:', this.players);
      
      // Verificar si el usuario actual es el anfitrión
      this.isHost = players.some(p => p.role === 'host' && p.user_id === this.user?.id);
      console.log('👑 [loadGameData] Es anfitrión:', this.isHost);
      
      console.log('🎯 [loadGameData] Iniciando carga de pruebas...');
      // Cargar pruebas
      await this.loadChallenges(roomId);
      console.log('🎯 [loadGameData] Pruebas cargadas completamente');
      
    } catch (error) {
      console.error('💥 [loadGameData] Error al cargar datos del juego:', error);
      alert('Error al cargar el juego');
      this.router.navigate(['/game']);
    } finally {
      console.log('🏁 [loadGameData] Finalizando carga, estableciendo isLoading = false');
      this.isLoading = false;
    }
  }

  async loadChallenges(roomId: string) {
    try {
      console.log('🔍 Iniciando carga de pruebas...');
      
      // Cargar todas las pruebas disponibles
      const challenges = await this.supabaseService.getChallenges();
      console.log('📋 Pruebas obtenidas de Supabase:', challenges);
      console.log('📊 Número de pruebas cargadas:', challenges.length);
      
      this.challenges = challenges;
  
      // Si la sala es nueva (waiting), ignoramos estado de servidor y arrancamos desde cero
      if (this.room?.status === 'waiting') {
        this.completedChallenges = [];
        this.localWinners = {};
        this.challenges = this.challenges.map(c => ({
          ...c,
          status: 'pending',
          winner_team_id: null
        }));
      }
  
      // Seleccionar la primera prueba como actual si está desbloqueada
      if (this.challenges.length > 0 && this.isChallengeUnlocked(0)) {
        this.currentChallenge = this.challenges[0];
        console.log('🎯 Prueba actual seleccionada:', this.currentChallenge);
      } else {
        console.log('⚠️ No hay pruebas disponibles o la primera está bloqueada');
      }
    } catch (error) {
      console.error('❌ Error al cargar pruebas:', error);
    }
  }

  subscribeToPlayers(roomId: string) {
    this.subscription = this.supabaseService.subscribeToRoomPlayers(
      roomId,
      (players) => {
        this.players = players;
        // Re-verificar si el usuario es el anfitrión
        this.isHost = players.some(p => p.role === 'host' && p.user_id === this.user?.id);
      }
    );
  }

  getTeamPlayers(teamNumber: number): RoomPlayer[] {
    return this.players.filter(p => p.team_number === teamNumber);
  }

  getTeamNumbers(): number[] {
    if (!this.room) return [];
    return Array.from({ length: this.room.num_teams }, (_, i) => i + 1);
  }

  getPlayerColor(player: RoomPlayer): string {
    if (player.team_color) {
      return player.team_color;
    }
    const teamIndex = player.team_number ? player.team_number - 1 : 0;
    return this.teamColors[teamIndex] || '#007bff';
  }

  // Lógica de desbloqueo progresivo
  isChallengeUnlocked(index: number): boolean {
    console.log(`🔓 Verificando si la prueba ${index} está desbloqueada`);
    console.log(`📝 Pruebas completadas:`, this.completedChallenges);
    
    // La primera prueba siempre está desbloqueada
    if (index === 0) {
      console.log('✅ Primera prueba - siempre desbloqueada');
      return true;
    }
    
    // Las demás pruebas requieren que la anterior esté completada
    const previousChallengeId = this.challenges[index - 1]?.id;
    const isUnlocked = this.isChallengeCompleted(previousChallengeId);
    console.log(`🔍 Prueba anterior (${previousChallengeId}) completada:`, isUnlocked);
    
    return isUnlocked;
  }

  isChallengeCompleted(challengeId: string): boolean {
    // Solo estado local para evitar heredar estados de otras sesiones
    if (!challengeId) return false;
    return this.completedChallenges.includes(challengeId);
  }

  getCompletedChallengesCount(): number {
    // Solo contamos las completadas localmente en esta sesión/sala
    return this.completedChallenges.length;
  }

  isNextAvailable(index: number): boolean {
    if (!this.challenges || !this.challenges[index]) return false;
    const challenge = this.challenges[index];
    // Es la siguiente disponible si está desbloqueada, no está completada
    // y (si no es la primera) la anterior ya está completada
    const unlocked = this.isChallengeUnlocked(index);
    const notCompleted = !this.isChallengeCompleted(challenge.id);
    const previousCompleted = index === 0 ? true : this.isChallengeCompleted(this.challenges[index - 1]?.id);
    return unlocked && notCompleted && previousCompleted;
  }

  selectChallenge(challenge: Challenge, index: number) {
    if (!this.isChallengeUnlocked(index)) {
      console.log('🔒 Prueba bloqueada, no se puede seleccionar');
      return;
    }
    this.currentChallenge = challenge;
    console.log('🎯 Prueba seleccionada:', this.currentChallenge);
  }

  openChallengeInstructions(challenge: Challenge, event?: Event) {
    event?.stopPropagation?.();
    this.selectedChallenge = challenge;
    this.currentInstructionStep = 0;
    this.generateInstructionSteps(challenge);
    this.showInstructionsModal = true;
  }

  closeInstructionsModal() {
    this.showInstructionsModal = false;
    this.selectedChallenge = null;
    this.instructionSteps = [];
    this.currentInstructionStep = 0;
  }

  nextInstruction() {
    if (this.currentInstructionStep < this.instructionSteps.length - 1) {
      this.currentInstructionStep++;
    }
  }

  previousInstruction() {
    if (this.currentInstructionStep > 0) {
      this.currentInstructionStep--;
    }
  }

  startChallengeFromModal() {
    this.closeInstructionsModal();
    this.startChallenge();
  }

  generateInstructionSteps(challenge: Challenge) {
    const durationText = this.formatDuration(challenge.duration || 120);
    const difficultyText = this.getDifficultyText(challenge.difficulty || 'medium');
    this.instructionSteps = [
      {
        title: `Bienvenidos a "${challenge.title}"`,
        description: challenge.description || 'Prepárate para la siguiente prueba.',
        icon: 'information-circle'
      },
      {
        title: 'Objetivo',
        description: 'Compite para conseguir la mayor puntuación y ganar la ronda.',
        icon: 'trophy'
      },
      {
        title: 'Duración',
        description: `Esta prueba dura ${durationText}. ¡Aprovecha bien el tiempo!`,
        icon: 'time-outline'
      },
      {
        title: 'Dificultad',
        description: `Nivel de dificultad: ${difficultyText}.`,
        icon: 'star'
      },
      {
        title: 'Listos',
        description: 'Cuando estéis listos, empezad la prueba.',
        icon: 'play'
      }
    ];
  }
  // === FIN DE AÑADIDOS PARA ARREGLAR LOS ERRORES DEL TEMPLATE ===

  async endGame() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    // Muestra el podio con el estado actual
    this.computePodium();
    this.showPodium = true;

    console.log('Juego terminado');
    // No navegamos aquí para permitir ver el podio; se navega en closePodium()
    // this.router.navigate(['/game']);
  }

  goBack() {
    this.router.navigate(['/lobby-host', this.room?.id]);
  }

  // Mover este método AQUÍ, dentro de la clase
  async resetChallengesForNewGame() {
    console.log('🔄 [resetChallengesForNewGame] Reseteando estado de pruebas...');
    
    try {
      if (!this.room?.id) {
        console.log('❌ No hay room ID disponible para resetear pruebas');
        return;
      }
  
      // Resetear todas las pruebas de esta sala a estado 'pending'
      const { error } = await this.supabaseService.client
        .from('challenges')
        .update({ 
          status: 'pending', 
          winner_team_id: null 
        })
        .eq('room_id', this.room.id);
  
      if (error) {
        console.error('❌ Error al resetear pruebas:', error);
        throw error;
      }
  
      console.log('✅ Pruebas reseteadas correctamente');
    } catch (error: any) {
      console.error('💥 Error en resetChallengesForNewGame:', error);
      // No lanzar el error para no bloquear la carga del juego
    }
  }
  
   // <- Este es el cierre de la clase GamePlayPage
  /*
  // Podio y resultados
  showPodium = false;
  podiumResults: { teamNumber: number, wins: number, color: string }[] = [];
  winningTeamNumber: number | null = null;*/

  // Comprueba si todas las pruebas están completadas y, si es así, prepara y muestra el podio
  private updatePodiumIfFinished() {
    if (this.challenges.length > 0 && this.getCompletedChallengesCount() === this.challenges.length) {
      this.computePodium();
      this.showPodium = true;
    }
  }

  // Calcula victorias por equipo a partir de winner_team_id (room_players.id -> team_number)
  private computePodium() {
    const winsByTeam: Record<number, number> = {};
    const playersById = new Map(this.players.map(p => [p.id, p] as const));
    const teamNumbers = this.getTeamNumbers();
  
    // Inicializamos a 0
    teamNumbers.forEach(t => winsByTeam[t] = 0);
  
    // Sumamos victorias: primero locales; si no hay local, usamos DB
    this.challenges
      .filter(c => this.isChallengeCompleted(c.id)) // solo las completadas localmente
      .forEach(c => {
        let teamNum: number | undefined;
  
        if (this.localWinners[c.id] !== undefined) {
          teamNum = this.localWinners[c.id];
        } else if (c.winner_team_id) {
          const winnerPlayer = playersById.get(c.winner_team_id);
          teamNum = winnerPlayer?.team_number;
        }
  
        if (teamNum) {
          winsByTeam[teamNum] = (winsByTeam[teamNum] || 0) + 1;
        }
      });
  
    const sorted = Object.entries(winsByTeam)
      .map(([teamNumber, wins]) => ({
        teamNumber: Number(teamNumber),
        wins: Number(wins),
        color: this.getTeamPlayers(Number(teamNumber))[0]?.team_color
          || this.teamColors[(Number(teamNumber) - 1) % this.teamColors.length]
      }))
      .sort((a, b) => b.wins - a.wins);
  
    this.podiumResults = sorted.slice(0, 3);
    this.winningTeamNumber = sorted[0]?.teamNumber ?? null;
  }

  closePodium() {
    this.showPodium = false;
    this.router.navigate(['/game']);
  }


  async selectWinner(teamNumber: number) {
    const winnerTeamId = this.getWinnerTeamIdForDB(teamNumber);
    const prevChallengeId = this.currentChallenge?.id;
    if (!prevChallengeId) {
      // No hay challenge actual; salir sin modificar estado
      return;
    }
    try {
      // Registrar localmente
      if (!this.completedChallenges.includes(prevChallengeId)) {
        this.completedChallenges.push(prevChallengeId);
      }
      const idx = this.challenges.findIndex(c => c.id === prevChallengeId);
      if (idx >= 0) {
        this.challenges[idx] = { 
          ...this.challenges[idx], 
          status: 'completed',
          // ponemos también el ganador localmente para el podio
          winner_team_id: winnerTeamId ?? null 
        };
      }
      // ganadores locales por challenge
      this.localWinners[prevChallengeId] = teamNumber;

      await this.endChallenge();
    } catch (error: any) {
      // Degradación
      // Registrar localmente también en degradación
      if (!this.completedChallenges.includes(prevChallengeId)) {
        this.completedChallenges.push(prevChallengeId);
      }
      const idx = this.challenges.findIndex(c => c.id === prevChallengeId);
      if (idx >= 0) {
        this.challenges[idx] = { 
          ...this.challenges[idx], 
          status: 'completed',
          winner_team_id: winnerTeamId ?? null
        };
      }
      this.localWinners[prevChallengeId] = teamNumber;

      await this.endChallenge();
    } finally {
      this.updatePodiumIfFinished();
      this.updatingWinner = false;
    }
  }

  startChallenge() {
    if (!this.isHost || !this.currentChallenge || this.challengeInProgress) {
      return;
    }

    // Resetear cualquier timer previo
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    // Duración por defecto: 120s
    this.timeLeft = this.currentChallenge.duration ?? 120;
    this.challengeInProgress = true;

    // Arrancar temporizador
    this.timer = setInterval(() => {
      if (this.timeLeft > 0) {
        this.timeLeft--;
      } else {
        // Auto-finalizar cuando llegue a 0
        clearInterval(this.timer);
        this.timer = null;
        this.finishChallengeFlow();
      }
    }, 1000);
  }

  pauseChallenge() {
    if (!this.challengeInProgress) return;

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.challengeInProgress = false;
  }

  async finishChallengeFlow() {
    if (!this.currentChallenge) return;

    const alert = await this.alertCtrl.create({
      header: 'Finalizar prueba',
      message: '¿Quieres finalizar la prueba actual?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Finalizar',
          role: 'confirm',
          handler: () => {
            // No await dentro del handler
            this.endChallenge();
          }
        }
      ]
    });

    await alert.present();
  }

  async endChallenge() {
    // Parar temporizador
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    this.challengeInProgress = false;
    this.timeLeft = 0;

    const prevChallengeId = this.currentChallenge?.id;

    // Marcar como completada localmente
    if (prevChallengeId && !this.completedChallenges.includes(prevChallengeId)) {
      this.completedChallenges.push(prevChallengeId);
    }

    // Actualizar estado en el array local de challenges
    if (prevChallengeId) {
      const idx = this.challenges.findIndex(c => c.id === prevChallengeId);
      if (idx >= 0) {
        this.challenges[idx] = {
          ...this.challenges[idx],
          status: 'completed'
        };
      }
    }

    // Seleccionar siguiente prueba si está desbloqueada
    if (this.currentChallenge) {
      const i = this.challenges.findIndex(c => c.id === this.currentChallenge!.id);
      const nextIndex = i + 1;
      if (nextIndex < this.challenges.length && this.isChallengeUnlocked(nextIndex)) {
        this.currentChallenge = this.challenges[nextIndex];
      }
    }
  }

  formatTime(totalSeconds: number): string {
    if (totalSeconds == null || totalSeconds < 0) totalSeconds = 0;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  formatDuration(duration?: number | null): string {
    const seconds = duration ?? 120; // Por defecto 2 minutos
    return this.formatTime(seconds);
  }

  getDifficultyText(difficulty?: 'easy' | 'medium' | 'hard' | null): string {
    switch (difficulty) {
      case 'easy':
        return 'Fácil';
      case 'hard':
        return 'Difícil';
      case 'medium':
      default:
        return 'Medio';
    }
  }

  // Sincroniza en Supabase y recarga en la vista
  async syncChallenges() {
    if (!this.isHost) return;
    if (!this.room?.id) return;

    this.isLoading = true;
    try {
      await this.supabaseService.seedChallenges();
      await this.loadChallenges(this.room.id);
    } catch (e) {
      console.error('❌ [syncChallenges] Error:', e);
      alert('No se pudieron sincronizar las pruebas.');
    } finally {
      this.isLoading = false;
    }
  }
}
