const SM = Object.freeze({
  SHEETS: {
    USERS: ['userId','name','email','phone','className','subject','username','passwordHash','passwordSalt','role','status','createdAt','updatedAt'],
    EXAMS: ['examId','ownerId','title','subject','className','descriptionHtml','startTime','endTime','durationMinutes','questionCount','status','randomizeQuestion','randomizeOption','resultVisibility','token','attemptPolicy','instructions','rulesHtml','createdAt','updatedAt'],
    QUESTIONS: ['questionId','examId','authorId','topicCode','blueprintCode','code','stimulusOrder','questionText','questionHtml','explanation','optionA','optionB','optionC','optionD','optionE','interactionDataJson','imageFileId','questionType','scoringMode','maxScore','difficulty','tag','category','packageName','status','createdAt','updatedAt'],
    EXAM_QUESTIONS: ['examId','questionId','orderNo'],
    ANSWER_KEYS: ['questionId','correctAnswer','correctAnswers','score','maxScore'],
    ATTEMPTS: ['attemptId','examId','studentId','startedAt','expiresAt','lastSyncAt','revision','status','submittedAt','questionOrderJson','optionOrderJson','answersJson','focusViolationCount','pauseStartedAt','lastWarning','lastWarningAt'],
    SUBMISSIONS: ['submissionId','attemptId','studentId','examId','answersJson','score','correctCount','wrongCount','blankCount','submittedAt','status'],
    SESSIONS: ['token','userId','role','expiresAt','createdAt'],
    AUDIT_LOG: ['logId','timestamp','userId','action','targetId','detailJson']
  },
  SESSION_HOURS: 12,
  BATCH_SIZE: 10,
  CACHE_SECONDS: 120,
});
