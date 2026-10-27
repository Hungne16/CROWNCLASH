// Synthetic fixtures used only by unit tests; never loaded into the website.
import type { Question } from "./game";
export const testQuestions: Question[] = [
  {
    id: "demo-1",
    round: 1,
    difficulty: "easy",
    hint: "Test hint 1",
    text: "Test question 1",
    answer: "Test answer 1",
  },
  {
    id: "demo-2",
    round: 1,
    difficulty: "medium",
    hint: "Test hint 2",
    text: "Test question 2",
    answer: "Test answer 2",
  },
  {
    id: "demo-3",
    round: 1,
    difficulty: "hard",
    hint: "Test hint 3",
    text: "Test question 3",
    answer: "Test answer 3",
  },
  {
    id: "demo-4",
    round: 2,
    difficulty: "easy",
    hint: "Test hint 4",
    text: "Test question 4",
    answer: "Test answer 4",
  },
  {
    id: "demo-5",
    round: 3,
    difficulty: "easy",
    hint: "Test hint 5",
    text: "Test question 5",
    answer: "Test answer 5",
  },
];
