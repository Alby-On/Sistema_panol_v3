// supabase.js — cliente único de Supabase, compartido por todas las páginas.
// Cargar después del SDK:  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
// Se guarda antes de crear el cliente, porque el cliente lee y borra esos datos de la dirección.
const ENLACE_CORREO = datosEnlaceCorreo();
const supabaseClient = supabase.createClient(
    "https://jwcgiuhdugjunndfpdjr.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3Y2dpdWhkdWdqdW5uZGZwZGpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NTA2NTQsImV4cCI6MjA3ODUyNjY1NH0.llknOTpK1hFMDOjdyDUKUFuiyr0NwwJzNv6YdJbBsRY"
);

// Convierte una fecha que viene de Supabase en un objeto Date correcto.
// Las fechas se guardan en hora UTC. Si la columna no guarda zona horaria,
// Supabase las devuelve sin la "Z" final ("2026-10-26T16:05:00") y el navegador
// las leería como hora de Chile, quedando 3 horas corridas. Aquí se leen siempre como UTC.
function fechaSupabase(valor) {
    if (!valor) return null;
    if (valor instanceof Date) return valor;
    let texto = String(valor).trim().replace(' ', 'T');
    if (!/T\d{2}:\d{2}/.test(texto)) return new Date(texto);   // solo fecha, sin hora
    // "+00" o "+0000" -> "+00:00", que es el formato que entienden todos los navegadores
    texto = texto.replace(/([+-]\d{2})(\d{2})?$/, (m, h, mm) => `${h}:${mm || '00'}`);
    const tieneZona = /([zZ]|[+-]\d{2}:\d{2})$/.test(texto);
    return new Date(tieneZona ? texto : texto + 'Z');
}

// Traduce al español los errores de inicio de sesión, registro y correos de Supabase.
function traducirErrorAuth(error) {
    if (!error) return "";
    const m = String(error.message || error.msg || error);
    const espera = m.match(/after (\d+) seconds?/i);
    if (espera) return `Por seguridad debes esperar ${espera[1]} segundos antes de pedir otro correo.`;
    if (esLimiteDeCorreos(error))
        return "No pudimos enviar el correo en este momento. Vuelve a intentarlo en unos minutos (en algunos casos puede tardar hasta una hora).";
    if (error.status === 429 || /rate limit|too many/i.test(m))
        return "Demasiados intentos seguidos. Espera unos minutos e inténtalo de nuevo.";
    if (/email not confirmed/i.test(m)) return "Debes confirmar tu correo antes de entrar.";
    if (/invalid login credentials/i.test(m)) return "Correo, RUT o contraseña incorrectos.";
    if (/already registered|already been registered|already exists/i.test(m)) return "El correo ya está registrado.";
    if (/should be different|same as the old/i.test(m)) return "La nueva contraseña debe ser distinta a la anterior.";
    if (/password should be at least|weak password/i.test(m)) return "La contraseña es muy corta o muy simple. Usa al menos 6 caracteres.";
    if (/session (missing|not found)|auth session/i.test(m)) return "El enlace ya no es válido. Pide uno nuevo.";
    if (/signups not allowed|user not found/i.test(m)) return "No encontramos una cuenta con ese correo.";
    if (/invalid email|unable to validate email/i.test(m)) return "El correo no es válido.";
    if (/failed to fetch|network/i.test(m)) return "No hay conexión. Revisa tu internet e inténtalo de nuevo.";
    return "Ocurrió un error. Inténtalo de nuevo en unos minutos.";
}

// Lee los datos que Supabase agrega a la dirección al volver desde un correo
// (#access_token=... o #error_code=otp_expired...). Debe llamarse al cargar la página.
function datosEnlaceCorreo() {
    const h = new URLSearchParams(window.location.hash.slice(1));
    const q = new URLSearchParams(window.location.search);
    const leer = k => h.get(k) || q.get(k);
    return {
        token_hash: q.get("token_hash"),   // enlaces nuevos: se confirman al tocar un botón
        access_token: h.get("access_token"),
        refresh_token: h.get("refresh_token"),
        type: leer("type"),
        error: leer("error_code") || leer("error"),
        error_description: leer("error_description"),
        hash: window.location.hash,
        search: window.location.search
    };
}

// true cuando Supabase no envió el correo por el límite de correos por hora
function esLimiteDeCorreos(error) {
    return !!error && (error.code === "over_email_send_rate_limit" || /email rate limit/i.test(String(error.message || "")));
}

// Segundos que debe quedar bloqueado el botón de "enviar correo" después de un error
function segundosDeEspera(error) {
    const espera = String((error && error.message) || "").match(/after (\d+) seconds?/i);
    if (espera) return Number(espera[1]);   // espera real que indica Supabase
    if (esLimiteDeCorreos(error)) return 300;   // límite por hora: 5 minutos
    return 10;
}

// Busca la cuenta de un RUT (con o sin puntos), también las que aún no confirman el correo.
// Devuelve { email, activa } o null si el RUT no tiene cuenta.
async function buscarCuentaPorRut(rut) {
    const { data, error } = await supabaseClient.rpc("buscar_cuenta_por_rut", { rut_input: String(rut || "").trim() });
    if (!error) return (data && data[0]) ? { email: data[0].email, activa: data[0].activa } : null;
    // Respaldo: búsqueda anterior (solo cuentas con perfil)
    const correo = await buscarCorreoPorRutAntiguo(rut);
    return correo ? { email: correo, activa: true } : null;
}
async function buscarCorreoPorRutAntiguo(rut) {
    let n = String(rut || "").replace(/[.\s]/g, "").toLowerCase();
    if (n && !n.includes("-") && n.length > 1) n = n.slice(0, -1) + "-" + n.slice(-1);
    for (const v of [...new Set([n, n.replace(/k$/, "K")])]) {
        const { data, error } = await supabaseClient.rpc("buscar_email_por_rut", { rut_input: v });
        if (!error && data) return data;
    }
    return null;
}
