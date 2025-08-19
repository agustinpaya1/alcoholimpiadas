import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LobbyHostPage } from './lobby-host.page';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';

describe('LobbyHostPage', () => {
  let component: LobbyHostPage;
  let fixture: ComponentFixture<LobbyHostPage>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockActivatedRoute: jasmine.SpyObj<ActivatedRoute>;
  let mockSupabaseService: jasmine.SpyObj<SupabaseService>;

  beforeEach(async () => {
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    const activatedRouteSpy = jasmine.createSpyObj('ActivatedRoute', [], {
      snapshot: { paramMap: { get: jasmine.createSpy().and.returnValue('test-room-id') } }
    });
    const supabaseServiceSpy = jasmine.createSpyObj('SupabaseService', [
      'getRoomPlayers',
      'subscribeToRoomPlayers',
      'startGame'
    ]);

    await TestBed.configureTestingModule({
      imports: [LobbyHostPage],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: activatedRouteSpy },
        { provide: SupabaseService, useValue: supabaseServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LobbyHostPage);
    component = fixture.componentInstance;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    mockActivatedRoute = TestBed.inject(ActivatedRoute) as jasmine.SpyObj<ActivatedRoute>;
    mockSupabaseService = TestBed.inject(SupabaseService) as jasmine.SpyObj<SupabaseService>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load room data on init', () => {
    spyOn(component, 'loadRoomData');
    spyOn(component, 'subscribeToPlayers');
    
    component.ngOnInit();
    
    expect(component.loadRoomData).toHaveBeenCalledWith('test-room-id');
    expect(component.subscribeToPlayers).toHaveBeenCalledWith('test-room-id');
  });

  it('should determine if game can start', () => {
    component.players = [{ id: '1' }, { id: '2' }] as any;
    component.room = { max_players: 6 } as any;
    
    expect(component.canStartGame()).toBe(true);
  });

  it('should navigate back when goBack is called', () => {
    component.goBack();
    
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/game']);
  });
});