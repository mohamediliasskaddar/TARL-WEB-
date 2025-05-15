import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormControl } from '@angular/forms';
import { Database, ref, set, onValue } from '@angular/fire/database';
import { CommonModule, KeyValue } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';
import {FindCompositionsConfig, VerticalOperationsConfig, MultiStepProblemConfig} from '../../types/soustraction-mini-game-types'

@Component({
  selector: 'app-test-creation',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './test-creation.component.html',
  styleUrl: './test-creation.component.css'
})
export class TestCreationComponent {

  private fb = inject(FormBuilder);
  private db = inject(Database);
  private auth = inject(AuthService);
  private http = inject(HttpClient);

  gradeLevels: string[] = [];
  teacherUID: string = ""
  selectedMiniGames: string[] = [];
  allMiniGames: {
  suggestedGradeRange: { min: number; max: number; };// i add this 
    id: string;
    title: string;
    configTemplate: Partial<  FindCompositionsConfig &
      VerticalOperationsConfig & MultiStepProblemConfig >; }[] = [];
  
  testForm: FormGroup = this.fb.group({
    title: ['', Validators.required],
    classroomId: ['', Validators.required],
    testDuration: [30, [Validators.required, Validators.min(5)]],
    selectedMiniGames: [[]],
    miniGameConfigs: this.fb.group({})
  });

  private gameDefs: any = {};


ngOnInit() {
  // Step 1: Get the logged-in teacher and load student grades
  this.auth.getCurrentUserWithRole().subscribe(user => {
    if (!user) return;
    this.teacherUID = user.uid;
    const usersRef = ref(this.db, 'users');
    onValue(usersRef, (snapshot) => {
      const allUsers = snapshot.val();
      const gradesSet = new Set<string>();

      for (const key in allUsers) {
        const student = allUsers[key];
        if (student.role === 'Student' && student.linkedTeacherId === this.teacherUID && student.schoolGrade) {
          gradesSet.add(`${student.schoolGrade}`);
        }
      }
      this.gradeLevels = Array.from(gradesSet).sort();
    });
  });

  // Step 2: Load mini-games from JSON
  this.http.get('JSON/soustraction-mini-games.json').subscribe((data: any) => {
    this.gameDefs = data.miniGames;
    const selectedGrade = Number(this.testForm.get('classroomId')?.value || '4');
    this.allMiniGames = this.getFilteredMiniGames(selectedGrade);
    this.testForm.get('classroomId')?.valueChanges.subscribe((newGrade: string) => {
      const grade = Number(newGrade);
      this.allMiniGames = this.getFilteredMiniGames(grade);
    });
  });
}
// filteer  
getFilteredMiniGames(grade: number) {
  return Object.entries(this.gameDefs).map(([id, game]: any) => {
    const gradeConfigs = game.defaultConfig?.gradeConfig || {};
    const fallbackConfig = Object.values(gradeConfigs)[0] || {};

    return {
      id,
      title: game.title?.en || id,
      suggestedGradeRange: game.suggestedGradeRange, 
      configTemplate: gradeConfigs[grade] || fallbackConfig
    };
  });
}

//to filter grades 
  isGradeInRange(gradeRange: { min: number, max: number }, selectedGrade: number): boolean {
  return selectedGrade >= gradeRange.min && selectedGrade <= gradeRange.max;
}

  getKey(key: any): string {
      return key.key;
  }

  onCheckboxChange(event: Event, gameId: string) {
    const input = event.target as HTMLInputElement;
    this.onMiniGameToggle(gameId, input.checked);
  }

  onMiniGameToggle(gameId: string, checked: boolean) {
    const configs = this.testForm.get('miniGameConfigs') as FormGroup; 
    if (checked) {
      this.selectedMiniGames.push(gameId);
      configs.addControl(gameId, this.fb.group(this.buildMiniGameControls(gameId)));
    } else {
      this.selectedMiniGames = this.selectedMiniGames.filter(id => id !== gameId);
      configs.removeControl(gameId);
    }
    this.testForm.get('selectedMiniGames')?.setValue(this.selectedMiniGames);
  }
  
  buildMiniGameControls(gameId: string): { [key: string]: FormControl } {
    const game = this.allMiniGames.find(g => g.id === gameId);
    const fields = game?.configTemplate || {};
    const controls: { [key: string]: FormControl } = {};
  
    for (const key in fields) {
      controls[key] = new FormControl(fields[key as keyof typeof fields], Validators.required);
    }
  
    return controls;
  }  

//fct done 
  submitTest() {
    if (this.testForm.invalid) return;

    const testData = this.testForm.value;
    const testId = 'test_' + Date.now();
    const testObject = {
      testName: testData.title,
      teacherId: this.teacherUID,
      grade: testData.classroomId,
      testDuration: testData.testDuration,
      isDraft: false,
      miniGameOrder: testData.selectedMiniGames,
      miniGameConfigs: testData.miniGameConfigs,
      createdAt: Date.now(),
    };//DB
    set(ref(this.db, `tests/${testId}`), testObject)
    .then(() => alert(' Test created successfully!'))
    .catch((err) => console.error(' Error saving test:', err));
  }
}
