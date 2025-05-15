import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ParentStudentsComponent } from './parent-students.component';

describe('ParentStudentsComponent', () => {
  let component: ParentStudentsComponent;
  let fixture: ComponentFixture<ParentStudentsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ParentStudentsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ParentStudentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
