import { Component, inject, OnInit } from '@angular/core';
import { Database, onValue, ref, set } from '@angular/fire/database';
import { AuthService } from '../../services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import { TitleCasePipe } from '@angular/common';

@Component({
  selector: 'app-edit-test',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule, 
    NgIf,
    NgFor,
    TitleCasePipe,
  ],
  templateUrl: './edit-test.component.html',
  styleUrls: ['./edit-test.component.css']
})
export class EditTestComponent implements OnInit {

  private db        = inject(Database);
  private auth      = inject(AuthService);
  private route     = inject(ActivatedRoute);
  private fb        = inject(FormBuilder);
  private router = inject(Router);

  testId: string | null = null;
  test!: any;
  form!: FormGroup;
  objectKeys = Object.keys;
  teacherUID!: string;

  ngOnInit(): void {
    this.testId = this.route.snapshot.paramMap.get('id');

    this.auth.getCurrentUserWithRole().subscribe(user => {
      if (!user) return;
      this.teacherUID = user.uid;

      const testRef = ref(this.db, `tests/${this.testId}`);
      onValue(testRef, snapshot => {
        this.test = snapshot.val();
        console.log('Loaded test:', this.test); 
        this.buildForm();
      });
    });
  }

  
  private buildForm() {
  const configsGroup = this.fb.group(
    (Object.entries(this.test.miniGameConfigs) as [string, any][])
      .reduce((acc, [key, val]) => {
        // Créer un FormGroup de base pour tous les mini-jeux
        acc[key] = this.fb.group({
          min_number:           [val.min_number],
          max_number:           [val.max_number],
          min_required_answers: [val.min_required_answers],
          num_questions:        [val.num_questions],
          with_borrowing:       [val.with_borrowing || false],
          prompt_text:          [val.prompt_text || ''],
        });

        // ✅ Ici : Ajouter la logique spécifique pour multi_step_problem
        if (key === 'multi_step_problem' && val.steps) {
          acc[key].addControl(
            'steps',
            this.fb.array(
              val.steps.map((step: any) =>
                this.fb.group({
                  quest: [step.quest],
                  answer: [step.answer],
                })
              )
            )
          );
        }

        return acc;
      }, {} as { [k: string]: FormGroup })
  );

  // Construire le FormGroup principal
  this.form = this.fb.group({
    testName:        [this.test.testName],
    testDuration:    [this.test.testDuration],
    miniGameConfigs: configsGroup,
  });
}

getStepsArray(gameKey: string): FormArray {
  return this.form.get(['miniGameConfigs', gameKey, 'steps']) as FormArray;
}

returnDash() {
  this.router.navigate(['/dashboard']); // mets ici la bonne route de ton app
}


  saveChanges() { 
  //fo db to complete it later  
  if (this.form.invalid || !this.testId) return;

    const updatedTest = this.form.value;
    const testRef = ref(this.db, `tests/${this.testId}`);
    set(testRef, {
      ...this.test,
      ...updatedTest,
      miniGameConfigs: updatedTest.miniGameConfigs,
    }).then(() => {
      console.log('Test updated!');
    }).catch(error => {
      console.error('Error updating test:', error);
  });
   }

}
