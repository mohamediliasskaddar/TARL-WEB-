import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudentsRankingComponent } from './students-ranking.component';

describe('StudentsRankingComponent', () => {
  let component: StudentsRankingComponent;
  let fixture: ComponentFixture<StudentsRankingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentsRankingComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StudentsRankingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
