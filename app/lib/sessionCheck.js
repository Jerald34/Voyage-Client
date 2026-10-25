/**
 * Hides `/` and `/login` before first paint for someone who looks signed in (a
 * stored `voyage-user`), so the landing page or sign-in form doesn't flash while
 * /auth/me decides where they go. The inline script in layout.jsx sets the
 * attribute; the pages call endSessionCheck() once they know what to show.
 * Visitors with no stored user are never hidden and never call /auth/me.
 */
export const STORED_USER_KEY = "voyage-user";
export const SESSION_CHECK_ATTR = "data-session-check";

// Safety net: never leave the page hidden if the app fails to load or settle.
const SESSION_CHECK_MAX_MS = 5000;

export const SESSION_CHECK_SCRIPT = `(function(){try{var p=location.pathname;if(!localStorage.getItem('${STORED_USER_KEY}'))return;if(p!=='/'&&!(p==='/login'&&!/[?&](step|invite)=/.test(location.search)))return;var d=document.documentElement;d.setAttribute('${SESSION_CHECK_ATTR}','');setTimeout(function(){d.removeAttribute('${SESSION_CHECK_ATTR}')},${SESSION_CHECK_MAX_MS})}catch(e){}})()`;

export function hasStoredUser() {
  try {
    return Boolean(window.localStorage.getItem(STORED_USER_KEY));
  } catch {
    return false;
  }
}

export function endSessionCheck() {
  if (typeof document !== "undefined") document.documentElement.removeAttribute(SESSION_CHECK_ATTR);
}
