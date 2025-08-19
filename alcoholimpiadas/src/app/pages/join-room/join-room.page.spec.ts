import { ComponentFixture, TestBed } from '@angular/core/testing';
import { JoinRoomPage } from './join-room.page';

describe('JoinRoomPage', () => {
  let component: JoinRoomPage;
  let fixture: ComponentFixture<JoinRoomPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(JoinRoomPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});