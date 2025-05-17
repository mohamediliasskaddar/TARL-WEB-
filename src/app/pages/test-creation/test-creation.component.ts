import { Component, inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormControl,
  FormArray
} from '@angular/forms';
import { Database, ref, set, onValue } from '@angular/fire/database';
import { CommonModule, KeyValuePipe,KeyValue, NgFor, NgIf, TitleCasePipe } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';
import {
  FindCompositionsConfig,
  VerticalOperationsConfig,
  MultiStepProblemConfig
} from '../../types/soustraction-mini-game-types';
import { distinctUntilChanged } from 'rxjs';

interface MiniGameDef {
  id: string;
  title: string;
  suggestedGradeRange: { min: number; max: number };
  configTemplate: Partial<FindCompositionsConfig & VerticalOperationsConfig & MultiStepProblemConfig>;
}

@Component({
  selector: 'app-test-creation',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NgFor,
    NgIf,
    KeyValuePipe,
    TitleCasePipe
  ],
  templateUrl: './test-creation.component.html',
  styleUrls: ['./test-creation.component.css']
})
export class TestCreationComponent implements OnInit {
  private fb = inject(FormBuilder);
  private db = inject(Database);
  private auth = inject(AuthService);
  private http = inject(HttpClient);

  gradeLevels: string[] = [];
  teacherUID = '';
  gameDefs: Record<string, any> = {};
  allMiniGames: MiniGameDef[] = [];
  availableStudents: { id: string; name: string }[] = [];

  testForm: FormGroup = this.fb.group({
    title: ['', Validators.required],
    classroomId: ['', Validators.required],
    testDuration: [30, [Validators.required, Validators.min(5)]],
    isDraft: [false],
    isSpecial: [false],
    selectedStudents: this.fb.array<string>([]),
    selectedMiniGames: this.fb.array<string>([]),
    miniGameConfigs: this.fb.group({})
  });

  ngOnInit() {
    // Load teacher grades
    this.auth.getCurrentUserWithRole().subscribe(user => {
      if (!user) return;
      this.teacherUID = user.uid;
      const usersRef = ref(this.db, 'users');
      onValue(usersRef, snap => {
        const all = snap.val() || {};
        const gradesSet = new Set<string>();
        Object.values(all).forEach((u: any) => {
          if (u.role === 'Student' && u.linkedTeacherId === this.teacherUID && u.schoolGrade) {
            gradesSet.add(`${u.schoolGrade}`);
          }
        });
        this.gradeLevels = Array.from(gradesSet).sort();
      });
    });

    // Load mini-games and react to classroom change
    this.http.get('JSON/soustraction-mini-games.json').subscribe((data: any) => {
      this.gameDefs = data.miniGames;
      this.testForm.get('classroomId')!
        .valueChanges
        .pipe(distinctUntilChanged())
        .subscribe(val => {
          const grade = Number(val);
          this.loadStudentsForGrade(grade);
          this.allMiniGames = this.getFilteredMiniGames(grade);
        });
      // Trigger initial
      const initGrade = Number(this.testForm.get('classroomId')!.value ?? this.gradeLevels[0]);
      this.allMiniGames = this.getFilteredMiniGames(initGrade);
    });
  }

  // Getters for template use
  get selectedMiniGameIds(): string[] {
    return this.testForm.get('selectedMiniGames')?.value || [];
  }

  get selectedStudentIds(): string[] {
    return this.testForm.get('selectedStudents')?.value || [];
  }

  private getFilteredMiniGames(grade: number): MiniGameDef[] {
    return Object.entries(this.gameDefs).map(([id, game]: any) => {
      const gradeConfigs = game.defaultConfig?.gradeConfig || {};
      const fallback = Object.values(gradeConfigs)[0] || {};
      return {
        id,
        title: game.title?.en || id,
        suggestedGradeRange: game.suggestedGradeRange,
        configTemplate: gradeConfigs[grade] || fallback
      };
    });
  }

  isGradeInRange(range: { min: number; max: number }, grade: number): boolean {
    return grade >= range.min && grade <= range.max;
  }

  onMiniGameToggle(gameId: string, checked: boolean) {
    const mgArray = this.testForm.get('selectedMiniGames') as FormArray;
    const configs = this.testForm.get('miniGameConfigs') as FormGroup;
    if (checked) {
      mgArray.push(new FormControl(gameId));
      configs.addControl(gameId, this.fb.group(this.buildMiniGameControls(gameId)));
    } else {
      const idx = mgArray.controls.findIndex(c => c.value === gameId);
      if (idx > -1) mgArray.removeAt(idx);
      configs.removeControl(gameId);
    }
  }

  private buildMiniGameControls(gameId: string) {
    const game = this.allMiniGames.find(g => g.id === gameId)!;
    const fields = game.configTemplate || {};
    return Object.entries(fields).reduce((acc, [k, v]) => {
      acc[k] = new FormControl(v, Validators.required);
      return acc;
    }, {} as { [key: string]: FormControl });
  }

  private loadStudentsForGrade(grade: number) {
    const usersRef = ref(this.db, 'users');
    onValue(usersRef, snap => {
      const all = snap.val() || {};
      this.availableStudents = Object.entries(all)
        .filter(([_, u]: any) =>
          u.role === 'Student' &&
          u.linkedTeacherId === this.teacherUID &&
          Number(u.schoolGrade) === grade
        )
        .map(([key, u]: any) => ({ id: key, name: `${u.firstName} ${u.lastName}` }));
    });
  }

  onStudentToggle(id: string, checked: boolean) {
    const arr = this.testForm.get('selectedStudents') as FormArray;
    if (checked) {
      arr.push(new FormControl(id));
    } else {
      const idx = arr.controls.findIndex(c => c.value === id);
      if (idx > -1) arr.removeAt(idx);
    }
  }

  submitTest() {
    if (this.testForm.invalid) return;
    const v = this.testForm.value;
    const testId = `test_${Date.now()}`;
    const testObject: any = {
      testName: v.title,
      teacherId: this.teacherUID,
      grade: v.classroomId,
      testDuration: v.testDuration,
      isDraft: v.isDraft,
      isSpecial: v.isSpecial,
      miniGameOrder: v.selectedMiniGames,
      miniGameConfigs: v.miniGameConfigs,
      createdAt: Date.now()
    };
    if (v.isSpecial) testObject.concernedStudents = v.selectedStudents;

    set(ref(this.db, `tests/${testId}`), testObject)
      .then(() => alert('Test saved successfully!'))
      .catch(err => console.error('Save failed', err));
  }
}
