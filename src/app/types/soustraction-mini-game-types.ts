export type Operation = 'Subtraction';

export interface FindCompositionsConfig {
    minNumCompositions: number;
    maxNumberRange: number;
    operation: Operation;
    requiredCorrectAnswersMinimumPercent: number;
}

export interface VerticalOperationsConfig {
    numOperations: number;
    maxNumberRange: number;
    operationsAllowed: Operation[];
    requiredCorrectAnswersMinimumPercent: number;
}

export interface MultiStepProblemConfig {
    numQuestions: number;
    maxNumberRange: number;
    numSteps: number;
    operationsAllowed: Operation[];
    requiredCorrectAnswersMinimumPercent: number;
}
