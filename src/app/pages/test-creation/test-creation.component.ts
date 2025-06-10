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
import { CommonModule, KeyValuePipe, KeyValue, NgFor, NgIf, TitleCasePipe } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';
import {
  FindCompositionsConfig,
  VerticalOperationsConfig,
  MultiStepProblemConfig
} from '../../types/soustraction-mini-game-types';
import { distinctUntilChanged } from 'rxjs';
import { log } from 'console';
// Interface représentant la définition d'un mini-jeu
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
    TitleCasePipe
  ],
  templateUrl: './test-creation.component.html',
  styleUrls: ['./test-creation.component.css']
})
export class TestCreationComponent implements OnInit {
  // Injection des services nécessaires via `inject()`
  private fb = inject(FormBuilder);
  private db = inject(Database);
  private auth = inject(AuthService);
  private http = inject(HttpClient);

  // Variables utilisées dans le composant
  gradeLevels: string[] = []; // niveaux scolaires disponibles
  teacherUID = ''; // UID du professeur connecté
  gameDefs: Record<string, any> = {}; // définitions brutes des mini-jeux
  allMiniGames: MiniGameDef[] = []; // liste des mini-jeux filtrés
  availableStudents: { id: string; name: string }[] = []; // élèves disponibles à affecter au test
  quickTemplateKeys: string[] = [];
  currentQuickIndex = 0;

  // Définition du formulaire de création de test
  testForm: FormGroup = this.fb.group({
    title: ['', Validators.required],
    classroomId: ['', Validators.required],
    testDuration: [30, [Validators.required, Validators.min(5)]],
    isDraft: [false],
    isSpecial: [false],
    selectedStudents: this.fb.array<string>([]), // liste des élèves sélectionnés
    selectedMiniGames: this.fb.array<string>([]), // liste des mini-jeux sélectionnés
    miniGameConfigs: this.fb.group({}) // configurations spécifiques des mini-jeux
  });

  ngOnInit() {
    // --- 1) Récupère l'utilisateur connecté et filtre ses élèves pour récupérer les niveaux scolaires disponibles ---
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
        this.gradeLevels = Array.from(gradesSet).sort(); // trie des niveaux
      });
    });

    // --- 2) Charge les mini-jeux depuis un fichier JSON et configure la logique de filtrage dynamique selon le grade ---
    this.http.get('JSON/elalah.json').subscribe((data: any) => {
      this.gameDefs = data.miniGames;
      // addeeed
        const quickDefs = data.miniGames.quick_multi_step_problem.defaultConfig.gradeConfig;
        this.quickTemplateKeys = Object.keys(quickDefs);    // ['m_1','m_2','m_3', …]
        this.currentQuickIndex = 0;

      // Réagit au changement de classe sélectionnée dans le formulaire
      this.testForm.get('classroomId')!
        .valueChanges
        .pipe(distinctUntilChanged())
        .subscribe(val => {
          const grade = Number(val);
          this.loadStudentsForGrade(grade); // charge les élèves correspondant au grade
          this.allMiniGames = this.getFilteredMiniGames(grade); // filtre les mini-jeux pour le grade
        });

      // Initialisation avec la première valeur possible
      const initGrade = Number(this.testForm.get('classroomId')!.value ?? this.gradeLevels[0]);
      this.allMiniGames = this.getFilteredMiniGames(initGrade);
    });
  }

  // Renvoie la liste des IDs des mini-jeux sélectionnés
  get selectedMiniGameIds(): string[] {
    return this.testForm.get('selectedMiniGames')?.value || [];
  }

  // Renvoie la liste des IDs des élèves sélectionnés
  get selectedStudentIds(): string[] {
    return this.testForm.get('selectedStudents')?.value || [];
  }

  // Retourne les mini-jeux compatibles avec un certain grade
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

  // Vérifie si un grade est dans la plage suggérée pour un mini-jeu
  isGradeInRange(range: { min: number; max: number }, grade: number): boolean {
    return grade >= range.min && grade <= range.max;
  }

  onMiniGameToggle(gameId: string, checked: boolean) {
  const mgArray = this.testForm.get('selectedMiniGames') as FormArray;
  const configs = this.testForm.get('miniGameConfigs') as FormGroup;

  if (!checked) {
    // uncheck: remove control
    const idx = mgArray.controls.findIndex(c => c.value === gameId);
    if (idx > -1) mgArray.removeAt(idx);
    configs.removeControl(gameId);
    return;
  }

  // checked = true: add control & group
  mgArray.push(new FormControl(gameId));

  // —— BRANCH HERE ——  
  if (gameId === 'quick_multi_step_problem') {
    // 1) get the JSON template config
    const template = (this.allMiniGames.find(g => g.id === gameId)!.configTemplate as any);

    // 2) build controls from JSON, but force 'steps' to be FormArray
    const controls: { [k: string]: any } = this.buildMiniGameControls(gameId);
    delete controls['steps'];
    controls['steps'] = this.fb.array<FormGroup>([]);

    // 3) create the group
    const gameConfigGroup = this.fb.group(controls);
    configs.addControl(gameId, gameConfigGroup);

    // 4) populate its steps
    this.buildStepsFromTemplate(gameConfigGroup, template);
  }
  else {
    // NON-quick path: generic
    const controls = this.buildMiniGameControls(gameId);
    // ensure generic path stays as before
    const gameConfigGroup = this.fb.group(controls);
    configs.addControl(gameId, gameConfigGroup);

    if (gameId === 'multi_step_problem') {
      const numQuestionsCtrl = gameConfigGroup.get('num_questions')!;
      numQuestionsCtrl.valueChanges.subscribe((newCount: number) => {
        this.updateStepControls(gameConfigGroup, newCount);
      });
      const initCount = numQuestionsCtrl.value as number;
      if (initCount) this.updateStepControls(gameConfigGroup, initCount);
    }
  }
}

// added
private buildStepsFromTemplate(group: FormGroup, tpl: any) {
  const stepsArray = group.get('steps') as FormArray;
  console.log(stepsArray);
  // clear old
  while (stepsArray.length) stepsArray.removeAt(0);

  // iterate JSON keys "0","1",…
  Object.keys(tpl.steps)
    .sort((a, b) => +a - +b)
    .forEach(key => {
      const entry = tpl.steps[key];
      stepsArray.push(
        this.fb.group({
          question: new FormControl(entry.question, Validators.required),
          answer:   new FormControl(entry.answer,   Validators.required)
        })
      );
    });
}
getStepsArray(gameId: string): FormArray {
  return this.testForm.get(['miniGameConfigs', gameId, 'steps']) as FormArray;
}


////////////////
private updateStepControls(group: FormGroup, numSteps: number) {
  // Supprimer les anciens steps
  Object.keys(group.controls).forEach(key => {
    if (key.startsWith('step') && (key.endsWith('_question') || key.endsWith('_answer'))) {
      group.removeControl(key);
    }
  });

  // Ajouter les nouveaux
  for (let i = 1; i <= numSteps; i++) {
    group.addControl(`step${i}_question`, new FormControl('', Validators.required));
    group.addControl(`step${i}_answer`, new FormControl('', Validators.required));
  }
  console.log(`Step controls updated for ${numSteps} steps:`, group.controls);
}

  // Construit dynamiquement les champs de configuration d’un mini-jeu
  private buildMiniGameControls(gameId: string) {
    const game = this.allMiniGames.find(g => g.id === gameId)!;
    const fields = game.configTemplate || {};
    return Object.entries(fields).reduce((acc, [k, v]) => {
      acc[k] = new FormControl(v, Validators.required); // chaque config devient un champ requis
      return acc;
    }, {} as { [key: string]: FormControl });
  }
  // Récupère dynamiquement les clés de configuration pour un mini-jeu donné
  getControlKeys(gameId: string): string[] {
    const group = this.testForm.get(['miniGameConfigs', gameId]);
    if (group && group instanceof FormGroup) {
      return Object.keys(group.controls);
    }
    return [];
  }
  //////////adeed 

  // Charge les élèves pour un grade spécifique
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
  // Gère l’ajout/retrait d’un élève sélectionné
  onStudentToggle(id: string, checked: boolean) {
    const arr = this.testForm.get('selectedStudents') as FormArray;
    if (checked) {
      arr.push(new FormControl(id));
    } else {
      const idx = arr.controls.findIndex(c => c.value === id);
      if (idx > -1) arr.removeAt(idx);
    }
  }
  // Soumission finale du test
 submitTest() {
  if (this.testForm.invalid){
    alert("The test form is invalid. All fields are required.");
    return
  } 

  const v = this.testForm.value;
  const testId = `test_${Date.now()}`;

  // 1) Clone profond pour ne pas muter le FormGroup
  const finalConfigs = JSON.parse(JSON.stringify(v.miniGameConfigs));

  // 2) Si multi_step_problem sélectionné, regrouper les steps
  if (finalConfigs.multi_step_problem) {
    const config = finalConfigs.multi_step_problem as any;
    const steps: Record<number, { question: string; answer: any }> = {};
    let i = 1;
    while (config[`step${i}_question`] !== undefined && config[`step${i}_answer`] !== undefined) {
      steps[i - 1] = {
        question: config[`step${i}_question`],
        answer: config[`step${i}_answer`]
      };
      delete config[`step${i}_question`];
      delete config[`step${i}_answer`];
      i++;
    }
    console.log('Steps:', steps);
    config.steps = steps;
  }

   // --- NEW: if quick variant is used, rename it to the real key ---
  if (finalConfigs.quick_multi_step_problem) {
    finalConfigs.multi_step_problem = finalConfigs.quick_multi_step_problem;
    delete finalConfigs.quick_multi_step_problem;
  }

  // Also normalize the miniGameOrder array:
  const normalizedOrder = v.selectedMiniGames.map((id: string) =>  id === 'quick_multi_step_problem' ? 'multi_step_problem' : id );

  // 3) Construire l’objet à envoyer
  const testObject: any = {
    testName:        v.title,
    teacherId:       this.teacherUID,
    grade:           v.classroomId,
    testDuration:    v.testDuration,
    isDraft:         v.isDraft,
    isSpecial:       v.isSpecial,
    miniGameOrder:   normalizedOrder,
    miniGameConfigs: finalConfigs,   
    createdAt:       Date.now()
  };

  if (v.isSpecial) {
    testObject.concernedStudents = v.selectedStudents;
  }
  // 4) Envoi à Firebase
  set(ref(this.db, `tests/${testId}`), testObject)
    .then(() => alert('Test saved successfully!'))
    .catch(err => console.error('Save failed', err));
} 
  getStepIndexes(gameId: string): number[] {
  const config = this.testForm.get('miniGameConfigs')?.get(gameId);
  if (!config) return [];

  const numQuestions = config.get('num_questions')?.value || 0;
  return Array.from({ length: numQuestions }, (_, i) => i);
}

get multiStepSelected(): boolean {  return this.selectedMiniGameIds.includes('multi_step_problem'); }
get quickMultiStepSelected(): boolean {  return this.selectedMiniGameIds.includes('quick_multi_step_problem'); }

prevQuickTemplate() {
  if (!this.quickTemplateKeys.length) return;
  this.currentQuickIndex =
    this.currentQuickIndex > 0
      ? this.currentQuickIndex - 1
      : this.quickTemplateKeys.length - 1;
  this.loadQuickTemplate();
}

nextQuickTemplate() {
  if (!this.quickTemplateKeys.length) return;
  this.currentQuickIndex =
    (this.currentQuickIndex + 1) % this.quickTemplateKeys.length;
  this.loadQuickTemplate();
}
private loadQuickTemplate() {
  const key = this.quickTemplateKeys[this.currentQuickIndex];
  const tpl = this.gameDefs['quick_multi_step_problem'].defaultConfig.gradeConfig[key];
  // Clear the current quick form group, then
  const group = this.testForm.get(['miniGameConfigs','quick_multi_step_problem']) as FormGroup;
  // 1) Patch top-level fields:
  ['prompt_text','num_questions','min_number','max_number','min_required_answers'].forEach(f => {
    if (tpl[f] !== undefined) group.get(f)?.setValue(tpl[f]);
  });
  // 2) Rebuild the FormArray of steps:
  this.buildStepsFromTemplate(group, tpl);
}

readonly labelMap: Record<string, string> = {
  max_number: 'Maximum number',
  min_number: 'Minimum number',
  with_borrowing: 'Allow borrowing',
  num_questions: 'Number of questions',
  min_required_answers: 'Minimum required answers',
  prompt_text: 'Prompt text'
};

getLabel(key: string): string {
  // Direct match from the labelMap
  if (this.labelMap[key]) return this.labelMap[key];

  // Handle dynamic keys like step1_question, step2_answer
  const stepMatch = key.match(/^step(\d+)_(question|answer)$/);
  if (stepMatch) {
    const stepNum = stepMatch[1];
    const type = stepMatch[2] === 'question' ? 'Question' : 'Answer';
    return `${type} ${stepNum}`;
  }

  // Default fallback: convert snake_case to Title Case
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

}

