import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditTestComponent } from './edit-test.component';

describe('EditTestComponent', () => {
  let component: EditTestComponent;
  let fixture: ComponentFixture<EditTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditTestComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
