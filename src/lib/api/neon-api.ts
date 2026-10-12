import type { ExamApi } from './exam-api';
export function createNeonApi(): ExamApi {
 const allowed = new Set(["login", "logout", "getSession", "getAvailableExams", "startExam", "resumeAttempt", "getQuestionsBatch", "saveAnswers", "submitExam", "getResult", "getMyResults", "getDashboardStats", "listExams", "saveExam", "deleteExam", "duplicateExam", "getExamQuestionIds", "saveExamQuestions", "listQuestionPackages", "applyQuestionPackage", "listQuestions", "validateQuestion", "listValidators", "listAssignments", "saveAssignments", "saveQuestion", "deleteQuestion", "importQuestionsCsv", "uploadQuestionImage", "listStudents", "saveStudent", "deleteStudent", "importStudents", "listUsers", "saveUser", "deleteUser", "listTeachers", "saveTeacher", "deleteTeacher", "getMonitoring", "setAttemptPaused", "warnAttempt", "resetAttempt", "getAttemptControl", "reportFocusViolation", "getAdminResults"]);
 return new Proxy({} as ExamApi, {get(_target,method:string){
  if(!allowed.has(method)) return undefined;
  return async (...args:unknown[])=>{
   const response=await fetch('/api/exam',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:method,args}),cache:'no-store'});
   const body=await response.json();
   if(!body.ok) throw new Error(body.error||'Permintaan gagal.');
   return body.data;
  };
 }});
}
