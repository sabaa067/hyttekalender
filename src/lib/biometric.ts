// Lightweight biometric lock using WebAuthn platform authenticator.
// This is a *convenience* lock for a private family app — there is no server
// verification. Once enabled, the credential id is stored locally and the
// user must complete the platform biometric prompt (Face ID, Touch ID,
// fingerprint, Windows Hello, Android screen lock) to unlock the app.

const CRED_KEY = "hk_biometric_cred";
const ENABLED_KEY = "hk_biometric_enabled";
const UNLOCKED_KEY = "hk_biometric_unlocked"; // session-only flag

function b64urlEncode(bytes: ArrayBuffer): string {
  const arr = new Uint8Array(bytes);
  let s = "";
  for (let i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(str: string): ArrayBuffer {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  const b64 = (str + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

export function isBiometricSupported(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(
    window.PublicKeyCredential &&
      window.navigator.credentials &&
      typeof window.navigator.credentials.create === "function",
  );
}

export function isBiometricEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return (
    localStorage.getItem(ENABLED_KEY) === "1" &&
    !!localStorage.getItem(CRED_KEY)
  );
}

/** Whether the user already passed biometric in this session. */
export function isUnlockedThisSession(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return sessionStorage.getItem(UNLOCKED_KEY) === "1";
  } catch {
    return true;
  }
}

export function markUnlocked() {
  try {
    sessionStorage.setItem(UNLOCKED_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function clearUnlocked() {
  try {
    sessionStorage.removeItem(UNLOCKED_KEY);
  } catch {
    /* ignore */
  }
}

export async function enableBiometric(user: {
  id: string;
  name: string;
}): Promise<void> {
  if (!isBiometricSupported()) {
    throw new Error("Enheten støtter ikke biometrisk innlogging.");
  }
  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);
  const userId = new TextEncoder().encode(user.id);

  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: "Hyttekalender", id: window.location.hostname },
      user: { id: userId, name: user.name, displayName: user.name },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "preferred",
      },
      timeout: 60000,
      attestation: "none",
    },
  })) as PublicKeyCredential | null;

  if (!cred) throw new Error("Avbrutt.");

  localStorage.setItem(CRED_KEY, b64urlEncode(cred.rawId));
  localStorage.setItem(ENABLED_KEY, "1");
  markUnlocked();
}

export function disableBiometric() {
  localStorage.removeItem(CRED_KEY);
  localStorage.removeItem(ENABLED_KEY);
  clearUnlocked();
}

export async function verifyBiometric(): Promise<void> {
  const credIdB64 = localStorage.getItem(CRED_KEY);
  if (!credIdB64) throw new Error("Ingen biometrisk profil registrert.");
  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);

  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge,
      allowCredentials: [
        {
          id: b64urlDecode(credIdB64),
          type: "public-key",
          transports: ["internal"],
        },
      ],
      userVerification: "required",
      rpId: window.location.hostname,
      timeout: 60000,
    },
  });

  if (!assertion) throw new Error("Avbrutt.");
  markUnlocked();
}