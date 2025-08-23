import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, ActivatedRoute } from '@angular/router';
import { GamePlayPage } from './game-play.page';
import { SupabaseService, Room, RoomPlayer, Challenge } from '../../services/supabase.service';
import { RealtimeChannel } from '@supabase/supabase-js';
import { User } from '@supabase/supabase-js';

describe('GamePlayPage', () => {
  let component: GamePlayPage;
  let fixture: ComponentFixture<GamePlayPage>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockActivatedRoute: any;
  let mockSupabaseService: jasmine.SpyObj<SupabaseService>;
  let mockRealtimeChannel: jasmine.SpyObj<RealtimeChannel>;

  const mockChallenges: Challenge[] = [
    {
      id: '1',
      title: 'Prueba 1',
      description: 'Primera prueba',
      duration: 120,
      difficulty: 'easy' as const,
      image_url: 'test-image.jpg',
      order: 1,
      status: 'active',
      winner_team_id: null,
      created_at: new Date().toISOString()
    },
    {
      id: '2',
      title: 'Prueba 2',
      description: 'Segunda prueba',
      duration: 180,
      difficulty: 'medium' as const,
      image_url: 'test-image2.jpg',
      order: 2,
      status: 'active',
      winner_team_id: null,
      created_at: new Date().toISOString()
    },
    {
      id: '3',
      title: 'Prueba 3',
      description: 'Tercera prueba',
      duration: 240,
      difficulty: 'hard' as const,
      image_url: 'test-image3.jpg',
      order: 3,
      status: 'active',
      winner_team_id: null,
      created_at: new Date().toISOString()
    }
  ];

  const mockRoom: Room = {
    id: 'room-1',
    name: 'Sala de Prueba',
    max_players: 8,
    num_teams: 2,
    status: 'playing',
    created_at: new Date().toISOString(),
    created_by: 'user-1'
  };

  const mockPlayers: RoomPlayer[] = [
    {
      id: 'player-1',
      user_id: 'user-1',
      room_id: 'room-1',
      player_name: 'Jugador 1',
      team_number: 1,
      role: 'host' as const,
      team_color: '#FF6B6B',
      joined_at: new Date().toISOString()
    },
    {
      id: 'player-2',
      user_id: 'user-2',
      room_id: 'room-1',
      player_name: 'Jugador 2',
      team_number: 2,
      role: 'player' as const,
      team_color: '#4ECDC4',
      joined_at: new Date().toISOString()
    }
  ];

  const mockUser: User = {
    id: 'user-1',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
    email: 'test@example.com'
  };

  beforeEach(async () => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockActivatedRoute = {
      snapshot: {
        paramMap: {
          get: jasmine.createSpy('get').and.returnValue('room-1')
        }
      }
    };
    
    mockRealtimeChannel = jasmine.createSpyObj('RealtimeChannel', ['on', 'subscribe', 'unsubscribe']);
    mockRealtimeChannel.on.and.returnValue(mockRealtimeChannel);
    mockRealtimeChannel.subscribe.and.returnValue(mockRealtimeChannel);
    
    mockSupabaseService = jasmine.createSpyObj('SupabaseService', [
      'getCurrentUser',
      'getRoomPlayers',
      'getChallenges',
      'subscribeToRoomPlayers'
    ], {
      client: {
        from: jasmine.createSpy('from').and.returnValue({
          select: jasmine.createSpy('select').and.returnValue({
            eq: jasmine.createSpy('eq').and.returnValue({
              single: jasmine.createSpy('single').and.returnValue(
                Promise.resolve({ data: mockRoom, error: null })
              )
            })
          })
        })
      }
    });

    mockSupabaseService.getCurrentUser.and.returnValue(Promise.resolve(mockUser));
    mockSupabaseService.getRoomPlayers.and.returnValue(Promise.resolve(mockPlayers));
    mockSupabaseService.getChallenges.and.returnValue(Promise.resolve(mockChallenges));
    mockSupabaseService.subscribeToRoomPlayers.and.returnValue(mockRealtimeChannel);

    await TestBed.configureTestingModule({
      imports: [GamePlayPage],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: SupabaseService, useValue: mockSupabaseService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(GamePlayPage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load game data on init', async () => {
    await component.ngOnInit();
    expect(component.room).toEqual(mockRoom);
    expect(component.players).toEqual(mockPlayers);
    expect(component.challenges).toEqual(mockChallenges);
    expect(component.isHost).toBe(true);
  });

  describe('Challenge unlocking logic', () => {
    beforeEach(async () => {
      component.challenges = mockChallenges;
    });

    it('should unlock first challenge by default', () => {
      expect(component.isChallengeUnlocked(0)).toBe(true);
    });

    it('should not unlock second challenge initially', () => {
      expect(component.isChallengeUnlocked(1)).toBe(false);
    });

    it('should unlock second challenge when first is completed', () => {
      component.completedChallenges = ['1'];
      expect(component.isChallengeUnlocked(1)).toBe(true);
    });

    it('should identify next available challenge correctly', () => {
      expect(component.isNextAvailable(0)).toBe(true);
      expect(component.isNextAvailable(1)).toBe(false);
      
      component.completedChallenges = ['1'];
      expect(component.isNextAvailable(0)).toBe(false);
      expect(component.isNextAvailable(1)).toBe(true);
    });
  });

  describe('Challenge completion tracking', () => {
    it('should track completed challenges count', () => {
      expect(component.getCompletedChallengesCount()).toBe(0);
      
      component.completedChallenges = ['1', '2'];
      expect(component.getCompletedChallengesCount()).toBe(2);
    });

    it('should mark challenge as completed', () => {
      expect(component.isChallengeCompleted('1')).toBe(false);
      
      component.completedChallenges.push('1');
      expect(component.isChallengeCompleted('1')).toBe(true);
    });
  });

  describe('Instructions modal', () => {
    beforeEach(() => {
      component.challenges = mockChallenges;
    });

    it('should open instructions modal', () => {
      const mockEvent = { stopPropagation: jasmine.createSpy() } as any;
      component.openChallengeInstructions(mockChallenges[0], mockEvent);
      
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(component.showInstructionsModal).toBe(true);
      expect(component.selectedChallenge).toEqual(mockChallenges[0]);
      expect(component.instructionSteps.length).toBeGreaterThan(0);
    });

    it('should close instructions modal', () => {
      component.showInstructionsModal = true;
      component.selectedChallenge = mockChallenges[0];
      component.instructionSteps = [{ title: 'Test', description: 'Test', icon: 'test' }];
      
      component.closeInstructionsModal();
      
      expect(component.showInstructionsModal).toBe(false);
      expect(component.selectedChallenge).toBeNull();
      expect(component.instructionSteps).toEqual([]);
      expect(component.currentInstructionStep).toBe(0);
    });

    it('should navigate through instruction steps', () => {
      component.instructionSteps = [
        { title: 'Step 1', description: 'First step', icon: 'test1' },
        { title: 'Step 2', description: 'Second step', icon: 'test2' },
        { title: 'Step 3', description: 'Third step', icon: 'test3' }
      ];
      
      expect(component.currentInstructionStep).toBe(0);
      
      component.nextInstruction();
      expect(component.currentInstructionStep).toBe(1);
      
      component.nextInstruction();
      expect(component.currentInstructionStep).toBe(2);
      
      // Should not go beyond last step
      component.nextInstruction();
      expect(component.currentInstructionStep).toBe(2);
      
      component.previousInstruction();
      expect(component.currentInstructionStep).toBe(1);
      
      component.previousInstruction();
      expect(component.currentInstructionStep).toBe(0);
      
      // Should not go below first step
      component.previousInstruction();
      expect(component.currentInstructionStep).toBe(0);
    });

    it('should generate instruction steps for challenge', () => {
      component.generateInstructionSteps(mockChallenges[0]);
      
      expect(component.instructionSteps.length).toBe(5);
      expect(component.instructionSteps[0].title).toContain('Bienvenidos');
      expect(component.instructionSteps[1].title).toContain('Objetivo');
      expect(component.instructionSteps[2].title).toContain('Duración');
      expect(component.instructionSteps[3].title).toContain('Dificultad');
      expect(component.instructionSteps[4].title).toContain('Listos');
    });
  });

  describe('Challenge management', () => {
    beforeEach(() => {
      component.challenges = mockChallenges;
      component.isHost = true;
    });

    it('should select unlocked challenge', () => {
      component.selectChallenge(mockChallenges[0], 0);
      expect(component.currentChallenge).toEqual(mockChallenges[0]);
    });

    it('should not select locked challenge', () => {
      const previousChallenge = component.currentChallenge;
      component.selectChallenge(mockChallenges[1], 1);
      expect(component.currentChallenge).toEqual(previousChallenge);
    });

    it('should start challenge when host', () => {
      component.currentChallenge = mockChallenges[0];
      component.startChallenge();
      
      expect(component.challengeInProgress).toBe(true);
      expect(component.timeLeft).toBe(120);
    });

    it('should not start challenge when not host', () => {
      component.isHost = false;
      component.currentChallenge = mockChallenges[0];
      component.startChallenge();
      
      expect(component.challengeInProgress).toBe(false);
    });

    it('should end challenge and mark as completed', async () => {
      component.currentChallenge = mockChallenges[0];
      component.challengeInProgress = true;
      
      await component.endChallenge();
      
      expect(component.challengeInProgress).toBe(false);
      expect(component.timeLeft).toBe(0);
      expect(component.completedChallenges).toContain('1');
    });
  });

  describe('Utility functions', () => {
    it('should format time correctly', () => {
      expect(component.formatTime(0)).toBe('00:00');
      expect(component.formatTime(65)).toBe('01:05');
      expect(component.formatTime(3661)).toBe('61:01');
    });

    it('should format duration correctly', () => {
      expect(component.formatDuration(null)).toBe('2:00');
      expect(component.formatDuration(90)).toBe('1:30');
      expect(component.formatDuration(125)).toBe('2:05');
    });

    it('should get difficulty text correctly', () => {
      expect(component.getDifficultyText('easy')).toBe('Fácil');
      expect(component.getDifficultyText('medium')).toBe('Medio');
      expect(component.getDifficultyText('hard')).toBe('Difícil');
      expect(component.getDifficultyText(null)).toBe('Medio');
    });

    it('should get team numbers correctly', () => {
      component.room = mockRoom;
      expect(component.getTeamNumbers()).toEqual([1, 2]);
      
      component.room = null;
      expect(component.getTeamNumbers()).toEqual([]);
    });

    it('should get team players correctly', () => {
      component.players = mockPlayers;
      expect(component.getTeamPlayers(1)).toEqual([mockPlayers[0]]);
      expect(component.getTeamPlayers(2)).toEqual([mockPlayers[1]]);
    });
  });

  describe('Navigation', () => {
    it('should navigate back to lobby', () => {
      component.room = mockRoom;
      component.goBack();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/lobby-host', 'room-1']);
    });

    it('should navigate to game page on end game', async () => {
      await component.endGame();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/game']);
    });
  });

  afterEach(() => {
    if (component.timer) {
      clearInterval(component.timer);
    }
  });
});