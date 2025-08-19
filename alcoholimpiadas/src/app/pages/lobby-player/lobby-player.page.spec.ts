import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LobbyPlayerPage } from './lobby-player.page';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';

describe('LobbyPlayerPage', () => {
  let component: LobbyPlayerPage;
  let fixture: ComponentFixture<LobbyPlayerPage>;
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
      'getCurrentUser',
      'subscribeToRoomPlayers',
      'leaveRoom'
    ]);

    await TestBed.configureTestingModule({
      imports: [LobbyPlayerPage],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: activatedRouteSpy },
        { provide: SupabaseService, useValue: supabaseServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LobbyPlayerPage);
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

  it('should navigate back when goBack is called', () => {
    spyOn(component, 'leaveRoom');
    
    component.goBack();
    
    expect(component.leaveRoom).toHaveBeenCalled();
  });
});