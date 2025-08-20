import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GamePlayPage } from './game-play.page';

describe('GamePlayPage', () => {
  let component: GamePlayPage;
  let fixture: ComponentFixture<GamePlayPage>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [GamePlayPage]
    });
    fixture = TestBed.createComponent(GamePlayPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});