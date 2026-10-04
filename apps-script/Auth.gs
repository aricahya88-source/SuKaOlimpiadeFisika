function login_(payload) {
  const username = String(payload.username || '').trim();
  const password = String(payload.password || '');
  if (!username || !password) throw apiError_('Username dan password wajib diisi.', 'BAD_REQUEST');
  const user = rows_('USERS').find(row => String(row.username).toLowerCase() === username.toLowerCase());
  if (!user || user.status !== 'ACTIVE') throw apiError_('Username atau password salah.', 'INVALID_CREDENTIALS');
  const computed = hashPassword_(password, String(user.passwordSalt));
  if (computed !== String(user.passwordHash)) throw apiError_('Username atau password salah.', 'INVALID_CREDENTIALS');
  const token = 'SES-' + Utilities.getUuid().replace(/-/g,'') + Utilities.getUuid().replace(/-/g,'').slice(0,12);
  const expiresAt = new Date(Date.now() + SM.SESSION_HOURS * 3600 * 1000).toISOString();
  appendObject_('SESSIONS',{token,userId:user.userId,role:user.role,expiresAt,createdAt:nowIso_()});
  try { CacheService.getScriptCache().put('session:' + token.slice(0,80), JSON.stringify({session:{token,userId:user.userId,role:user.role,expiresAt,createdAt:nowIso_()},user:user}), 60); } catch (_) {}
  audit_(user.userId,'LOGIN',user.userId,{});
  return { token, user: sanitizeUser_(user), expiresAt };
}
function logout_(payload) {
  if (payload.token) { deleteRowByKey_('SESSIONS','token',payload.token); try { CacheService.getScriptCache().remove('session:' + String(payload.token).slice(0,80)); } catch (_) {} }
  return null;
}
function getSession_(payload) {
  const ctx = requireSession_(payload.token);
  return { token: payload.token, user: sanitizeUser_(ctx.user), expiresAt: ctx.session.expiresAt };
}
