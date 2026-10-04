function jsonOutput_(value){return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);}
function parsePayload_(e){if(!e||!e.postData||!e.postData.contents)return{};try{return JSON.parse(e.postData.contents)}catch(_){throw apiError_('Payload JSON tidak valid.','BAD_JSON')}}
function apiError_(message,code){const err=new Error(message);err.code=code||'BAD_REQUEST';return err;}
function nowIso_(){return new Date().toISOString();}
function uid_(prefix){return prefix+'-'+Utilities.getUuid().replace(/-/g,'').slice(0,18).toUpperCase();}
function asBool_(value){return value===true||value==='true'||value===1||value==='1';}
function safeJsonParse_(value,fallback){if(!value)return fallback;try{return JSON.parse(value)}catch(_){return fallback}}
function shuffle_(array){const a=array.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)),t=a[i];a[i]=a[j];a[j]=t;}return a;}
function hex_(bytes){return bytes.map(b=>('0'+((b<0?b+256:b).toString(16))).slice(-2)).join('');}
function getPepper_(){const props=PropertiesService.getScriptProperties();let pepper=props.getProperty('PASSWORD_PEPPER');if(!pepper){pepper=Utilities.getUuid()+Utilities.getUuid();props.setProperty('PASSWORD_PEPPER',pepper);}return pepper;}
function hashPassword_(password,salt){return hex_(Utilities.computeHmacSha256Signature(String(password)+':'+String(salt),getPepper_()));}
function sanitizeUser_(row){return{userId:row.userId,name:row.name,username:row.username,email:row.email||'',phone:row.phone||'',className:row.className||'',subject:row.subject||'',role:row.role,status:row.status};}
function normalizeClassName_(value){return String(value||'').trim().replace(/\s+/g,' ').toUpperCase();}
function requireSession_(token,role){if(!token)throw apiError_('Sesi tidak tersedia.','UNAUTHORIZED');const cache=CacheService.getScriptCache(),cacheKey='session:'+String(token).slice(0,80);let session,user;const cached=cache.get(cacheKey);if(cached){const parsed=safeJsonParse_(cached,null);session=parsed&&parsed.session;user=parsed&&parsed.user;}if(!session||!user){session=findRowByKey_('SESSIONS','token',token);if(session)user=findRowByKey_('USERS','userId',session.userId);if(session&&user)try{cache.put(cacheKey,JSON.stringify({session,user}),60)}catch(_){}}if(!session||new Date(session.expiresAt).getTime()<Date.now())throw apiError_('Sesi berakhir. Silakan login kembali.','UNAUTHORIZED');if(role&&String(session.role)!==String(role))throw apiError_('Anda tidak memiliki izin.','FORBIDDEN');if(!user||user.status!=='ACTIVE')throw apiError_('Akun tidak aktif.','UNAUTHORIZED');return{session,user};}
function requireManager_(token){const ctx=requireSession_(token);if(['super_admin','teacher'].indexOf(String(ctx.user.role))<0)throw apiError_('Anda tidak memiliki izin.','FORBIDDEN');return ctx;}
function requireSuperAdmin_(token){return requireSession_(token,'super_admin');}
function canManageExam_(ctx,exam){return !!exam&&(String(ctx.user.role)==='super_admin'||(String(ctx.user.role)==='teacher'&&String(exam.ownerId)===String(ctx.user.userId)));}
function assertManageExam_(ctx,exam){if(!canManageExam_(ctx,exam))throw apiError_('Ujian tidak berada dalam kewenangan akun ini.','FORBIDDEN');}
function visibleExamsFor_(ctx){const all=rows_('EXAMS');return String(ctx.user.role)==='teacher'?all.filter(e=>String(e.ownerId)===String(ctx.user.userId)):all;}
function audit_(userId,action,targetId,detail){try{appendObject_('AUDIT_LOG',{logId:uid_('LOG'),timestamp:nowIso_(),userId:userId||'',action,targetId:targetId||'',detailJson:JSON.stringify(detail||{})})}catch(_){}}
function drivePublicUrl_(fileId){return fileId?'https://drive.google.com/thumbnail?id='+encodeURIComponent(fileId)+'&sz=w1600':'';}
