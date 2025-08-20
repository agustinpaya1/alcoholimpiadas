import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PruebasPage } from './pruebas.page';
import { Router } from '@angular/router';

describe('PruebasPage', () => {
  let component: PruebasPage;
  let fixture: ComponentFixture<PruebasPage>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [PruebasPage],
      providers: [
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PruebasPage);
    component = fixture.componentInstance;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have pruebas array with 6 items', () => {
    expect(component.pruebas).toBeDefined();
    expect(component.pruebas.length).toBe(6);
  });

  it('should navigate back when goBack is called', () => {
    component.goBack();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/game']);
  });

  it('should handle prueba selection', () => {
    spyOn(window, 'alert');
    const testPrueba = component.pruebas[0];
    
    component.onPruebaSelected(testPrueba);
    
    expect(window.alert).toHaveBeenCalledWith(`¡Has seleccionado: ${testPrueba.nombre}!`);
  });
});