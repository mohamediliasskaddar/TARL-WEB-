import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuickTestComponent } from './quick-test.component';

describe('QuickTestComponent', () => {
  let component: QuickTestComponent;
  let fixture: ComponentFixture<QuickTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuickTestComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QuickTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
