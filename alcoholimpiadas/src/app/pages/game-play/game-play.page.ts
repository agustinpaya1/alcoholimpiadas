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

  // Colores para los equipos
  teamColors: string[] = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA726', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private supabaseService: SupabaseService
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
    console.log('🚀 [loadGameData] Iniciando carga de datos del juego para roomId:', roomId);
    
    try {
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
      
      // Log adicional para verificar el estado del array
      console.log('✅ Pruebas asignadas al componente:', this.challenges);
      
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

  // Cambiar el método isChallengeCompleted para consultar el estado real
  isChallengeCompleted(challengeId: string): boolean {
    const challenge = this.challenges.find(c => c.id === challengeId);
    return challenge?.status === 'completed';
  }
  
  // Eliminar los métodos duplicados (líneas 225-266) y mantener solo estos:
  async endChallenge() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.challengeInProgress = false;
    this.timeLeft = 0;
    
    console.log('🏁 Finalizando prueba...');
  }
  
  async selectWinner(teamNumber: number) {
    if (!this.isHost || !this.currentChallenge) return;
    
    console.log(`🏆 Equipo ${teamNumber} seleccionado como ganador`);
    
    try {
      // Actualizar el estado de la prueba en la base de datos
      await this.supabaseService.updateChallengeStatus(
        this.currentChallenge.id, 
        'completed', 
        teamNumber
      );
      
      // Actualizar el estado local de la prueba
      const challengeIndex = this.challenges.findIndex(c => c.id === this.currentChallenge!.id);
      if (challengeIndex !== -1) {
        this.challenges[challengeIndex].status = 'completed';
        this.challenges[challengeIndex].winner_team_id = teamNumber.toString();
      }
      
      // Marcar la prueba como completada localmente
      if (this.currentChallenge && !this.isChallengeCompleted(this.currentChallenge.id)) {
        this.completedChallenges.push(this.currentChallenge.id);
      }
      
      // Finalizar la prueba actual
      await this.endChallenge();
      
      console.log('✅ Prueba completada y actualizada en la base de datos');
    } catch (error) {
      console.error('❌ Error al actualizar la prueba:', error);
      alert('Error al finalizar la prueba');
    }
  }

  isNextAvailable(index: number): boolean {
    // Verificar si esta es la siguiente prueba disponible
    if (index === 0 && !this.isChallengeCompleted(this.challenges[0]?.id)) {
      return true;
    }
    
    if (index > 0) {
      const previousCompleted = this.isChallengeCompleted(this.challenges[index - 1]?.id);
      const currentCompleted = this.isChallengeCompleted(this.challenges[index]?.id);
      return previousCompleted && !currentCompleted;
    }
    
    return false;
  }

  getCompletedChallengesCount(): number {
    return this.completedChallenges.length;
  }

  selectChallenge(challenge: Challenge, index: number) {
    // Solo permitir seleccionar pruebas desbloqueadas
    if (this.isChallengeUnlocked(index)) {
      this.currentChallenge = challenge;
      
      // Si es el anfitrión, puede iniciar la prueba directamente
      if (this.isHost) {
        console.log(`Prueba seleccionada: ${challenge.title}`);
      }
    }
  }

  // Funciones para el modal de instrucciones
  openChallengeInstructions(challenge: Challenge, event: Event) {
    event.stopPropagation();
    this.selectedChallenge = challenge;
    this.generateInstructionSteps(challenge);
    this.currentInstructionStep = 0;
    this.showInstructionsModal = true;
  }

  closeInstructionsModal() {
    this.showInstructionsModal = false;
    this.selectedChallenge = null;
    this.instructionSteps = [];
    this.currentInstructionStep = 0;
  }

  generateInstructionSteps(challenge: Challenge) {
    // Generar pasos de instrucciones basados en la prueba
    this.instructionSteps = [
      {
        title: '¡Bienvenidos a la prueba!',
        description: `Están a punto de comenzar: ${challenge.title}. Asegúrense de que todos los equipos estén listos.`,
        icon: 'trophy'
      },
      {
        title: 'Objetivo de la prueba',
        description: challenge.description || 'Esta es una prueba emocionante que pondrá a prueba las habilidades de los equipos.',
        icon: 'target'
      },
      {
        title: 'Duración',
        description: `Tendrán ${this.formatDuration(challenge.duration)} para completar esta prueba. ¡Administren bien su tiempo!`,
        icon: 'time'
      },
      {
        title: 'Dificultad',
        description: `Nivel de dificultad: ${this.getDifficultyText(challenge.difficulty)}. ${this.getDifficultyDescription(challenge.difficulty)}`,
        icon: 'star'
      },
      {
        title: '¡Listos para empezar!',
        description: 'Una vez que presionen "Empezar", comenzará el cronómetro. ¡Que gane el mejor equipo!',
        icon: 'play-circle'
      }
    ];
  }

  getDifficultyDescription(difficulty: 'easy' | 'medium' | 'hard' | null): string {
    switch (difficulty) {
      case 'easy': return 'Una prueba relajada para calentar motores.';
      case 'medium': return 'Requiere concentración y trabajo en equipo.';
      case 'hard': return '¡Prepárense para un desafío intenso!';
      default: return 'Una prueba equilibrada para todos.';
    }
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
    if (this.selectedChallenge) {
      this.currentChallenge = this.selectedChallenge;
      this.startChallenge();
    }
  }

  startChallenge() {
    if (!this.currentChallenge || !this.isHost) return;
    
    this.challengeInProgress = true;
    this.timeLeft = this.currentChallenge.duration || 120;
    
    // Iniciar temporizador
    this.timer = setInterval(() => {
      this.timeLeft--;
      if (this.timeLeft <= 0) {
        this.endChallenge();
      }
    }, 1000);
  }

  pauseChallenge() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.challengeInProgress = false;
  }
  /*
  async endChallenge() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.challengeInProgress = false;
    this.timeLeft = 0;
    
    // Marcar la prueba como completada
    if (this.currentChallenge && !this.isChallengeCompleted(this.currentChallenge.id)) {
      this.completedChallenges.push(this.currentChallenge.id);
    }
    
    console.log('Prueba finalizada');
  }

  async selectWinner(teamNumber: number) {
    if (!this.isHost || !this.currentChallenge) return;
    
    console.log(`Equipo ${teamNumber} seleccionado como ganador`);
    
    // Finalizar la prueba actual
    await this.endChallenge();
  }
*/
  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  formatDuration(seconds: number | null): string {
    if (!seconds) return '2:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  getDifficultyText(difficulty: 'easy' | 'medium' | 'hard' | null): string {
    switch (difficulty) {
      case 'easy': return 'Fácil';
      case 'medium': return 'Medio';
      case 'hard': return 'Difícil';
      default: return 'Medio';
    }
  }

  async endGame() {
    if (this.timer) {
      clearInterval(this.timer);
    }
    
    console.log('Juego terminado');
    this.router.navigate(['/game']);
  }

  goBack() {
    this.router.navigate(['/lobby-host', this.room?.id]);
  }
}